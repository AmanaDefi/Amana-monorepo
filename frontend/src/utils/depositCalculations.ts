import { VaultData, Token } from "../types/types";
import { Chain, parseAbiItem, Address, parseUnits, formatUnits } from "viem";
import { getPathDataAndAmountOut } from "../actions/actions";
import { ZRC20_TOKENS_BY_ADDRESS } from "../constants/ZRC20TokensByAddress";
import { isStablecoin, isZetachain } from "./utils";
import { getPublicClient } from "./getPublicClient";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { ConnectedWallet } from "@privy-io/react-auth";
import { token } from "@coral-xyz/anchor/dist/cjs/utils";

const SWAP_HELPER_ADDRESS = process.env
  .NEXT_PUBLIC_SWAPHELPER_ADDRESS as `0x${string}`;

export interface DepositCalculationResult {
  // Input and output amounts
  inputAmount: bigint;
  outputAmount: bigint;
  sharesAmount: string; // Changed from bigint to string since getSharesFromVaultDeposit returns string

  // Fee breakdown
  gasFee: {
    amount: bigint; // in vault asset
    amountInUSD: string;
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

  // Conversion details
  amountAfterSwap: bigint;
  amountAfterFee: bigint;
  needsTokenSwap: boolean;
  needsGasFee: boolean;
}

export interface GasFeeCalculationResult {
  gasFeeInVaultAsset: bigint; // in vault asset
  gasFeeInUSD: string;
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
): Promise<GasFeeCalculationResult> => {
  // If gas fees are paid from gas tank, no deduction needed
  if (vaultData.depositFeePaidFromGasTank) {
    return {
      gasFeeInVaultAsset: BigInt(0),
      gasFeeInUSD: "0",
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
  if (gasZRC20.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    const gasTokenDecimals = ZRC20_TOKENS_BY_ADDRESS[gasZRC20]?.decimals ?? 18;
    gasFeeInVaultAsset = BigInt(Math.floor((Number(gasFee) / 10 ** gasTokenDecimals) * gasTokenPrice * 10 ** vaultData.inputToken.decimals));
  }

  // Format gas fee in USD and ETH
  const gasFeeInTokenUnits = Number(formatUnits(gasFeeInVaultAsset, vaultData.inputToken.decimals));
  const gasFeeInUSDAmount = gasFeeInTokenUnits * vaultTokenPrice;
  const gasFeeInUSD = formatCurrency(gasFeeInUSDAmount);

  return {
    gasFeeInVaultAsset,
    gasFeeInUSD,
    gasDetails: {
      gasZRC20,
      gasFee,
      gasLimit: gasLimitForWithdrawAndCall,
    },
    needsDeduction: true,
  };
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
  formatCurrency: (amount: number) => string
): Promise<DepositCalculationResult> => {
  // Early return if inputAmount is zero
  if (inputAmount === 0n) {
    return {
      inputAmount: 0n,
      outputAmount: 0n,
      sharesAmount: "0",
      gasFee: {
        amount: 0n,
        amountInUSD: formatCurrency(0),
        needsDeduction: false,
      },
      swapSlippage: {
        amount: 0n,
        amountInUSD: formatCurrency(0),
        percentage: 0,
      },
      depositSlippage: {
        amount: 0n,
        amountInUSD: formatCurrency(0),
        percentage: 0,
      },
      totalSlippage: {
        amount: 0n,
        amountInUSD: formatCurrency(0),
        percentage: 0,
      },
      amountAfterSwap: 0n,
      amountAfterFee: 0n,
      needsTokenSwap: false,
      needsGasFee: false,
    };
  }

  // Step 1: Swap full input amount to vault asset (if needed)
  let amountAfterSwap = inputAmount;
  let swapSlippage = 0n;
  let needsTokenSwap = false;
  let zcInputToken = inputToken;
  if (activeChain.id !== 7000) {
    zcInputToken = inputToken.ZRC20equivalent || inputToken;
  }
  console.log(
    "[DepositCalc] Comparing inputToken.ZRC20equivalent.address:",
    zcInputToken.address,
    "with vaultData.inputToken.address:",
    vaultData.inputToken.address
  );

  if (zcInputToken?.address.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    needsTokenSwap = true;
    console.log("amountAfterSwap before swap", amountAfterSwap);
    const swapResult = await getPathDataAndAmountOut(
      inputAmount,
      zcInputToken,
      vaultData.inputToken,
      vaultData.id as Address,
      500
    );
    amountAfterSwap = swapResult.amountOut;
    // Calculate swap slippage in vault asset
    // Convert input amount to vault asset units using USD price ratio
    // Equivalent vault tokens = inputAmount * (inputTokenPrice / vaultTokenPrice)
    let inputAmountInVaultAsset: bigint;
    {
      const normalizedInputAmount = Number(inputAmount) / 10 ** (zcInputToken.decimals ?? 18);
      const priceRatio = inputTokenPrice / vaultTokenPrice; // how many vault tokens per input token
      inputAmountInVaultAsset = BigInt(
        Math.floor(normalizedInputAmount * priceRatio * 10 ** vaultData.inputToken.decimals),
      );
    }
    swapSlippage = inputAmountInVaultAsset > amountAfterSwap ? inputAmountInVaultAsset - amountAfterSwap : 0n;
  }

  // Step 2: Deduct gas fee (in vault asset)
  const gasFeeResult = await calculateGasFeeIfNeeded(
    vaultData,
    inputToken,
    activeChain,
    vaultTokenPrice,
    inputTokenPrice,
    gasTokenPrice,
    formatCurrency
  );
  let amountAfterFee = amountAfterSwap;
  if (gasFeeResult.needsDeduction) {
    amountAfterFee = amountAfterSwap > gasFeeResult.gasFeeInVaultAsset ? amountAfterSwap - gasFeeResult.gasFeeInVaultAsset : 0n;
  }

  // Step 3: Calculate shares and output amount
  const sharesAmount = await getSharesFromStrategyDeposit(amountAfterFee, vaultData, activeWallet);
  console.log("sharesAmount", sharesAmount);
  const outputAmount = await getAssetsFromShares(parseUnits(sharesAmount, vaultData.inputToken.decimals), vaultData, activeWallet);

  // Step 4: Calculate deposit slippage (in vault asset)
  const depositSlippage = amountAfterFee > outputAmount ? amountAfterFee - outputAmount : 0n;

  // Step 5: USD conversions (at the end)
  const inputAmountInUSD = (Number(inputAmount) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice;
  const swapSlippageInUSD = (Number(swapSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const depositSlippageInUSD = (Number(depositSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const outputAmountInUSD = (Number(outputAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const gasFeeInUSD = parseFloat(gasFeeResult.gasFeeInUSD.replace(/[^0-9.]/g, "") || "0");

  console.log("inputToken decimals", inputToken?.decimals);
  console.log("vaultData.inputToken decimals", vaultData.inputToken.decimals);
  console.log("vaultTokenPrice", vaultTokenPrice);
  console.log("inputTokenPrice", inputTokenPrice);
  console.log("gasTokenPrice", gasTokenPrice);
  console.log("inputAmountInUSD", inputAmountInUSD);
  console.log("swapSlippageInUSD", swapSlippageInUSD);
  console.log("depositSlippageInUSD", depositSlippageInUSD);
  console.log("outputAmountInUSD", outputAmountInUSD);
  console.log("gasFeeInUSD", gasFeeInUSD);


  // Step 6: Total slippage (swap + deposit)
  const totalSlippageInUSD = swapSlippageInUSD + depositSlippageInUSD;
  const totalSlippagePercentage = inputAmountInUSD > 0 ? (totalSlippageInUSD / inputAmountInUSD) * 100 : 0;

  return {
    inputAmount,
    outputAmount, // in assets
    sharesAmount, // in shares

    gasFee: {
      amount: gasFeeResult.gasFeeInVaultAsset,
      amountInUSD: gasFeeResult.gasFeeInUSD,
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

    amountAfterSwap,
    amountAfterFee,
    needsTokenSwap,
    needsGasFee: gasFeeResult.needsDeduction,
  };
};
