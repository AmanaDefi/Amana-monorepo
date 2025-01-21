import { VaultData, Token } from "../types/types";
import { ZC_TEST_USDC_SEPOLIA_ADDRESS, ZC_POL_POL_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_USDC_BASE_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, ZC_ETH_BASE_ADDRESS, ZC_TEST_MATIC_AMOY_ADDRESS, ZC_TEST_USDC_BSC_ADDRESS } from "../../../constants";
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
    id: "0x23F2b3e3210EE357eDaBF477ABACd543d1BB12d6", // Base ETH Vault
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/base.png",
    inputToken: {
      symbol: "ETH.BASE",
      decimals: 18,
      address: ZC_ETH_BASE_ADDRESS,
      imgURL: "/ETH.png",
      price: 3040,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x776c40F8f041D47060f5ebC411bC1A7DBc2e4A3c",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0x2B0FD687c0EBF26D4e4F67f9b9Ab96cC5Fe69193", // Polygon POL Vault
    name: "AaveV3 POL",
    des: " This vault invests POL into a simple strategy which deposits the funds as collateral into an Aave POL pool, which earns interest every block.",
    symbol: "aAavePOL",
    imgURL: "/polygon_logo.png",
    inputToken: {
      symbol: "POL.POL",
      decimals: 18,
      address: ZC_POL_POL_ADDRESS,
      imgURL: "/polygon_logo.png",
      price: 0.5,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0xC1F7903C20C4Da3cf4699950218069b56E52CFE6",
      network: "Polygon",
      chainId: 137,
      netdes: "Polygon is a POS side chain to Ethereum.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0xD1dDA17156c212c77dEd4c30dC18B5Fd6453B369", // Euler USDC vault on Base
    name: "Euler USDC",
    des: " This vault invests USDC into a simple strategy which deposits the funds as collateral into a Euler USDC pool, which earns interest every block.",
    symbol: "aEulerUSDC",
    imgURL: "/base.png",
    inputToken: {
      symbol: "USDC.BASE",
      decimals: 6,
      address: ZC_USDC_BASE_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Euler",
      strategyAddress: "0xbB2965540047EC0d5eE2afc4059bc1A2dA7Db9B5",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/euler.svg",
      des: "Euler is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  // {
  //   id: "0x8FeFA57Ee5c1cd81fA78fc4C192D3cDcB08097D2",
  //   name: "Moonwell Flagship USDC",
  //   des: " This vault invests USDC into a strategy which deposits the funds into the Moonwell Flagship USDC vault.",
  //   symbol: "aMoonwellUSDC",
  //   imgURL: "/base.png",
  //   inputToken: {
  //     symbol: "USDC.BASE",
  //     decimals: 6,
  //     address: ZC_USDC_BASE_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Moonwell",
  //     strategyAddress: "0x62A80e460A0D7f5126F029997e6AaF7484A7Adb5",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //     imgURL: "/Moonwell.jpg",
  //     des: "Moonwell is a relatively new protocol."
  //   },
  // },
  {
    id: "0x9494f96f3Ea5D9430bcD51F1a732e73B5E87FE6D",
    name: "Moonwell Eth",
    des: " This vault invests ETH into a strategy which deposits the funds into the Moonwell Eth vault.",
    symbol: "aMoonwellEth",
    imgURL: "/base.png",
    inputToken: {
      symbol: "ETH.BASE",
      decimals: 18,
      address: ZC_ETH_BASE_ADDRESS,
      imgURL: "/ETH.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Moonwell",
      strategyAddress: "0x3710aa8BaCE60205EF1aCe36d87BDc17e7e66382",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/Moonwell.jpg",
      des: "Moonwell is a relatively new protocol."
    },
  },
  {
    id: "0xCf867eF209d76f3C66ed5eDCe8391f4A5660C3a5",
    name: "Compound USDC",
    des: " This vault invests USDC into a simple strategy which deposits the funds as collateral into a Compound USDC pool, which earns interest every block.",
    symbol: "aCompoundUSDC",
    imgURL: "/base.png",
    inputToken: {
      symbol: "USDC.BASE",
      decimals: 6,
      address: ZC_USDC_BASE_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Compound",
      strategyAddress: "0x30C850bB5b0e115990b13Bd750b8CAC2E39aA88e",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/compound.png",
      des: "Compound is one of the OG lending protocols."
    },
  },
  {
    id: "0x7CA437BfeAB2dAce82CFA6c48Da44B04D4cb6Bd4", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
    name: "Mock USDC",
    des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
    symbol: "aMockUSDC",
    imgURL: "/ZetaChain.jpeg",
    inputToken: {
      symbol: "USDC.ETH",
      decimals: 6,
      address: ZC_USDC_ETH_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Mock",
      strategyAddress: "0xC25efA995D7F274684A3D1Eedd4592D231145a0D",
      network: "Zetachain",
      chainId: 7000,
      netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
      imgURL: "/aave.png",
      des: "This is a mock strategy for testing purposes."
    },
  },
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
    id: "0xDE99D2a1a5e629DAF6A09d3A00568DD8acA1Ba96", // Base Sepolia ETH Vault
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/base.png",
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
      strategyAddress: "0xC058E93347162563f53893e1dF20e3cC017C85b3",
      chainId: 8453,
      network: "Base Sepolia",
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0xA4f9fe0E0d357E9B2Fd436F257046b0df6D88f4f", // Amana ETH Vault on Zetachain testnet, linked to Aave strategy on Eth Sepolia
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/Ethsepolia.png",
    inputToken: {
      symbol: "sETH",
      decimals: 18,
      address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
      imgURL: "/ETH.png",
      price: 3040,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x564bC0142813fDb8C5567C5c8A3d5Ecea729c7Dd",
      chainId: 11155111,
      network: "Eth Sepolia",
      netdes: "Eth Sepolia is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },

  {
    id: "0x71B51A2e70ed5584A2038BBcEB611dc5814A2A2B", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
    name: "Mock USDC",
    des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
    symbol: "aMockUSDC",
    inputToken: {
      symbol: "USDC.SEPOLIA",
      decimals: 6,
      address: ZC_TEST_USDC_SEPOLIA_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Mock",
      strategyAddress: "0x1d0dBa968A26c1D8834B600EDAF9182E0A71FFe4",
      network: "Zetachain Athens",
      chainId: 7001,
      netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
      imgURL: "/aave.png",
      des: "This is a mock strategy for testing purposes."
    },
  },

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
      strategyAddress: "0xEDf497Ba1e81976231c440AFA484065860e5cb69",
      chainId: 7001,
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
      strategyAddress: "0xEDf497Ba1e81976231c440AFA484065860e5cb69",
      chainId: 97,
      network: "BSC Testnet",
      netdes: "BSC testnet is the testnet for BNB Smart Chain - owned by Binance.",
      imgURL: "/bnb_logo.png",
      des: "This is a mock strategy for testing purposes."
    },
  },
];

// Export the appropriate vault data based on DEPLOY_ENV
export const VAULT_DATA = deployEnv === "testnet" ? TESTNET_VAULT_DATA : MAINNET_VAULT_DATA;
