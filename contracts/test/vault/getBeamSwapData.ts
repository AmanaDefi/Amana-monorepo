import { vaultTestMatrix } from "../config/vault.config";
import { swap } from "codemelt-retro-api-sdk/functional/api";
import api from "codemelt-retro-api-sdk";
import type { IConnection } from "codemelt-retro-api-sdk";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config(); // Load API key from .env

const beamConnection: IConnection = {
  host: "https://public-beam-backend-mainnet.codemelt.codes",
  headers: {
    "x-api-key": process.env.BEAM_API_KEY!,
  },
};

const getBeamTokenId = async (tokenAddress: string): Promise<number | null> => {
  try {
    const response = await api.functional.api.currency.partners.getPartners(
      beamConnection,
      "7000"
    );

    const data = response.data as {
      data: { address: string; id: number }[];
    };

    const token = data.data.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.id ?? null;
  } catch (err) {
    console.error("Failed to fetch token ID:", err);
    return null;
  }
};

export async function getBeamSwapDataFromVaultConfig() {
  const config = vaultTestMatrix[0];
  const { vaultConfig, txConfig } = config;

  const inputToken = txConfig.originZRC20Input;
  console.log("Input Token:", inputToken);
  const outputToken = vaultConfig.asset;
  console.log("Output Token:", outputToken);
  const userAddress = "0x1111111111111111111111111111111111111111";

  const [inputTokenId, outputTokenId] = await Promise.all([
    getBeamTokenId(inputToken),
    getBeamTokenId(outputToken),
  ]);

  if (inputTokenId == null || outputTokenId == null) {
    console.error("❌ Missing token ID for input or output token");
    return;
  }
  console.log("Input Token ID:", inputTokenId);
  console.log("Output Token ID:", outputTokenId);
  // console.log("Cross Chain Deposit Amount:", txConfig.crossChainDepositAmount1);
  console.log("Cross Chain Deposit Amount (in ZRC20):", Number(txConfig.crossChainDepositAmount1) / 10 ** 6);
  console.log("userAddress:", userAddress);
  const swapDetails: swap.native.getSwapData.Input = {
    tokenAId: inputTokenId,
    tokenBId: outputTokenId,
    slippage: 500,
    amount: Number(txConfig.crossChainDepositAmount1) / 10 ** 6,
    sender: userAddress,
    recipient: userAddress,
  };

  try {
    console.log("📡 Requesting Beam swap data...");
    const response = await swap.native.getSwapData(beamConnection, swapDetails);
    console.log("✅ Swap data received from Beam:", response);
    const path: string[] = response.data?.data?.path;

    if (!Array.isArray(path) || path.length < 2) {
      throw new Error("Invalid or missing swap path from Beam");
    }

    const encodedPath = ethers.utils.solidityPack(
      Array(path.length).fill("address"),
      path
    );

    console.log("✅ Encoded swap path (bytes):");
    console.log(encodedPath); // hex string ready to pass to your contract

    return encodedPath;
  } catch (err: any) {
    console.error("❌ Failed to fetch swap data:", err.message);
  }
}

getBeamSwapDataFromVaultConfig();
