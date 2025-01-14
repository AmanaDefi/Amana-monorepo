import { VaultData, Token } from "../types/types";
import { ZC_POL_POL_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_USDC_BASE_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, ZC_ETH_BASE_ADDRESS, ZC_TEST_MATIC_AMOY_ADDRESS, ZC_TEST_USDC_BSC_ADDRESS } from "../../../constants";
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
    id: "0x564bC0142813fDb8C5567C5c8A3d5Ecea729c7Dd", // Base ETH Vault
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
      strategyAddress: "0x19a7eF4fB6e8934dd4627F9e890a0747b628a0f0",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0x776c40F8f041D47060f5ebC411bC1A7DBc2e4A3c", // Polygon POL Vault
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
      strategyAddress: "0x7db6F565387de8DDc76C922b13B116fF361cddBF",
      network: "Polygon",
      chainId: 137,
      netdes: "Polygon is a POS side chain to Ethereum.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0x3319F4Cc386E4C2317a3ED9B460Edad6fBDf3a55",
    name: "Moonwell Flagship USDC",
    des: " This vault invests USDC into a strategy which deposits the funds into the Moonwell Flagship USDC vault.",
    symbol: "aMoonwellUSDC",
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
      name: "Moonwell",
      strategyAddress: "0x804615ef2d82eDCbc3794C880a4e3EFDb0b526e3",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/Moonwell.jpg",
      des: "Moonwell is a relatively new protocol."
    },
  },
  {
    id: "0xBF1A6cfD6edF6E6B944ea4b55aa77B5B21356014",
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
      strategyAddress: "0xB4490Fc6D83A7A87bf8B83E310147089C6a96E1F",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/Moonwell.jpg",
      des: "Moonwell is a relatively new protocol."
    },
  },
  {
    id: "0x5Feb6E013A6f1fd2135ccA330D875Fd0b4e6F2F5",
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
      strategyAddress: "0x74fCAd57C966cAB6fa02a0A5425b1c76DcaFe9A0",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/compound.png",
      des: "Compound is one of the OG lending protocols."
    },
  },
  {
    id: "0x48326BdEa7CAF701cEee64f08faE899e90c110A1", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
    name: "Mock USDC",
    des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
    symbol: "aMockUSDC",
    imgURL: "/ZetaChain.png",
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
      strategyAddress: "0xEDf497Ba1e81976231c440AFA484065860e5cb69",
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
    id: "0xE588Ed2AC6A3D0A1A4a5833fBb4b4A026834Da57", // Base Sepolia ETH Vault
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
