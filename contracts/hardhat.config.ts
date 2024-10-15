import "./tasks/interact";
import "./tasks/deploy";
import "./tasks/deployVault";
import "./tasks/deployStrategy";
import "./tasks/deployUpgradeableVault";
import "./tasks/deployTreasury";

import "@nomicfoundation/hardhat-toolbox";
import "@zetachain/toolkit/tasks";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-ethers"; // For ethers v6 compatibility

import { getHardhatConfigNetworks } from "@zetachain/networks";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    ...getHardhatConfigNetworks(),
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    hardhat: {
      forking: {
        url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 20113140, // Optional: Set a block number to fork from
      },
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
      },
      {
        version: "0.8.26",
      }
    ]
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      base_sepolia: process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "base_sepolia", // Custom config for base_sepolia
        chainId: 84532,          // Replace with the correct chainId for Base Sepolia
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org", // Testnet explorer URL
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",  // This is where Typechain outputs the generated types
    target: "ethers-v6",  // Target ethers.js
  },
};

export default config;
