import { VaultData, Token } from "../types/types";
import { Chain, parseAbiItem, Address, parseUnits, formatUnits } from "viem";
import { getPathDataAndAmountOut } from "../actions/actions";
import { ZRC20_TOKENS_BY_ADDRESS } from "../constants/ZRC20TokensByAddress";
import { isZetachain } from "./utils";
import { getPublicClient } from "./getPublicClient";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { ConnectedWallet } from "@privy-io/react-auth";
import { log } from "console";
import { gas } from "codemelt-retro-api-sdk/functional/api/swap/native";

const SWAP_HELPER_ADDRESS = process.env
  .NEXT_PUBLIC_SWAPHELPER_ADDRESS as `0x${string}`;

export interface DepositCalculationResult {
  // Input and output amounts
  inputAmount: bigint;
  outputAmount: bigint;
  sharesAmount: string; // Changed from bigint to string since getSharesFromVaultDeposit returns string

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

  // Total slippage (swap + deposit, excluding gas fee)
  totalSlippage: {
    amount: bigint;
    amountInUSD: string;
    percentage: number;
  };

  // Total loss (includes gas fee + slippage)
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
  gasFeeInInputToken: bigint;
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
 * Gets shares from deposit using strategy contract methods
 * C = call convertToShares(A) on strategy
 */
export const getSharesFromStrategyDeposit = async (
  amount: bigint,
  vaultData: VaultData,
  activeWallet: ConnectedWallet,
) => {
  const convertToSharesAbi = [
    {
      inputs: [{ name: "assets", type: "uint256" }],
      name: "convertToShares",
      outputs: [{ name: "shares", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const publicClient = getPublicClient(vaultData.protocol.chainId);

  if (!publicClient) {
    const errorMsg = `can't get publicClient for chain with id: ${vaultData.protocol.chainId}`;
    throw new Error(errorMsg);
  }

  try {
    const sharesAsBigInt = await publicClient.readContract({
      address: vaultData.protocol.strategyAddress as Address,
      abi: convertToSharesAbi,
      functionName: "convertToShares",
      args: [amount],
    });

    const formattedShares = formatUnits(
      sharesAsBigInt,
      vaultData.inputToken.decimals,
    );

    return formattedShares;
  } catch (e) {
    console.error("Error in getSharesFromVaultDeposit:", e);
    return "0";
  }
};

/**
 * Gets assets from shares using strategy contract methods
 * D = call convertToAssets(C) on strategy
 */
export const getAssetsFromShares = async (
  shares: bigint,
  vaultData: VaultData,
  activeWallet: ConnectedWallet,
) => {
  const convertToAssetsAbi = [
    {
      inputs: [{ name: "shares", type: "uint256" }],
      name: "convertToAssets",
      outputs: [{ name: "assets", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const publicClient = getPublicClient(vaultData.protocol.chainId);

  if (!publicClient) {
    const errorMsg = `can't get publicClient for chain with id: ${vaultData.protocol.chainId}`;
    throw new Error(errorMsg);
  }

  try {
    const assetsAsBigInt = await publicClient.readContract({
      address: vaultData.protocol.strategyAddress as Address,
      abi: convertToAssetsAbi,
      functionName: "convertToAssets",
      args: [shares],
    });

    return assetsAsBigInt;
  } catch (e) {
    console.error("Error in getAssetsFromShares:", e);
    return 0n;
  }
};



/**
 * Calculates gas fees for vault deposits, handling token conversions if needed
 * Only calculates when actually needed (conditional execution)
 */
export const calculateGasFeeIfNeeded = async (
  vaultData: VaultData,
  inputToken: Token,
  activeChain: Chain,
  vaultTokenPrice: number,
  inputTokenPrice: number,
  gasTokenPrice: number,
  formatCurrency: (amount: number) => string,
  convertUsdToEth: (usd: number, ethPrice: number) => number
): Promise<GasFeeCalculationResult> => {
  // If gas fees are paid from gas tank, no deduction needed
  if (vaultData.depositFeePaidFromGasTank) {
    return {
      gasFeeInInputToken: BigInt(0),
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

  console.log("GasFee:", gasFee.toString());
  let gasFeeInVaultAsset = gasFee;
  let gasFeeInInputToken = gasFee;

  // Get the actual input token (ZRC20 equivalent for cross-chain)
  const actualInputToken = isZetachain(activeChain?.id) ? inputToken : inputToken?.ZRC20equivalent;
  console.log("inputTokenPrice:", inputTokenPrice);

  // Convert gas fee to vault asset if tokens differ
  if (gasZRC20.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    console.log("Converting gas fee to vault asset terms...");
    const gasTokenDecimals = ZRC20_TOKENS_BY_ADDRESS[gasZRC20]?.decimals ?? 18;
    // const gasTokenSymbol = ZRC20_TOKENS_BY_ADDRESS[gasZRC20]?.symbol ?? "Unknown";
    console.log("Gas token decimals:", gasTokenDecimals);
    gasFeeInVaultAsset = BigInt(Math.floor((Number(gasFee) / 10 ** gasTokenDecimals) * gasTokenPrice * 10 ** vaultData.inputToken.decimals));
  }
  console.log("Gas fee in vault asset:", gasFeeInVaultAsset.toString());
  // inputToken?.decimals ??


  // Convert gas fee to input token terms if needed
  if (actualInputToken && gasZRC20.toLowerCase() !== actualInputToken.address.toLowerCase()) {
    const publicClient = getPublicClient(SUPPORTED_CHAINS[0].id);
    if (publicClient) {
      try {
        gasFeeInInputToken = await publicClient.readContract({
          address: SWAP_HELPER_ADDRESS as Address,
          abi: [parseAbiItem("function getEquivalentInputAmount(address,address,uint256) view returns (uint256)")],
          functionName: "getEquivalentInputAmount",
          args: [
            actualInputToken.address as Address, // inputToken (output token)
            gasZRC20 as Address,                 // input token (gas token)
            gasFee                               // input amount
          ],
        });

      } catch (error) {
        console.error("Error converting gas fee to input token:", error);
        // Fallback to direct conversion if the function fails
        gasFeeInInputToken = gasFee;
      }
    } else {
      console.error("Failed to get public client for gas fee conversion to input token");
      gasFeeInInputToken = gasFee;
    }
  }


  // Format gas fee in USD and ETH
  const gasFeeInTokenUnits = Number(formatUnits(gasFeeInVaultAsset, vaultData.inputToken.decimals));
  const gasFeeInUSDAmount = gasFeeInTokenUnits * vaultTokenPrice;
  const gasFeeInUSD = formatCurrency(gasFeeInUSDAmount);
  const ethAmount = convertUsdToEth(gasFeeInUSDAmount, gasTokenPrice); // TODO - get ETH price from somewhere
  const gasFeeInETH = ethAmount.toFixed(5);

  console.log("Final gas fee calculation:", {
    gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
    gasFeeInTokenUnits,
    gasFeeInUSDAmount,
    gasFeeInUSD,
    gasFeeInETH,
    vaultTokenPrice,
    gasTokenPrice
  });

  return {
    gasFeeInInputToken,
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

// Cache performance tracking
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Get cache performance statistics
 */
export const getCacheStats = () => ({
  hits: cacheHits,
  misses: cacheMisses,
  hitRate: cacheHits + cacheMisses > 0 ? (cacheHits / (cacheHits + cacheMisses)) * 100 : 0
});

/**
 * Reset cache performance statistics
 */
export const resetCacheStats = () => {
  cacheHits = 0;
  cacheMisses = 0;
};

/**
 * Check if cached deposit calculation is still valid
 */
export const isCachedCalculationValid = (
  cached: any,
  inputAmount: bigint,
  vaultId: string,
  inputToken: Token,
  activeChainId: number,
  maxAgeMs: number = 30000 // 30 seconds default
): cached is any => {
  if (!cached) {
    cacheMisses++;
    return false;
  }

  // Check if basic parameters match
  if (cached.inputAmount !== inputAmount.toString() ||
    cached.vaultId !== vaultId) {
    cacheMisses++;
    return false;
  }

  // Check if cache is not too old
  if (Date.now() - cached.timestamp > maxAgeMs) {
    cacheMisses++;
    return false;
  }

  cacheHits++;
  return true;
};

/**
 * Unified deposit calculation that handles all deposit types (Type 2 and Type 4, with and without fees)
 * This function calculates everything once and can be used for both display and execution
 * 
 */
export const calculateDepositOutput = async (
  inputAmount: bigint,
  vaultData: VaultData,
  inputToken: Token,
  activeChain: Chain,
  activeWallet: ConnectedWallet,
  vaultTokenPrice: number,
  inputTokenPrice: number,
  gasTokenPrice: number,
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
    inputTokenPrice,
    gasTokenPrice,
    formatCurrency,
    convertUsdToEth
  );


  // Step 2: Calculate amount available after gas fee deduction
  let amountAfterFee = inputAmount;

  if (gasFeeResult.needsDeduction) {
    // Use gas fee already converted to input token terms
    amountAfterFee = inputAmount > gasFeeResult.gasFeeInInputToken ? inputAmount - gasFeeResult.gasFeeInInputToken : 0n;

  }

  // Step 3: Handle token conversion and calculate swap slippage (conditional)
  let amountForStrategy = amountAfterFee;
  let swapSlippage = 0n;
  let needsTokenSwap = false;

  if (actualInputToken.address.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    needsTokenSwap = true;

    // A = input amount to go to strategy = getPathDataAndAmountOut(inputTokenZRC20, vaultAsset, amountAfterFee)
    const swapResult = await getPathDataAndAmountOut(
      amountAfterFee,
      actualInputToken,
      vaultData.inputToken,
      vaultData.id as Address,
      500
    );

    amountForStrategy = swapResult.amountOut;

    // const inputTokenPrice = useTokenPriceBySymbol(vault.inputToken.symbol);
    const equivalentInputAmount = BigInt(Math.floor((Number(amountAfterFee) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice * 10 ** vaultData.inputToken.decimals));

    swapSlippage = equivalentInputAmount > amountForStrategy ? equivalentInputAmount - amountForStrategy : 0n;
  }

  // Step 4: Calculate shares and final output amount using strategy contract
  // C = call convertToShares(A) on strategy
  // D = call convertToAssets(C) on strategy
  const sharesAmount = await getSharesFromStrategyDeposit(amountForStrategy, vaultData, activeWallet);

  // Convert shares back to assets using strategy contract
  const outputAmount = await getAssetsFromShares(parseUnits(sharesAmount, vaultData.inputToken.decimals), vaultData, activeWallet);

  // Step 5: Calculate deposit slippage
  // Deposit slippage = A - D (amount going to strategy - final output amount)
  const depositSlippage = amountForStrategy > outputAmount ? amountForStrategy - outputAmount : 0n;

  // Step 6: Calculate USD values for formatting
  const inputAmountInUSD = (Number(inputAmount) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice;
  const gasFeeInUSD = parseFloat(gasFeeResult.gasFeeInUSD.replace(/[^0-9.]/g, "") || "0");
  const swapSlippageInUSD = (Number(swapSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const depositSlippageInUSD = (Number(depositSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const outputAmountInUSD = (Number(outputAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;

  // Debug logging
  console.log("=== DEPOSIT CALCULATION DEBUG ===");
  console.log("Input Token:", inputToken.symbol, "Decimals:", inputToken.decimals);
  console.log("Vault Token:", vaultData.inputToken.symbol, "Decimals:", vaultData.inputToken.decimals);
  console.log("Input Amount:", inputAmount.toString(), "($" + inputAmountInUSD.toFixed(2) + ")");
  console.log("Amount After Fee:", amountAfterFee.toString());
  console.log("Amount For Strategy (A):", amountForStrategy.toString());
  console.log("Shares (C):", sharesAmount);
  console.log("Output Amount (D):", outputAmount.toString(), "($" + outputAmountInUSD.toFixed(2) + ")");
  console.log("Gas Fee:", gasFeeResult.gasFeeInInputToken.toString(), "($" + gasFeeInUSD + ")");
  console.log("Swap Slippage (B-A):", swapSlippage.toString(), "($" + swapSlippageInUSD.toFixed(2) + ")");
  console.log("Deposit Slippage (A-D):", depositSlippage.toString(), "($" + depositSlippageInUSD.toFixed(2) + ")");
  console.log("Needs Token Swap:", needsTokenSwap);
  console.log("Needs Gas Fee:", gasFeeResult.needsDeduction);
  console.log("==================================");

  // Calculate total slippage (swap + deposit slippage, excluding gas fee)
  const totalSlippageInUSD = swapSlippageInUSD + depositSlippageInUSD;
  const totalSlippagePercentage = inputAmountInUSD > 0 ? (totalSlippageInUSD / inputAmountInUSD) * 100 : 0;

  // Calculate total loss (input - output, which includes gas fee + slippage)
  const totalLossInUSD = inputAmountInUSD - outputAmountInUSD;
  const totalLossPercentage = inputAmountInUSD > 0 ? (totalLossInUSD / inputAmountInUSD) * 100 : 0;

  return {
    inputAmount,
    outputAmount,
    sharesAmount,

    gasFee: {
      amount: gasFeeResult.gasFeeInInputToken,
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

    totalSlippage: {
      amount: swapSlippage + depositSlippage,
      amountInUSD: formatCurrency(totalSlippageInUSD),
      percentage: totalSlippagePercentage,
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