import { defineChain } from "thirdweb";

// Load environment variables
const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV || "mainnet"; // Default to mainnet if not set

// Define RPC URLs
const zetaRpcUrl = deployEnv === "testnet"
  ? process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA_TESTNET || ""
  : process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA || "";

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_SEPOLIA || "";
const baseSepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE_SEPOLIA || "";

// Define ZetaChain configuration
const zetaChain = defineChain({
  chainId: deployEnv === "testnet" ? 7001 : 7000, // 7001 for testnet, 7000 for mainnet
  name: deployEnv === "testnet" ? "ZetaChain Testnet" : "ZetaChain Mainnet",
  shortName: "zeta",
  chain: "ZetaChain",
  rpc: [zetaRpcUrl], // RPC should be an array of strings
  nativeCurrency: {
    name: "Zeta",
    symbol: "ZETA",
    decimals: 18,
  },
  explorers: [
    {
      name: "Zeta Explorer",
      url: deployEnv === "testnet"
        ? "https://testnet.explorer.zetachain.com"
        : "https://explorer.zetachain.com",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet", // Set to true if testnet
  slug: "zetachain",
});

// Define Sepolia Testnet configuration
const sepoliaTestnet = defineChain({
  chainId: 11155111,
  name: "Sepolia Testnet",
  shortName: "sepolia",
  chain: "ETH",
  rpc: [sepoliaRpcUrl], // Replace with your RPC URL if available
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  explorers: [
    {
      name: "Etherscan",
      url: "https://sepolia.etherscan.io",
      standard: "EIP3091",
    },
  ],
  testnet: true,
  slug: "sepolia",
});

// Define Base Sepolia Testnet configuration
const baseSepoliaTestnet = defineChain({
  chainId: 84532,
  name: "Base Sepolia Testnet",
  shortName: "base-sepolia",
  chain: "Base",
  rpc: [baseSepoliaRpcUrl], // Replace with your RPC URL if available
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  explorers: [
    {
      name: "Base Scout",
      url: "https://base-sepolia.blockscout.com",
      standard: "EIP3091",
    },
  ],
  testnet: true,
  slug: "base-sepolia",
});

// Define supported chains based on the deployment environment
export const SUPPORTED_CHAINS = deployEnv === "testnet"
  ? [zetaChain, sepoliaTestnet, baseSepoliaTestnet] // always put Zetachain first
  : [zetaChain]; // always put Zetachain first

// Account abstraction configuration
export const ACCOUNT_ABSTRACTION_CONFIG = {
  chain: zetaChain,
  sponsorGas: false,
  factoryAddress: "0x021A47c1F745cEaC5CD19DC92C5d117e84b1cD46", // Replace with the correct factory address
};
