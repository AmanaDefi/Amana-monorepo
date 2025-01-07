import { VaultData, Token } from "../types/types";
import { BASE_USDC_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, ZC_ETH_BASE_ADDRESS, ZC_TEST_MATIC_AMOY_ADDRESS, ZC_TEST_USDC_BSC_ADDRESS } from "../../../constants";
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
    id: "0x36c7fEdE7556A07AE4f4a4165532f75aa21f2710", // Base ETH Vault
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/BathEthsepolia.png",
    inputToken: {
      symbol: "ETH",
      decimals: 18,
      address: ZC_ETH_BASE_ADDRESS,
      imgURL: "/ETH.png",
      price: 3040,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      network: "Base",
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0x3319F4Cc386E4C2317a3ED9B460Edad6fBDf3a55",
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
  // {
  //   id: "0x9d4d38e8a68390643E436AdB7Af2e80b2f7536bc",
  //   name: "Compound USDC",
  //   symbol: "aCompoundUSDC",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 6,
  //     address: BASE_USDC_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Compound",
  //     network: "Base",
  //     imgURL: "/compound.png",
  //   },
  // },
  // {
  //   id: "0x2951CeE73b27c2b1Ffd66A03b77eEdD79012d2BF",
  //   name: "Eddy USDC",
  //   symbol: "aEddyUSDC",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 6,
  //     address: ZC_USDC_ETH_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Eddy",
  //     network: "Zetachain",
  //     imgURL: "/compound.png",
  //   },
  // },
];

const TESTNET_VAULT_DATA: VaultData[] = [
  {
    id: "0xE588Ed2AC6A3D0A1A4a5833fBb4b4A026834Da57", // Base Sepolia ETH Vault
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
    id: "0xbEd4F3ccC116A20BA7697555F5eFFe03592c85cA", // Polygon Amoy POL Vault (POL is new name for MATIC)
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
    id: "0x126aAFD88E76099B0739d924cc0B2bF6Ec9274d3", // BSC USDC Vault
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
