import { VaultData, Token } from "../types/types";
import { Chain, parseAbiItem } from "viem";
import { getPathDataAndAmountOut } from "../actions/actions";
import { ZRC20_TOKENS_BY_ADDRESS } from "../constants/ZRC20TokensByAddress";
import { isZetachain } from "./utils";
import { getPublicClient } from "./getPublicClient";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";

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
 * @param vaultData - The vault data containing deposit fee configuration
 * @param inputToken - The token being deposited
 * @param activeChain - The active chain for the transaction
 * @param vaultTokenPrice - Price of vault token in USD (for USD calculations)
 * @param ethPriceUsd - ETH price in USD (for ETH calculations)
 * @param formatCurrency - Function to format currency values
 * @param convertUsdToEth - Function to convert USD to ETH
 * @returns Promise<GasFeeCalculationResult>
 */
export const calculateGasFeeInVaultAsset = async (
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
  const chainToUse = isZetachain(activeChain.id) ? activeChain : SUPPORTED_CHAINS[0];
  const publicClient = await getPublicClient(undefined, chainToUse.id);
  
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
  const inputTokenZeta = isZetachain(activeChain.id) ? inputToken : inputToken?.ZRC20equivalent;

  if (!inputTokenZeta) {
    return gasFeeInVaultAsset;
  }

  // If input token differs from vault token, convert gas fee back to input token terms
  if (inputTokenZeta.address !== vaultData.inputToken.address) {
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