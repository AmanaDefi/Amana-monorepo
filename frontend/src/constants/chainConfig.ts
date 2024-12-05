import { defineChain } from "thirdweb";
import { Token } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";

// Load environment variables
const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV || "mainnet"; // Default to mainnet if not set

// Define RPC URLs
const zetaRpcUrl = deployEnv === "testnet"
  ? process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA_TESTNET || ""
  : process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA || "";

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_SEPOLIA || "";
const baseSepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE_SEPOLIA || "";
const polygonAmoyRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_POLYGON_AMOY || "";
const bscTestnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BSC_TESTNET || "";

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
        ? "https://zetachain-testnet.blockscout.com/"
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

// Define Polygon Amoy Testnet configuration
const polygonAmoyTestnet = defineChain({
  chainId: 80002,
  name: "Polygon Amoy Testnet",
  shortName: "polygon-amoy",
  chain: "Polygon",
  rpc: [polygonAmoyRpcUrl],
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  explorers: [
    {
      name: "Polygonscan",
      url: "https://mumbai.polygonscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: true,
  slug: "polygon-amoy",
});

// Define BSC Testnet configuration
const bscTestnet = defineChain({
  chainId: 97,
  name: "BSC Testnet",
  shortName: "bsc-testnet",
  chain: "BSC",
  rpc: [bscTestnetRpcUrl],
  nativeCurrency: {
    name: "Binance Coin",
    symbol: "BNB",
    decimals: 18,
  },
  explorers: [
    {
      name: "BSCScan",
      url: "https://testnet.bscscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: true,
  slug: "bsc-testnet",
});

// Define supported chains based on the deployment environment
export const SUPPORTED_CHAINS = deployEnv === "testnet"
  ? [zetaChain, sepoliaTestnet, baseSepoliaTestnet, polygonAmoyTestnet, bscTestnet] // always put Zetachain first
  : [zetaChain]; // always put Zetachain first

// Define approved tokens per chain
export const APPROVED_TOKENS: { [chainId: number]: Token[] } = {
  // 7001: [
  //   {
  //     symbol: "ZETA",
  //     address: "0x0000000000000000000000000000000000000001",
  //     decimals: 18,
  //     imgURL: "/path/to/zeta.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //   },

  // ],
  11155111: [
    {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/ETH.png",
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
    },
  ],
  84532: [
    {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/ETH.png",
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
    },
  ],
  80002: [
    {
      symbol: "MATIC",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/polygon_logo.png",
      price: 0.7159,
      balance: EMPTY_BALANCE,
      isNative: true,
    },
  ],
  97: [
    {
      symbol: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/bnb_logo.png",
      price: 300,
      balance: EMPTY_BALANCE,
      isNative: true,
    },
    {
      symbol: "USDC",
      address: "0x64544969ed7EBf5f083679233325356EbE738930",
      decimals: 18,
      imgURL: "/USDC.png",
      price: 300,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
  ],
};

// Account abstraction configuration
export const ACCOUNT_ABSTRACTION_CONFIG = {
  chain: zetaChain,
  sponsorGas: false,
  factoryAddress: "0x021A47c1F745cEaC5CD19DC92C5d117e84b1cD46", // Replace with the correct factory address
};
