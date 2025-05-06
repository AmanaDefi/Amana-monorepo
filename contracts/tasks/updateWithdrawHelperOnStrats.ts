import { task } from "hardhat/config";
import { ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Add RPC URLs and private key via .env or config
const RPCS: Record<string, string> = {
  ethereum: process.env.ETH_RPC_URL || "",
  base: process.env.BASE_RPC_URL || "",
  polygon: process.env.POLYGON_RPC_URL || "",
  bsc: process.env.BSC_RPC_URL || "",
};

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

task("updateWithdrawHelper", "Updates the withdrawHelper on multiple strategies across chains")
  .addParam("helper", "The new withdrawHelper address to set")
  .setAction(async ({ helper }, hre: HardhatRuntimeEnvironment) => {
    // Strategy addresses and the chain they're on (same order)
    const strategyAddresses = [
      // "0xC967154127af55cecC47328B06385EFd8f8C427E",
      // "0x5D4a0eF44758c9ab0571b67927ED0B849bbB12D0",
      "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      // "0x21e92Bc73c0215Dbb695fba5654C2331044DbBD7",
    ];

    const strategyChains = [
      // "base",
      // "base",
      "polygon",
      // "bsc"
    ];

    if (strategyAddresses.length !== strategyChains.length) {
      throw new Error("strategyAddresses and strategyChains must be the same length");
    }

    for (let i = 0; i < strategyAddresses.length; i++) {
      const address = strategyAddresses[i];
      const chain = strategyChains[i];

      const rpcUrl = RPCS[chain];
      if (!rpcUrl) {
        console.error(`❌ No RPC URL configured for chain: ${chain}`);
        continue;
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const signer = new ethers.Wallet(PRIVATE_KEY, provider);
      console.log(`\n🔗 [${chain}] Using signer: ${signer.address}`);
      console.log(`⛓️  Sending to: ${address}`);

      const contract = new ethers.Contract(
        address,
        ["function updateWithdrawHelper(address)"],
        signer
      );

      try {
        const tx = await contract.updateWithdrawHelper(helper);
        console.log(`📤 Tx sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Success on ${chain}: ${address}`);
      } catch (err) {
        console.error(`❌ Failed on ${chain}: ${address}`, err);
      }
    }
  });
