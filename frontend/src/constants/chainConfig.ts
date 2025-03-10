import { defineChain } from "thirdweb";
import { Token } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { PublicKey, Connection } from "@solana/web3.js";

export const zeroSolAddress = PublicKey.default.toBase58();

// Load environment variables
export const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV || "mainnet"; // Default to mainnet if not set

// Define RPC URLs
const zetaRpcUrl = deployEnv === "testnet"
  ? process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA_TESTNET || ""
  : process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA || "";

const sepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_SEPOLIA || "";
const baseSepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE_SEPOLIA || "";
const polygonAmoyRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_POLYGON_AMOY || "";
const bscTestnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BSC_TESTNET || "";
const ethMainnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ETH || "";
const baseMainnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE || "";
const polygonMainnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_POLYGON || "";
const bscMainnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BSC || "";
export const solanaRpcUrl = deployEnv == "testnet" ? process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT_DEVNET || "" : process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "";
export const crossChainTxUrl = deployEnv == "testnet" ? process.env.NEXT_PUBLIC_CROSSCHAIN_TX_API_TEST || "" : process.env.NEXT_PUBLIC_CROSSCHAIN_TX_API || "";
export enum CHAIN_ID {
  zetachain = deployEnv === 'testnet' ? 7001 : 7000,
  ethereum = deployEnv === 'testnet' ? 11155111 : 1,
  base = deployEnv === 'testnet' ? 84532 : 8453,
  polygon = deployEnv === 'testnet' ? 80001 : 137,
  bsc = deployEnv === 'testnet' ? 97 : 56,
  solana = deployEnv === 'testnet' ? 901 : 900,
}

const zetaChain = defineChain({
  chainId: CHAIN_ID.zetachain, // 7001 for testnet, 7000 for mainnet
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

// Define Sepolia configuration
const ethereumChain = defineChain({
  chainId: CHAIN_ID.ethereum, // 11155111 for Sepolia Testnet, 1 for Ethereum Mainnet
  name: deployEnv === "testnet" ? "Sepolia Testnet" : "Ethereum Mainnet",
  shortName: deployEnv === "testnet" ? "sepolia" : "eth",
  chain: "ETH",
  rpc: [deployEnv === "testnet" ? sepoliaRpcUrl : ethMainnetRpcUrl], // Replace with your RPC URL if available
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  explorers: [
    {
      name: "Etherscan",
      url: deployEnv === "testnet"
        ? "https://sepolia.etherscan.io"
        : "https://etherscan.io",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: deployEnv === "testnet" ? "sepolia" : "ethereum",
});

// Define Base configuration
const baseChain = defineChain({
  chainId: CHAIN_ID.base, // 84532 for Base Sepolia Testnet, 8453 for Base Mainnet
  name: deployEnv === "testnet" ? "Base Sepolia Testnet" : "Base Mainnet",
  shortName: "base",
  chain: "Base",
  rpc: [deployEnv === "testnet" ? baseSepoliaRpcUrl : baseMainnetRpcUrl], // Replace with your RPC URL if available
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  explorers: [
    {
      name: "Base Explorer",
      url: deployEnv === "testnet"
        ? "https://base-sepolia.blockscout.com"
        : "https://explorer.base.org",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: "base",
});

// Define Polygon configuration
const polygonChain = defineChain({
  chainId: CHAIN_ID.polygon, // 80001 for Mumbai Testnet, 137 for Polygon Mainnet
  name: deployEnv === "testnet" ? "Polygon Mumbai Testnet" : "Polygon Mainnet",
  shortName: "polygon",
  chain: "Polygon",
  rpc: [deployEnv === "testnet" ? polygonAmoyRpcUrl : polygonMainnetRpcUrl], // Replace with your RPC URL if available
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  explorers: [
    {
      name: "Polygonscan",
      url: deployEnv === "testnet"
        ? "https://mumbai.polygonscan.com"
        : "https://polygonscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: "polygon",
});

// Define BSC configuration
const bscChain = defineChain({
  chainId: CHAIN_ID.bsc, // 97 for BSC Testnet, 56 for BSC Mainnet
  name: deployEnv === "testnet" ? "BSC Testnet" : "BSC Mainnet",
  shortName: "bsc",
  chain: "BSC",
  rpc: [deployEnv === "testnet" ? bscTestnetRpcUrl : bscMainnetRpcUrl], // Replace with your RPC URL if available
  nativeCurrency: {
    name: "Binance Coin",
    symbol: "BNB",
    decimals: 18,
  },
  explorers: [
    {
      name: "BSCScan",
      url: deployEnv === "testnet"
        ? "https://testnet.bscscan.com"
        : "https://bscscan.com",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: "bsc",
});

const solanaChain = defineChain({
  chainId: CHAIN_ID.solana, // Solana uses string identifiers
  name: deployEnv === "testnet" ? "devnet" : "mainnet",
  shortName: "sol",
  chain: "Solana",
  rpc: [
    solanaRpcUrl
  ],
  nativeCurrency: {
    name: "Solana",
    symbol: "SOL",
    decimals: 9, // Solana uses 9 decimal places
  },
  explorers: [
    {
      name: "Solana Explorer",
      url: deployEnv === "testnet"
        ? "https://explorer.solana.com/?cluster=devnet"
        : "https://explorer.solana.com/",
      standard: "none",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: "solana",
});




// Define supported chains based on the deployment environment
export const SUPPORTED_CHAINS = deployEnv === "testnet"
  ? [zetaChain, ethereumChain, baseChain, polygonChain, bscChain] // always put Zetachain first
  : [zetaChain, ethereumChain, baseChain, polygonChain, bscChain]; // always put Zetachain first

export const chainConfigs = {
  [CHAIN_ID.zetachain]: zetaChain,
  [CHAIN_ID.ethereum]: ethereumChain,
  [CHAIN_ID.base]: baseChain,
  [CHAIN_ID.bsc]: bscChain,
  [CHAIN_ID.polygon]: polygonChain,
  [CHAIN_ID.solana]: solanaChain,
}

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
  1: [
    {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/ETH.png",
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891",
    },
    {
      symbol: "USDC",
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a",
    },
    {
      symbol: "USDT",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
      imgURL: "/usdt.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7",
    },
  ],
  11155111: [
    {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/ETH.png",
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
    },
    {
      symbol: "USDC",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0xcC683A782f4B30c138787CB5576a86AF66fdc31d",
    },
  ],
  8453: [
    {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/ETH.png",
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0x1de70f3e971B62A0707dA18100392af14f7fB677"
    },
    {
      symbol: "USDC",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x96152E6180E085FA57c7708e18AF8F05e37B479D",
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
      ZRC20equivalent: "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"
    },
  ],
  137: [
    {
      symbol: "POL",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/polygon_logo.png",
      price: 0.7159,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501",
    },
    {
      symbol: "USDC",
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0xfC9201f4116aE6b054722E10b98D904829b469c3",
    },
    {
      symbol: "USDT",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
      imgURL: "/usdt.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0xdbfF6471a79E5374d771922F2194eccc42210B9F",
    },
  ],
  80002: [
    {
      symbol: "POL",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/polygon_logo.png",
      price: 0.7159,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0x777915D031d1e8144c90D025C594b3b8Bf07a08d",
    },
  ],
  56: [
    {
      symbol: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/bnb_logo.png",
      price: 734,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb",
    },
    {
      symbol: "USDC",
      address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      decimals: 18,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
    },
    {
      symbol: "USDT",
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      imgURL: "/usdt.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F",
    },
  ],
  97: [
    {
      symbol: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: "/bnb_logo.png",
      price: 734,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891",
    },
    {
      symbol: "USDC",
      address: "0x64544969ed7EBf5f083679233325356EbE738930",
      decimals: 18,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7",
    },
  ],
  900: [
    {
      symbol: "SOL",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 9,
      imgURL: "/solana_logo.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: "0x4bC32034caCcc9B7e02536945eDbC286bACbA073",
    },
    {
      symbol: "USDC",
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x8344d6f84d26f998fa070BbEA6D2E15E359e2641",
    },
    {
      symbol: "USDT",
      address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      decimals: 6,
      imgURL: "/USDT.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0xEe9CC614D03e7Dbe994b514079f4914a605B4719",
    },
    {
      symbol: "CBBTC",
      address: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
      decimals: 8,
      imgURL: "/cbbtc.png",
      price: 97303,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: "0x54Bf2B1E91FCb56853097BD2545750d218E245e1"
    }
  ],
};



// Account abstraction configuration
export const ACCOUNT_ABSTRACTION_CONFIG = {
  chain: zetaChain,
  sponsorGas: false,
  factoryAddress: "0x021A47c1F745cEaC5CD19DC92C5d117e84b1cD46", // Replace with the correct factory address
};

export const HERMES_URL = "https://hermes.pyth.network/";
export const PRICE_IDS: { [key: string]: string } = {
  "ETH": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BNB": "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  "POL": "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472",
  "USDC": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "CRV": "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  "SOL": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "COMP": "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
};

export const CHAINS_EXPLORER_BASE_URL_MAINNET: { [key: number]: string } = {
  [CHAIN_ID.zetachain]: "https://zetachain.blockscout.com",
  [CHAIN_ID.base]: "https://basescan.org",
  [CHAIN_ID.bsc]: "https://bscscan.com",
  [CHAIN_ID.polygon]: "https://polygonscan.com",
  [CHAIN_ID.ethereum]: "https://etherscan.io",
  [CHAIN_ID.solana]: "https://solscan.io"
}
