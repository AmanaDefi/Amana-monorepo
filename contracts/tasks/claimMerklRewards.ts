import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MerklApi } from "@merkl/api";
import { ethers } from "ethers";

const DISTRIBUTOR_ADDRESS = "0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae"; // Replace with actual distributor address

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const [signer] = await hre.ethers.getSigners();

  if (!signer) {
    throw new Error(
      `Wallet not found. Please set the PRIVATE_KEY env variable or use a funded Hardhat account.`
    );
  }

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🌍 Network: ${network}`);

  console.log("📡 Fetching Merkl rewards...");
  const { status, data } = await MerklApi("https://api.merkl.xyz")
    .v4.users({ address: signer.address })
    .rewards.get({ query: { chainId: [args.chainId] } });

  if (status !== 200) throw new Error("Failed to fetch rewards");

  const users = [];
  const tokens = [];
  const amounts = [];
  const proofs = [];

  for (const rewards of data) {
    if (rewards.chain.id !== args.chainId) continue;
    for (const reward of rewards.rewards) {
      users.push(signer.address);
      tokens.push(reward.token.address);
      amounts.push(reward.amount);
      proofs.push(reward.proofs);
    }
  }

  if (tokens.length === 0) {
    console.log("❌ No tokens to claim.");
    return;
  }

  console.log(`⏳ Claiming rewards for ${tokens.length} tokens...`);
  const distributor = await hre.ethers.getContractAt(
    "Distributor",
    DISTRIBUTOR_ADDRESS,
    signer
  );

  const tx = await distributor.claim(users, tokens, amounts, proofs);
  console.log(`📜 Transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
  console.log("✅ Rewards claimed successfully!");
};

task("claimRewards", "Claims Merkl rewards for the user")
  .addParam("chainId", "The chain ID to claim rewards on")
  .setAction(main);

export default {};
