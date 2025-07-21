import { VaultData } from "../types/types";
import { Address, parseAbiItem } from "viem";
import { getPublicClient } from "./getPublicClient";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";

export async function getVaultGasTokenInfo(vaultData: VaultData): Promise<{ gasZRC20?: string; gasFee?: bigint; gasZRC20Symbol?: string }> {
  if (!vaultData?.id || !vaultData?.inputToken?.address) return {};

  try {
    const publicClient = getPublicClient(SUPPORTED_CHAINS[0].id);
    // Step 1: fetch gasLimitForWithdrawAndCall from vault
    const gasLimit = await publicClient.readContract({
      address: vaultData.id as Address,
      abi: [
        parseAbiItem("function gasLimitForWithdrawAndCall() view returns (uint256)")
      ],
      functionName: "gasLimitForWithdrawAndCall",
    }) as bigint;

    // Step 2: call withdrawGasFeeWithGasLimit on inputToken
    const [tokenAddress, feeAmount] = await publicClient.readContract({
      address: vaultData.inputToken.address as Address,
      abi: [
        parseAbiItem("function withdrawGasFeeWithGasLimit(uint256) view returns (address,uint256)")
      ],
      functionName: "withdrawGasFeeWithGasLimit",
      args: [gasLimit],
    }) as [string, bigint];

    // Step 3: fetch the symbol of the gas token
    const symbol = await publicClient.readContract({
      address: tokenAddress as Address,
      abi: [
        parseAbiItem("function symbol() view returns (string)")
      ],
      functionName: "symbol",
    }) as string;

    return { gasZRC20: tokenAddress, gasFee: feeAmount, gasZRC20Symbol: symbol };
  } catch (err) {
    console.error("Error fetching gas token details:", err);
    return {};
  }
} 