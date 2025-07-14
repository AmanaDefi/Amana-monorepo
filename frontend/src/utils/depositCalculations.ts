import { VaultData, Token } from "../types/types";
import { Chain, parseAbiItem, Address, parseUnits } from "viem";
import { getPathDataAndAmountOut } from "../actions/actions";
import { ZRC20_TOKENS_BY_ADDRESS } from "../constants/ZRC20TokensByAddress";
import { isZetachain } from "./utils";
import { getPublicClient } from "./getPublicClient";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { getSharesFromDeposit, getAssetsFromShares } from "../actions/actions";
import { ConnectedWallet } from "@privy-io/react-auth";

export interface DepositCalculationResult {
  // Input and output amounts
  inputAmount: bigint;
  outputAmount: bigint;
  sharesAmount: string; // Changed from bigint to string since getSharesFromDeposit returns string
  
  // Fee breakdown
  gasFee: {
    amount: bigint;
    amountInUSD: string;
    amountInETH: string;
    needsDeduction: boolean;
  };
  
  // Slippage breakdown
  swapSlippage: {
    amount: bigint;
    amountInUSD: string;
    percentage: number;
  };
  
  depositSlippage: {
    amount: bigint;
    amountInUSD: string;
    percentage: number;
  };
  
  // Total loss
  totalLoss: {
    amount: bigint;
    amountInUSD: string;
    percentage: number;
  };
  
  // Conversion details
  amountAfterFee: bigint;
  amountForStrategy: bigint;
  needsTokenSwap: boolean;
  needsGasFee: boolean;
}

export interface GasFeeCalculationResult {
  gasFeeInVaultAsset: bigint;
  gasFeeInUSD: string;
  gasFeeInETH: string;
  gasDetails: {
    gasZRC20: string;
    gasFee: bigint;
    gasLimit: bigint;
  };
  needsDeduction: boolean;
}

/**
 * Calculates gas fees for vault deposits, handling token conversions if needed
 * Only calculates when actually needed (conditional execution)
 */
export const calculateGasFeeIfNeeded = async (
  vaultData: VaultData,
  inputToken: Token,
  activeChain: Chain,
  vaultTokenPrice: number,
  ethPriceUsd: number,
  formatCurrency: (amount: number) => string,
  convertUsdToEth: (usd: number, ethPrice: number) => number
): Promise<GasFeeCalculationResult> => {
  // If gas fees are paid from gas tank, no deduction needed
  if (vaultData.depositFeePaidFromGasTank) {
    return {
      gasFeeInVaultAsset: BigInt(0),
      gasFeeInUSD: "0",
      gasFeeInETH: "0",
      gasDetails: {
        gasZRC20: "",
        gasFee: BigInt(0),
        gasLimit: BigInt(0),
      },
      needsDeduction: false,
    };
  }

  // Get public client for the appropriate chain
  const chainToUse = isZetachain(activeChain?.id) ? activeChain : SUPPORTED_CHAINS[0];
  const publicClient = getPublicClient(chainToUse.id);
  
  if (!publicClient) {
    throw new Error(`Failed to get public client for chain ${chainToUse.id}`);
  }

  // Get gas limit from vault contract
  const gasLimitForWithdrawAndCall = await publicClient.readContract({
    address: vaultData.id as `0x${string}`,
    abi: [parseAbiItem("function gasLimitForWithdrawAndCall() view returns (uint256)")],
    functionName: "gasLimitForWithdrawAndCall",
  });

  // Get gas fee from vault input token contract
  const result = await publicClient.readContract({
    address: vaultData.inputToken.address as `0x${string}`,
    abi: [parseAbiItem("function withdrawGasFeeWithGasLimit(uint256) view returns (address,uint256)")],
    functionName: "withdrawGasFeeWithGasLimit",
    args: [gasLimitForWithdrawAndCall],
  });

  const gasZRC20 = result[0] as string;
  const gasFee = result[1] as bigint;

  let gasFeeInVaultAsset = gasFee;

  // Convert gas fee to vault asset if tokens differ
  if (gasZRC20 !== vaultData.inputToken.address) {
    const { amountOut } = await getPathDataAndAmountOut(
      gasFee,
      ZRC20_TOKENS_BY_ADDRESS[gasZRC20] || {
        address: gasZRC20,
        symbol: 'GAS',
        decimals: 18,
        imgURL: '',
        price: 0,
        balance: { value: 0n, formatted: '0' },
        isNative: false
      } as Token,
      vaultData.inputToken,
      vaultData.id,
      500
    );
    gasFeeInVaultAsset = amountOut;
  }

  // Format gas fee in USD and ETH
  const gasFeeInTokenUnits = Number(gasFeeInVaultAsset) / 10 ** vaultData.inputToken.decimals;
  const gasFeeInUSDAmount = gasFeeInTokenUnits * vaultTokenPrice;
  const gasFeeInUSD = formatCurrency(gasFeeInUSDAmount);
  const ethAmount = convertUsdToEth(gasFeeInUSDAmount, ethPriceUsd);
  const gasFeeInETH = ethAmount.toFixed(5);

  return {
    gasFeeInVaultAsset,
    gasFeeInUSD,
    gasFeeInETH,
    gasDetails: {
      gasZRC20,
      gasFee,
      gasLimit: gasLimitForWithdrawAndCall,
    },
    needsDeduction: true,
  };
};

/**
 * For cross-chain deposits, converts gas fee back to input token terms if needed
 */
export const convertGasFeeToInputToken = async (
  gasFeeInVaultAsset: bigint,
  vaultData: VaultData,
  inputToken: Token,
  activeChain: Chain
): Promise<bigint> => {
  // Get the ZRC20 equivalent for cross-chain
  const inputTokenZeta = isZetachain(activeChain?.id) ? inputToken : inputToken?.ZRC20equivalent;

  if (!inputTokenZeta) {
    return gasFeeInVaultAsset;
  }

  // If input token differs from vault token, convert gas fee back to input token terms
  if (inputTokenZeta.address.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    const { amountOut } = await getPathDataAndAmountOut(
      gasFeeInVaultAsset,
      vaultData.inputToken,
      inputTokenZeta,
      vaultData.id,
      500
    );

    return amountOut;
  }

  return gasFeeInVaultAsset;
};

/**
 * Unified deposit calculation that handles all deposit types (Type 2 and Type 4, with and without fees)
 * This function calculates everything once and can be used for both display and execution
 */
export const calculateDepositOutput = async (
  inputAmount: bigint,
  vaultData: VaultData,
  inputToken: Token,
  activeChain: Chain,
  activeWallet: ConnectedWallet,
  vaultTokenPrice: number,
  inputTokenPrice: number,
  ethPriceUsd: number,
  formatCurrency: (amount: number) => string,
  convertUsdToEth: (usd: number, ethPrice: number) => number
): Promise<DepositCalculationResult> => {
  const actualInputToken = isZetachain(activeChain?.id) ? inputToken : inputToken?.ZRC20equivalent;
  
  if (!actualInputToken) {
    throw new Error("Input token not found on Zetachain");
  }

  // Step 1: Calculate gas fee (conditional)
  const gasFeeResult = await calculateGasFeeIfNeeded(
    vaultData,
    inputToken,
    activeChain,
    vaultTokenPrice,
    ethPriceUsd,
    formatCurrency,
    convertUsdToEth
  );

  const amountAfterFee = gasFeeResult.needsDeduction 
    ? (inputAmount > gasFeeResult.gasFeeInVaultAsset ? inputAmount - gasFeeResult.gasFeeInVaultAsset : 0n)
    : inputAmount;

  // Step 2: Handle token conversion (conditional)
  let amountForStrategy = amountAfterFee;
  let swapSlippage = 0n;
  let needsTokenSwap = false;

  if (actualInputToken.address.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    needsTokenSwap = true;
    
    // Get the swap result
    const swapResult = await getPathDataAndAmountOut(
      amountAfterFee,
      actualInputToken,
      vaultData.inputToken,
      vaultData.id as Address,
      500 // Use a reasonable slippage for calculation
    );
    
    amountForStrategy = swapResult.amountOut;
    
    // Calculate swap slippage: what we should get vs what we actually get
    // For this, we need to get the equivalent input amount in vault asset terms
    const publicClient = getPublicClient(SUPPORTED_CHAINS[0].id);
    if (publicClient) {
      try {
        const equivalentAmount = await publicClient.readContract({
          address: vaultData.id as Address,
          abi: [parseAbiItem("function getEquivalentInputAmount(address,address,uint256) view returns (uint256)")],
          functionName: "getEquivalentInputAmount",
          args: [vaultData.inputToken.address as Address, actualInputToken.address as Address, amountAfterFee],
        });
        
        swapSlippage = equivalentAmount > swapResult.amountOut ? equivalentAmount - swapResult.amountOut : 0n;
      } catch (error) {
        // If the function doesn't exist or fails, use a simple calculation
        swapSlippage = amountAfterFee > swapResult.amountOut ? amountAfterFee - swapResult.amountOut : 0n;
      }
    }
  }

  // Step 3: Calculate shares and final amount (always needed)
  const sharesAmount = await getSharesFromDeposit(amountForStrategy, vaultData, activeWallet);
  // Convert shares string to bigint for getAssetsFromShares
  const sharesAmountBigInt = parseUnits(sharesAmount, vaultData.inputToken.decimals);
  const outputAmount = await getAssetsFromShares(sharesAmountBigInt, vaultData, activeChain.id, activeWallet);

  // Step 4: Calculate deposit slippage (what goes to strategy vs what we get back)
  const depositSlippage = amountForStrategy > outputAmount ? amountForStrategy - outputAmount : 0n;

  // Step 5: Calculate total loss and format everything
  const inputAmountInUSD = (Number(inputAmount) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice;
  const gasFeeInUSD = parseFloat(gasFeeResult.gasFeeInUSD.replace(/[^0-9.]/g, "") || "0");
  const swapSlippageInUSD = (Number(swapSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const depositSlippageInUSD = (Number(depositSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const outputAmountInUSD = (Number(outputAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;

  const totalLossInUSD = inputAmountInUSD - outputAmountInUSD;
  const totalLossPercentage = inputAmountInUSD > 0 ? (totalLossInUSD / inputAmountInUSD) * 100 : 0;

  return {
    inputAmount,
    outputAmount,
    sharesAmount,
    
    gasFee: {
      amount: gasFeeResult.gasFeeInVaultAsset,
      amountInUSD: gasFeeResult.gasFeeInUSD,
      amountInETH: gasFeeResult.gasFeeInETH,
      needsDeduction: gasFeeResult.needsDeduction,
    },
    
    swapSlippage: {
      amount: swapSlippage,
      amountInUSD: formatCurrency(swapSlippageInUSD),
      percentage: inputAmountInUSD > 0 ? (swapSlippageInUSD / inputAmountInUSD) * 100 : 0,
    },
    
    depositSlippage: {
      amount: depositSlippage,
      amountInUSD: formatCurrency(depositSlippageInUSD),
      percentage: inputAmountInUSD > 0 ? (depositSlippageInUSD / inputAmountInUSD) * 100 : 0,
    },
    
    totalLoss: {
      amount: inputAmount - outputAmount,
      amountInUSD: formatCurrency(totalLossInUSD),
      percentage: totalLossPercentage,
    },
    
    amountAfterFee,
    amountForStrategy,
    needsTokenSwap,
    needsGasFee: gasFeeResult.needsDeduction,
  };
}; 