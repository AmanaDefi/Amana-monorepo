import "./tasks/deployGeneric";
import "./tasks/deployAaveEthStrategy";
import "./tasks/deployCurveEthStrategy";
import "./tasks/deployAmanaConnectedChainVault";
import "./tasks/deployAmanaZetachainVault";
import "./tasks/deployTreasury";
import "./tasks/upgradeVault";
import "./tasks/deployGasTank";
import "./tasks/deploySwapHelper";
import "./tasks/deployMockERC20";
import "./tasks/deployMock4626";
import "./tasks/deployERC20_Strategy";
import "./tasks/deployZetachainStrategy";
import "./tasks/deployPriceOracle";
import "./tasks/deployWithdrawalReceiver";
import "./tasks/deployZapContract";
import "./tasks/deployCurveERC20_Strategy";
import "./tasks/deployCurveEthStrategy";
import "./tasks/updatePythPrices";

import "@nomicfoundation/hardhat-toolbox";
import "@zetachain/toolkit/tasks";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-ethers";
// import "@nomiclabs/hardhat-verify";

import { getHardhatConfigNetworks } from "@zetachain/networks";
import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
import { mainnet } from "@zetachain/protocol-contracts";

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    ...getHardhatConfigNetworks(),
    ethereum: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    arbitrumOne: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY],
    },
    base: {
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    sepolia_testnet: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon_amoy: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    bsc: {
      url: "https://56.rpc.thirdweb.com/4e74a8cc63319adbdf4ca0f672467a7c",
      accounts: [process.env.PRIVATE_KEY],
    },
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      accounts: [process.env.PRIVATE_KEY],
    },
    base_sepolia: {
      url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
    // hardhat: {
    //   chainId: 84532,
    //   forking: {
    //     url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    //     blockNumber: 19375084,
    //   },
    //   allowUnlimitedContractSize: true,
    // },
    hardhat: {
      chainId: 7000,  // Set the chain ID for your forked network, for example, the ZetaChain testnet chain ID.
      forking: {
        url: `https://zetachain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 6366501
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
            runs: 1000,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000,
          },
          viaIR: true,
        },
      },
    ],
    overrides: {
      "contracts/AmanaConnectedChainVault.sol": {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 300,
          },
          viaIR: true,
        },
      },
      "contracts/AmanaZetachainVault.sol": {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 750,
          },
          viaIR: true,
        },
      },
    }
  },
  etherscan: {
    apiKey: {
      ethereum: process.env.ETHERSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      base_sepolia: process.env.BASESCAN_API_KEY || "",
      zeta_mainnet: process.env.BLOCKSCOUT_API_KEY || "",
      zeta_testnet: process.env.BLOCKSCOUT_API_KEY || "",
      sepolia_testnet: "abc",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygon_amoy: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      bsc_testnet: process.env.BSCSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com",
        },
      },
      {
        network: "base_sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
      {
        network: "zeta_mainnet",
        chainId: 7000,
        urls: {
          apiURL: "https://zetachain.blockscout.com/api",
          browserURL: "https://zetachain.blockscout.com",
        },
      },
      {
        network: "zeta_testnet",
        chainId: 7001,
        urls: {
          apiURL: "https://zetachain-testnet.blockscout.com/api",
          browserURL: "https://zetachain-testnet.blockscout.com",
        },
      },
      {
        network: "sepolia_testnet",
        chainId: 11155111,
        urls: {
          apiURL: "https://eth-sepolia.blockscout.com/api",
          browserURL: "https://eth-sepolia.blockscout.com",
        },
      },
      {
        network: "polygon_amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
      {
        network: "bsc",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com",
        },
      },
      {
        network: "bsc_testnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com",
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
