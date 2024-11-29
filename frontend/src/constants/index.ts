import { VaultData, Token } from "../types/types";
import { BASE_USDC_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../../constants";

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;

export const tokens: Token[] = [
  {
    symbol: "USDC",
    decimals: 6,
    address: BASE_USDC_ADDRESS,
    imgURL: "/USDC.png",
    price: 1
  },
  {
    symbol: "ETH.BASESEPOLIA",
    decimals: 18,
    address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: 3040
  },
  {
    symbol: "sETH.SEPOLIA",
    decimals: 18,
    address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: 3040
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
    id: "0x0AebE2977E81Da0A241A2c7359f8727BB3618437", // Amana ETH Vault on Zetachain testnet, targeting Aave strategy on Base Sepolia
    name: "AaveV3 ETH - Base Sepolia",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    inputToken: {
      symbol: "ETH",
      decimals: 18,
      address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      imgURL: "/USDC.png",
      price: 3040
    },
    protocol: {
      name: "Aave",
      network: "Base Sepolia",
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0xBF1A6cfD6edF6E6B944ea4b55aa77B5B21356014", // Amana ETH Vault on Zetachain testnet, targeting Aave strategy on Eth Sepolia
    name: "AaveV3 ETH - Eth Sepolia",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    inputToken: {
      symbol: "ETH",
      decimals: 18,
      address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
      imgURL: "/USDC.png",
      price: 3040
    },
    protocol: {
      name: "Aave",
      network: "Eth Sepolia",
      netdes: "Eth Sepolia is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
];

// Export the appropriate vault data based on DEPLOY_ENV
export const VAULT_DATA = deployEnv === "testnet" ? TESTNET_VAULT_DATA : MAINNET_VAULT_DATA;
