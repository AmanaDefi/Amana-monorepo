import { VaultData, Token } from "../types/types";
import { Chain, parseAbiItem, Address, parseUnits, formatUnits } from "viem";
import { getPathDataAndAmountOut } from "../actions/actions";
import { ZRC20_TOKENS_BY_ADDRESS } from "../constants/ZRC20TokensByAddress";
import { isZetachain } from "./utils";
import { getPublicClient } from "./getPublicClient";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { ConnectedWallet } from "@privy-io/react-auth";

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
  amountAfterFee: bigint;
  amountForStrategy: bigint;
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

  console.log("GasFee:", gasFee.toString());
  let gasFeeInVaultAsset = gasFee;

  // Convert gas fee to vault asset if tokens differ
  if (gasZRC20.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    console.log("Converting gas fee to vault asset terms...");
    const gasTokenDecimals = ZRC20_TOKENS_BY_ADDRESS[gasZRC20]?.decimals ?? 18;
    console.log("Gas token decimals:", gasTokenDecimals);
    gasFeeInVaultAsset = BigInt(Math.floor((Number(gasFee) / 10 ** gasTokenDecimals) * gasTokenPrice * 10 ** vaultData.inputToken.decimals));
    console.log("needs deduction:", true);
  }
  console.log("Gas fee in vault asset:", gasFeeInVaultAsset.toString());
  
  // Format gas fee in USD and ETH
  const gasFeeInTokenUnits = Number(formatUnits(gasFeeInVaultAsset, vaultData.inputToken.decimals));
  const gasFeeInUSDAmount = gasFeeInTokenUnits * vaultTokenPrice;
  const gasFeeInUSD = formatCurrency(gasFeeInUSDAmount);
  
  console.log("Final gas fee calculation:", {
    gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
    gasFeeInTokenUnits,
    gasFeeInUSDAmount,
    gasFeeInUSD,
    vaultTokenPrice,
    gasTokenPrice
  });

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
  // Step 1: Swap full input amount to vault asset (if needed)
  let amountForStrategy = inputAmount;
  let swapSlippage = 0n;
  let needsTokenSwap = false;

  console.log(
    "[DepositCalc] Comparing inputToken.address:",
    inputToken.address,
    "with vaultData.inputToken.address:",
    vaultData.inputToken.address
  );
  if (inputToken.address.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
    needsTokenSwap = true;
    const swapResult = await getPathDataAndAmountOut(
      inputAmount,
      inputToken,
      vaultData.inputToken,
      vaultData.id as Address,
      500
    );
    console.log("Needs Token Swap:", needsTokenSwap);
    amountForStrategy = swapResult.amountOut;
    // Calculate swap slippage in vault asset
    const equivalentInputAmount = BigInt(Math.floor((Number(inputAmount) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice * 10 ** vaultData.inputToken.decimals));
    swapSlippage = equivalentInputAmount > amountForStrategy ? equivalentInputAmount - amountForStrategy : 0n;
    console.log("[DepositCalc] Swap Result:", swapResult);
  } else {
    console.log("No token swap needed, input token is vault asset");
  }
  console.log("[DepositCalc] Amount For Strategy (after swap):", amountForStrategy.toString());
  console.log("[DepositCalc] Swap Slippage:", swapSlippage.toString());

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
  let amountAfterFee = amountForStrategy;
  console.log("amountForStrategy for rohit:", amountAfterFee);
  if (gasFeeResult.needsDeduction) {
    amountAfterFee = amountForStrategy > gasFeeResult.gasFeeInVaultAsset ? amountForStrategy - gasFeeResult.gasFeeInVaultAsset : 0n;
    console.log("amountAfterFee for rohit:", amountAfterFee);
  }
  console.log("[DepositCalc] Gas Fee Result:", gasFeeResult);
  console.log("[DepositCalc] Amount After Fee (after gas deduction):", amountAfterFee);

  // Step 3: Calculate shares and output amount
  const sharesAmount = await getSharesFromStrategyDeposit(amountAfterFee, vaultData, activeWallet);
  console.log("[DepositCalc] Shares Amount:", sharesAmount);
  const outputAmount = await getAssetsFromShares(parseUnits(sharesAmount, vaultData.inputToken.decimals), vaultData, activeWallet);
  console.log("[DepositCalc] Output Amount (in assets):", outputAmount);

  // Step 4: Calculate deposit slippage (in vault asset)
  const depositSlippage = amountAfterFee > outputAmount ? amountAfterFee - outputAmount : 0n;
  console.log("[DepositCalc] Deposit Slippage:", depositSlippage);

  // Step 5: USD conversions (at the end)
  const inputAmountInUSD = (Number(inputAmount) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice;
  const swapSlippageInUSD = (Number(swapSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const depositSlippageInUSD = (Number(depositSlippage) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const outputAmountInUSD = (Number(outputAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
  const gasFeeInUSD = parseFloat(gasFeeResult.gasFeeInUSD.replace(/[^0-9.]/g, "") || "0");

  // Step 6: Total slippage (swap + deposit)
  const totalSlippageInUSD = swapSlippageInUSD + depositSlippageInUSD;
  const totalSlippagePercentage = inputAmountInUSD > 0 ? (totalSlippageInUSD / inputAmountInUSD) * 100 : 0;

  // Debug log for USD values
  console.log("[DepositCalc] USD Values:", {
    inputAmountInUSD,
    gasFeeInUSD,
    swapSlippageInUSD,
    depositSlippageInUSD,
    outputAmountInUSD
  });

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

    amountAfterFee,
    amountForStrategy,
    needsTokenSwap,
    needsGasFee: gasFeeResult.needsDeduction,
  };
}; 