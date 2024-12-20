import { VaultData, Token } from "../types/types";
import { BASE_USDC_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, ZC_TEST_USDC_SEPOLIA_ADDRESS, ZC_TEST_MATIC_AMOY_ADDRESS, ZC_TEST_USDC_BSC_ADDRESS } from "../../../constants";
import { EMPTY_BALANCE } from "@/utils/helpers";

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;

export const tokens: Token[] = [
  {
    symbol: "ETH",
    decimals: 18,
    address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: 3040,
    balance: EMPTY_BALANCE,
    isNative: false
  },
  {
    symbol: "sETH",
    decimals: 18,
    address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: 3040,
    balance: EMPTY_BALANCE,
    isNative: false
  },
]

const MAINNET_VAULT_DATA: VaultData[] = [
  {
    id: "0x916b2a7312783Cf1538f6aAcFa1850fD24De205d",
    name: "AaveV3 USDC",
    symbol: "aAaveUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      network: "Base",
      imgURL: "/aave.png",
    },
  },
  {
    id: "0xFa99a92B181a24bE8f6144620F55615639BcD53a",
    name: "Moonwell Flagship USDC",
    symbol: "aMoonwellUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Moonwell",
      network: "Base",
      imgURL: "/Moonwell.jpg",
    },
  },
  {
    id: "0x9d4d38e8a68390643E436AdB7Af2e80b2f7536bc",
    name: "Compound USDC",
    symbol: "aCompoundUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Compound",
      network: "Base",
      imgURL: "/compound.png",
    },
  },
  {
    id: "0x2951CeE73b27c2b1Ffd66A03b77eEdD79012d2BF",
    name: "Eddy USDC",
    symbol: "aEddyUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: ZC_USDC_ETH_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Eddy",
      network: "Zetachain",
      imgURL: "/compound.png",
    },
  },
];

const TESTNET_VAULT_DATA: VaultData[] = [
  {
    id: "0x4384186eeB29ADe667fFAD9F968de7ec14f37A46", // Base Sepolia ETH Vault
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/BathEthsepolia.png",
    inputToken: {
      symbol: "ETH",
      decimals: 18,
      address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      imgURL: "/ETH.png",
      price: 3040,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      network: "Base Sepolia",
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  // {
  //   id: "0x15851cebC80a383d957f81E91bd51799C0b8736D", // Amana ETH Vault on Zetachain testnet, linked to Aave strategy on Eth Sepolia
  //   name: "AaveV3 ETH",
  //   des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
  //   symbol: "aAaveETH",
  //   imgURL: "/Ethsepolia.png",
  //   inputToken: {
  //     symbol: "sETH",
  //     decimals: 18,
  //     address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
  //     imgURL: "/ETH.png",
  //     price: 3040,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Aave",
  //     network: "Eth Sepolia",
  //     netdes: "Eth Sepolia is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //     imgURL: "/aave.png",
  //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //   },
  // },

  // {
  //   id: "0x75e2224CA5E8f404eC82AC8a104449e6B22d338C", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
  //   name: "Mock USDC",
  //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
  //   symbol: "aMockUSDC",
  //   inputToken: {
  //     symbol: "USDC.SEPOLIA",
  //     decimals: 6,
  //     address: ZC_TEST_USDC_SEPOLIA_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     network: "Zetachain Athens",
  //     netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
  //     imgURL: "/aave.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },

  {
    id: "0xb133Ce90120CF4f1cF27389F4E30553fBe71909A", // Polygon Amoy POL Vault (POL is new name for MATIC)
    name: "Mock POL",
    des: " This vault invests POL (MATIC) into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
    symbol: "aMockPOL",
    imgURL: "/polygon_logo.png",
    inputToken: {
      symbol: "MATIC.AMOY",
      decimals: 18,
      address: ZC_TEST_MATIC_AMOY_ADDRESS,
      imgURL: "/polygon_logo.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Mock",
      network: "Polygon Amoy",
      netdes: "Polygon is an Ethereum POS side-chain, that has been around for a while.",
      imgURL: "/polygon_logo.png",
      des: "This is a mock strategy for testing purposes."
    },
  },
  {
    id: "0xbf3BaB9e54090C46786Ad90BEB90D40175bFF396", // BSC USDC Vault
    name: "Mock USDC",
    des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
    symbol: "aMockUSDC",
    imgURL: "/bscnet.jpg",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: ZC_TEST_USDC_BSC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Mock",
      network: "BSC Testnet",
      netdes: "BSC testnet is the testnet for BNB Smart Chain - owned by Binance.",
      imgURL: "/bnb_logo.png",
      des: "This is a mock strategy for testing purposes."
    },
  },
];

// Export the appropriate vault data based on DEPLOY_ENV
export const VAULT_DATA = deployEnv === "testnet" ? TESTNET_VAULT_DATA : MAINNET_VAULT_DATA;
