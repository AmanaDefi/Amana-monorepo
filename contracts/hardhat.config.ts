import "./tasks/deployGeneric";
import "./tasks/deployStrategy";
import "./tasks/deployUpgradeableVault";
import "./tasks/deployTreasury";
import "./tasks/upgradeVault";

import "@nomicfoundation/hardhat-toolbox";
import "@zetachain/toolkit/tasks";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-ethers";

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
    sepolia_testnet: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    hardhat: {
      chainId: 7001,  // Set the chain ID for your forked network, for example, the ZetaChain testnet chain ID.
      forking: {
        url: `https://zetachain-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 7668161 // 20113140, //  
      },
      allowUnlimitedContractSize: true,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,  // Adjust this number depending on your needs
          }
        }
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,  // Adjust this number depending on your needs
          }
        }
      }
    ],
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      base_sepolia: process.env.BASESCAN_API_KEY || "",
      zeta_mainnet: "abc", // not required for Blockscout - can be any non-empty string
      zeta_testnet: "abc", // not required for Blockscout - can be any non-empty string
      sepolia_testnet: "abc", // not required for Blockscout - can be any non-empty string
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
      {
        network: "zeta_mainnet",
        chainId: 7000,
        urls: {
          apiURL: "https://zetachain.blockscout.com/api",
          browserURL: "https://zetachain.blockscout.com"
        }
      },
      {
        network: "zeta_testnet",
        chainId: 7001,
        urls: {
          apiURL: "https://zetachain-testnet.blockscout.com/api",
          browserURL: "https://zetachain-testnet.blockscout.com"
        }
      },
      {
        network: "sepolia_testnet",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com"
        }
      },
    ],
  },
  typechain: {
    outDir: "typechain",  // This is where Typechain outputs the generated types
    target: "ethers-v5",  // Target ethers.js
  },
};

export default config;
