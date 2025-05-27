import { defineChain } from "thirdweb";
import { Token, Icon } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { PublicKey, Connection } from "@solana/web3.js";
import { ZRC20_TOKENS_BY_ADDRESS } from "@/constants/ZRC20TokensByAddress";

export const zeroSolAddress = PublicKey.default.toBase58();

export const TOKEN_LOGO_URLS: Record<string, string> = {
  ZETA: "/ZetaChain.jpeg",
  BTC: "/bitcoin_logo.png",
  CBBTC: "/cbbtc.png",
  ETH: "/ETH.png",
  SOL: "/solana_logo.png",
  POL: "/polygon_logo.png",
  AVAX: "/avalanche-avax-logo.png",
  BNB: "/bnb_logo.png",
  USDC: "/USDC.png",
  USDT: "/usdt.png",
  COMPOUND: "/compound.png",
  AAVE: "/aave.png",
  FLUID: "/fluid.png",
  VENUS: "/venus.png",
  TON: "/ton_logo.png",
  MOONWELL: "/Moonwell.png",
  CURVE: "/curve.png",
  EUER: "/euler.svg",
  ARB: "/arbitrum-arb-logo.png",
  AMANAZ: "/amana-token-logo.svg",
  BASE: "/base.png",
}

// Chain icons mapping (optional fallback if modal icons fail) {It's a long one, should we move it to utils || any other data center}
const CHAIN_ICONS: { [chainId: number]: Icon } = {
  7000: {
    url: TOKEN_LOGO_URLS.ZETA,
    width: 32,
    height: 32,
    format: "jpeg"
  }, // ZetaChain Mainnet
  7001: {
    url: TOKEN_LOGO_URLS.ZETA,
    width: 32,
    height: 32,
    format: "jpeg"
  }, // ZetaChain Testnet
  1: {
    url: TOKEN_LOGO_URLS.ETH,
    width: 32,
    height: 32,
    format: "png"
  }, // Ethereum Mainnet
  11155111: {
    url: TOKEN_LOGO_URLS.ETH,
    width: 32,
    height: 32,
    format: "png"
  }, // Ethereum Sepolia Testnet
  8453: {
    url: TOKEN_LOGO_URLS.BASE,
    width: 32,
    height: 32,
    format: "png"
  }, // Base Mainnet
  84532: {
    url: TOKEN_LOGO_URLS.BASE,
    width: 32,
    height: 32,
    format: "png"
  }, // Base Testnet
  137: {
    url: TOKEN_LOGO_URLS.POL,
    width: 32,
    height: 32,
    format: "png"
  }, // Polygon Mainnet
  80002: {
    url: TOKEN_LOGO_URLS.POL,
    width: 32,
    height: 32,
    format: "png"
  }, // Polygon Amoy Testnet
  56: {
    url: TOKEN_LOGO_URLS.BNB,
    width: 32,
    height: 32,
    format: "png"
  }, // BSC Mainnet
  97: {
    url: TOKEN_LOGO_URLS.BNB,
    width: 32,
    height: 32,
    format: "png"
  }, // BSC Testnet
  42161: {
    url: TOKEN_LOGO_URLS.ARB,
    width: 32,
    height: 32,
    format: "png"
  }, // Arbitrum Mainnet
  421613: {
    url: TOKEN_LOGO_URLS.ARB,
    width: 32,
    height: 32,
    format: "png"
  }, // Arbitrum Sepolia Testnet
  43114: {
    url: TOKEN_LOGO_URLS.AVAX,
    width: 32,
    height: 32,
    format: "png"
  }, // Avalanche Mainnet
  43113: {
    url: TOKEN_LOGO_URLS.AVAX,
    width: 32,
    height: 32,
    format: "png"
  }, // Avalanche Fuji Testnet
  900: {
    url: TOKEN_LOGO_URLS.SOL,
    width: 32,
    height: 32,
    format: "png"
  }, // Solana Mainnet;
}

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
const avalancheMainnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_AVALANCHE || "";
const avalancheFujiRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_AVALANCHE_FUJI || "";
const arbitrumMainnetRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ARBITRUM_ONE || "";
const arbitrumSepoliaRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ARBITRUM_SEPOLIA || "";

export const solanaRpcUrl = deployEnv == "testnet" ? process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT_DEVNET || "" : process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "";
export const crossChainTxUrl = deployEnv == "testnet" ? process.env.NEXT_PUBLIC_CROSSCHAIN_TX_API_TEST || "" : process.env.NEXT_PUBLIC_CROSSCHAIN_TX_API || "";

export enum CHAIN_ID {
  zetachain = deployEnv === 'testnet' ? 7001 : 7000,
  ethereum = deployEnv === 'testnet' ? 11155111 : 1,
  base = deployEnv === 'testnet' ? 84532 : 8453,
  polygon = deployEnv === 'testnet' ? 80001 : 137,
  bsc = deployEnv === 'testnet' ? 97 : 56,
  solana = deployEnv === 'testnet' ? 901 : 900,
  arbitrum = deployEnv === 'testnet' ? 421613 : 42161,
  avalanche = deployEnv === 'testnet' ? 43113 : 43114,
}

// Define ZetaChain configuration
const zetaChain = defineChain({
  chainId: CHAIN_ID.zetachain, // 7001 for testnet, 7000 for mainnet
  name: deployEnv === "testnet" ? "ZetaChain Testnet" : "ZetaChain",
  shortName: "zeta",
  chain: "ZetaChain",
  icon: CHAIN_ICONS[7000],
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

// Define Ethereum configuration
const ethereumChain = defineChain({
  chainId: CHAIN_ID.ethereum, // 11155111 for Sepolia Testnet, 1 for Ethereum Mainnet
  name: deployEnv === "testnet" ? "Sepolia Testnet" : "Ethereum",
  shortName: deployEnv === "testnet" ? "sepolia" : "eth",
  chain: "ETH",
  icon: CHAIN_ICONS[1],
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
  name: deployEnv === "testnet" ? "Base Sepolia Testnet" : "Base",
  shortName: "base",
  chain: "Base",
  icon: CHAIN_ICONS[84532],
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
  name: deployEnv === "testnet" ? "Polygon Mumbai Testnet" : "Polygon",
  shortName: "polygon",
  chain: "Polygon",
  icon: CHAIN_ICONS[137],
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
  name: deployEnv === "testnet" ? "BSC Testnet" : "BNB Smart Chain",
  shortName: "bsc",
  chain: "BSC",
  icon: CHAIN_ICONS[97],
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

const avalancheChain = defineChain({
  chainId: CHAIN_ID.avalanche, // 43114 for Avalanche Mainnet, 43113 for Fuji Testnet
  name: deployEnv === "testnet" ? "Avalanche Fuji Testnet" : "Avalanche",
  shortName: "avax",
  chain: "Avalanche",
  icon: CHAIN_ICONS[43114],
  rpc: [deployEnv === "testnet" ? avalancheFujiRpcUrl : avalancheMainnetRpcUrl],
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  explorers: [
    {
      name: "SnowTrace",
      url: deployEnv === "testnet"
        ? "https://testnet.snowtrace.io"
        : "https://snowtrace.io",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: "avalanche",
});

const arbitrumChain = defineChain({
  chainId: CHAIN_ID.arbitrum, // 42161 for Arbitrum One Mainnet, 421613 for Arbitrum Sepolia Testnet
  name: deployEnv === "testnet" ? "Arbitrum Sepolia Testnet" : "Arbitrum One",
  shortName: "arb",
  chain: "Arbitrum",
  icon: CHAIN_ICONS[42161],
  rpc: [deployEnv === "testnet" ? arbitrumSepoliaRpcUrl : arbitrumMainnetRpcUrl],
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  explorers: [
    {
      name: "Arbiscan",
      url: deployEnv === "testnet"
        ? "https://sepolia.arbiscan.io"
        : "https://arbiscan.io",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet",
  slug: "arbitrum",
});

// Define supported chains based on the deployment environment
export const SUPPORTED_CHAINS = deployEnv === "testnet"
  ? [zetaChain, ethereumChain, baseChain, polygonChain, bscChain, avalancheChain, arbitrumChain] // always put Zetachain first
  : [zetaChain, ethereumChain, baseChain, polygonChain, bscChain, avalancheChain, arbitrumChain]; // always put Zetachain first

export const chainConfigs = {
  [CHAIN_ID.zetachain]: zetaChain,
  [CHAIN_ID.ethereum]: ethereumChain,
  [CHAIN_ID.base]: baseChain,
  [CHAIN_ID.bsc]: bscChain,
  [CHAIN_ID.polygon]: polygonChain,
  [CHAIN_ID.solana]: solanaChain,
  [CHAIN_ID.arbitrum]: arbitrumChain,
  [CHAIN_ID.avalanche]: avalancheChain,
}



// Define approved tokens per chain
export const APPROVED_TOKENS: { [chainId: number]: Token[] } = {
  7001: [
    {
      symbol: "ZETA",
      address: "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ZETA,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "ETH.BASE",
      address: "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "ETH.ETH",
      address: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.ETH",
      address: "0xcC683A782f4B30c138787CB5576a86AF66fdc31d",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "POL.POL",
      address: "0x777915D031d1e8144c90D025C594b3b8Bf07a08d",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.POL,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "BNB.BSC",
      address: "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.BNB,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.BSC",
      address: "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.POL",
      address: "0xe573a6e11f8506620F123DBF930222163D46BCB6",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
  ],

  7000: [
    {
      symbol: "ZETA",
      address: "0x0000000000000000000000000000000000000001",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ZETA,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "ETH.ETH",
      address: "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.ETH",
      address: "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDT.ETH",
      address: "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    // {
    //   symbol: "DAI.ETH",
    //   address: "0xcC683A782f4B30c138787CB5576a86AF66fdc31d",
    //   decimals: 18,
    //   imgURL: "/DAI.png",
    //   price: 1,
    //   balance: EMPTY_BALANCE,
    //   isNative: false,
    // },
    {
      symbol: "ETH.BASE",
      address: "0x1de70f3e971B62A0707dA18100392af14f7fB677",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.BASE",
      address: "0x96152E6180E085FA57c7708e18AF8F05e37B479D",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "POL.POL",
      address: "0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.POL,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDT.POL",
      address: "0xdbfF6471a79E5374d771922F2194eccc42210B9F",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.POL",
      address: "0xfC9201f4116aE6b054722E10b98D904829b469c3",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "SOL.SOL",
      address: "0x4bC32034caCcc9B7e02536945eDbC286bACbA073",
      decimals: 9,
      imgURL: TOKEN_LOGO_URLS.SOL,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.SOL",
      address: "0x8344d6f84d26f998fa070BbEa6D2E15E359e2641",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDT.SOL",
      address: "0xEe9CC614D03e7Dbe994b514079f4914a605B4719",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.BSC",
      address: "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "BNB.BSC",
      address: "0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.BNB,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDT.BSC",
      address: "0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "BTC.BTC",
      address: "0x13A0c5930C028511Dc02665E7285134B6d11A5f4",
      decimals: 8,
      imgURL: TOKEN_LOGO_URLS.BTC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.ARB",
      address: "0x0327f0660525b15Cdb8f1f5FBF0dD7Cd5Ba182aD",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDT.ARB",
      address: "0x0ca762FA958194795320635c11fF0C45C6412958",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "ETH.ARB",
      address: "0xA614Aebf7924A3Eb4D066aDCA5595E4980407f1d",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDT.AVAX",
      address: "0x2Db395976CDb9eeFCc8920F4F2f0736f1D575794",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "AVAX.AVAX",
      address: "0xE8d7796535F1cd63F0fe8D631E68eACe6839869B",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.AVAX,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    {
      symbol: "USDC.AVAX",
      address: "0xa52Ad01A1d62b408fFe06C2467439251da61E4a9",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    }
  ],
  1: [
    {
      symbol: "ETH (ETH)",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891"],
    },
    {
      symbol: "USDC (ETH)",
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"],
    },
    {
      symbol: "USDT (ETH)",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7"],
    },
  ],
  11155111: [
    {
      symbol: "ETH (ETH)",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"],
    },
    {
      symbol: "USDC (ETH)",
      address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xcC683A782f4B30c138787CB5576a86AF66fdc31d"],
    },
  ],
  8453: [
    {
      symbol: "ETH (BASE)",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x1de70f3e971B62A0707dA18100392af14f7fB677"]
    },
    {
      symbol: "USDC (BASE)",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x96152E6180E085FA57c7708e18AF8F05e37B479D"],
    },
  ],
  84532: [
    {
      symbol: "ETH (BASE)",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 3904,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD"]
    },
  ],
  137: [
    {
      symbol: "POL",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.POL,
      price: 0.7159,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501"],
    },
    {
      symbol: "USDC (POL)",
      address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xfC9201f4116aE6b054722E10b98D904829b469c3"],
    },
    {
      symbol: "USDT (POL)",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xdbfF6471a79E5374d771922F2194eccc42210B9F"],
    },
  ],
  80002: [
    {
      symbol: "POL",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.POL,
      price: 0.7159,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x777915D031d1e8144c90D025C594b3b8Bf07a08d"],
    },
  ],
  56: [
    {
      symbol: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.BNB,
      price: 734,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb"],
    },
    {
      symbol: "USDC (BNB)",
      address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0"],
    },
    {
      symbol: "USDT (BNB)",
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F"],
    },
  ],
  97: [
    {
      symbol: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.BNB,
      price: 734,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891"],
    },
    {
      symbol: "USDC (BNB)",
      address: "0x64544969ed7EBf5f083679233325356EbE738930",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7"],
    },
  ],
  900: [
    {
      symbol: "SOL",
      address: "11111111111111111111111111111111",
      decimals: 9,
      imgURL: TOKEN_LOGO_URLS.SOL,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x4bC32034caCcc9B7e02536945eDbC286bACbA073"],
    },
    {
      symbol: "USDC (SOL)",
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x8344d6f84d26f998fa070BbEA6D2E15E359e2641"],
    },
    {
      symbol: "USDT (SOL)",
      address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xEe9CC614D03e7Dbe994b514079f4914a605B4719"],
    },
    {
      symbol: "CBBTC (SOL)",
      address: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
      decimals: 8,
      imgURL: TOKEN_LOGO_URLS.CBBTC,
      price: 97303,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x54Bf2B1E91FCb56853097BD2545750d218E245e1"]
    }
  ],
  42161: [
    {
      symbol: "ETH (ARB)",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.ETH,
      price: 734, // TODO - is this price field even being used?
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xA614Aebf7924A3Eb4D066aDCA5595E4980407f1d"],
    },
    {
      symbol: "USDC (ARB)",
      address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x0327f0660525b15Cdb8f1f5FBF0dD7Cd5Ba182aD"],
    },
    {
      symbol: "USDT (ARB)",
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x0ca762FA958194795320635c11fF0C45C6412958"],
    },
  ],
  43114: [
    {
      symbol: "AVAX",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      imgURL: TOKEN_LOGO_URLS.AVAX,
      price: 734, // TODO - is this price field even being used?
      balance: EMPTY_BALANCE,
      isNative: true,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xE8d7796535F1cd63F0fe8D631E68eACe6839869B"],
    },
    {
      symbol: "USDC (AVAX)",
      address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDC,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0xa52Ad01A1d62b408fFe06C2467439251da61E4a9"],
    },
    {
      symbol: "USDT (AVAX)",
      address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      decimals: 6,
      imgURL: TOKEN_LOGO_URLS.USDT,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
      ZRC20equivalent: ZRC20_TOKENS_BY_ADDRESS["0x2Db395976CDb9eeFCc8920F4F2f0736f1D575794"],
    },
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
  // Base tokens
  "ETH": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BNB": "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  "POL": "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472",
  "USDC": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "SOL": "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  "COMP": "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478",
  "AVAX": "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  "CRV": "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8",
  "CVX": "0x6aac625e125ada0d2a6b98316493256ca733a5808cd34ccef79b0e28c64d1e76",
  "OP": "0x385f64d993f7b77d8182ed5003d97c60aa3361f3cecfe711544d2d59165e9bdf",

  // Chain-specific tokens - using the "(CHAIN)" format
  "ETH (BASE)": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "USDC (BASE)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "ETH (ARB)": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "USDC (ARB)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT (ARB)": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "USDC (ETH)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT (ETH)": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "USDC (POL)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT (POL)": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "USDC (BNB)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT (BNB)": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "USDC (SOL)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT (SOL)": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  "USDC (AVAX)": "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT (AVAX)": "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b"

};

export const CHAINS_EXPLORER_BASE_URL_MAINNET: { [key: number]: string } = {
  [CHAIN_ID.zetachain]: "https://zetachain.blockscout.com",
  [CHAIN_ID.base]: "https://basescan.org",
  [CHAIN_ID.bsc]: "https://bscscan.com",
  [CHAIN_ID.polygon]: "https://polygonscan.com",
  [CHAIN_ID.ethereum]: "https://etherscan.io",
  [CHAIN_ID.solana]: "https://solscan.io",
  [CHAIN_ID.arbitrum]: "https://arbiscan.io",
  [CHAIN_ID.avalanche]: "https://snowtrace.io",
}

export const EVM_GATEWAY_ADDRESSES: Record<number, string> = {
  // EVM Chains with unique gateway
  43113: "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549", // Avalanche Testnet
  43114: "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549", // Avalanche Mainnet
  421613: "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549", // Arbitrum Testnet
  42161: "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549", // Arbitrum Mainnet

  // EVM Chains using the default gateway
  1: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Ethereum Mainnet
  11155111: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Ethereum Testnet
  8453: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Base Mainnet
  84532: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Base Testnet
  137: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Polygon Mainnet
  80001: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Polygon Testnet
  56: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // BNB Mainnet
  97: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // BNB Testnet

  // Solana
  900: "ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis", // Solana Mainnet
  901: "ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis", // Solana Testnet
};
