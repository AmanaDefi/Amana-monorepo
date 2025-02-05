import { VaultData, Token } from "../types/types";
import { ZC_USDT_BSC_ADDRESS, ZC_TEST_USDC_SEPOLIA_ADDRESS, ZC_POL_POL_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_USDC_BASE_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, ZC_ETH_BASE_ADDRESS, ZC_TEST_MATIC_AMOY_ADDRESS, ZC_TEST_USDC_BSC_ADDRESS } from "../../../constants";
import { EMPTY_BALANCE } from "@/utils/helpers";

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
const ethPrice = 3400 // await fetchEthPrice();

export const tokens: Token[] = [
  {
    symbol: "ETH",
    decimals: 18,
    address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: ethPrice,
    balance: EMPTY_BALANCE,
    isNative: false
  },
  {
    symbol: "sETH",
    decimals: 18,
    address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: ethPrice,
    balance: EMPTY_BALANCE,
    isNative: false
  },
]

const MAINNET_VAULT_DATA: VaultData[] = [
  {
    id: "0x5Eb39f7c17643Ae6d41c96EFA995E46CdF362f5e", // Base ETH Vault
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/base.png",
    inputToken: {
      symbol: "ETH.BASE",
      decimals: 18,
      address: ZC_ETH_BASE_ADDRESS,
      imgURL: "/ETH.png",
      price: ethPrice,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x3D85ef74f5FA2c56b53CcC8c9a2a140363dE014E",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  // {
  //   id: "0x136c2f7E281a3807987Fc6441B410529c3feF0f5", // Base ZeroLend USDC Vault
  //   name: "ZeroLend USDC",
  //   des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into a ZeroLend USDC pool, which earns interest every block.",
  //   symbol: "aZeroLendUSDC",
  //   imgURL: "/base.png",
  //   inputToken: {
  //     symbol: "USDC.BASE",
  //     decimals: 18,
  //     address: ZC_USDC_BASE_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "ZeroLend",
  //     strategyAddress: "0x20E2dEa402722C9b09Fe35CD669A83902FA43831",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //     imgURL: "/ZeroLend.png",
  //     des: "ZeroLend is a relatively new protocol on Base."
  //   },
  // },
  // {
  //   id: "0x2B0FD687c0EBF26D4e4F67f9b9Ab96cC5Fe69193", // Polygon POL Vault
  //   name: "AaveV3 POL",
  //   des: " This vault invests POL into a simple strategy which deposits the funds as collateral into an Aave POL pool, which earns interest every block.",
  //   symbol: "aAavePOL",
  //   imgURL: "/polygon_logo.png",
  //   inputToken: {
  //     symbol: "POL.POL",
  //     decimals: 18,
  //     address: ZC_POL_POL_ADDRESS,
  //     imgURL: "/polygon_logo.png",
  //     price: 0.5,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Aave",
  //     strategyAddress: "0xC1F7903C20C4Da3cf4699950218069b56E52CFE6",
  //     network: "Polygon",
  //     chainId: 137,
  //     netdes: "Polygon is a POS side chain to Ethereum.",
  //     imgURL: "/aave.png",
  //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //   },
  // },
  {
    id: "0xdf4B4D9127eb034448B5147b9790E9DAa13D8958", // Euler USDC vault on Base
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
      strategyAddress: "0x47D85aEE441BfA3fcf3924A2CB7F4ef3eDE54324",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/euler.svg",
      des: "Euler is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  // {
  //   id: "0xC967154127af55cecC47328B06385EFd8f8C427E",
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
  //     strategyAddress: "0x912864B5F00F9391Dc78E86C8b186455BB4C626c",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //     imgURL: "/Moonwell.jpg",
  //     des: "Moonwell is a relatively new protocol."
  //   },
  // },
  // {
  //   id: "0xBc1BAF5a96E8302c5469B0D3A8D5AD3aAccCAE7b",
  //   name: "Moonwell Eth",
  //   des: " This vault invests ETH into a strategy which deposits the funds into the Moonwell Eth vault.",
  //   symbol: "aMoonwellEth",
  //   imgURL: "/base.png",
  //   inputToken: {
  //     symbol: "ETH.BASE",
  //     decimals: 18,
  //     address: ZC_ETH_BASE_ADDRESS,
  //     imgURL: "/ETH.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Moonwell",
  //     strategyAddress: "0x405F526e5F05E7a41836Ba6B6EafFaaAB9454880",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //     imgURL: "/Moonwell.jpg",
  //     des: "Moonwell is a relatively new protocol."
  //   },
  // },
  {
    id: "0x6208951B0f419b09F3162B9B56881b129Dc0aCE3",
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
      strategyAddress: "0x6e205E0153512Ac766bB4e4eC78AEc39DF70083d",
      network: "Base",
      chainId: 8453,
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/compound.png",
      des: "Compound is one of the OG lending protocols."
    },
  },
  {
    id: "0xd042474ef4eAF7b8D79F0F97da06D9E22Ba79CbA", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
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
      strategyAddress: "0xa5793546dc17e00Dde5241E3fB179247f1C11cc0",
      network: "Zetachain",
      chainId: 7000,
      netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
      imgURL: "/aave.png",
      des: "This is a mock strategy for testing purposes."
    },
  },
  // {
  //   id: "0x3BF3BB802eFc297669475aD50434Ff0905e79990", // Aave USDT on BNB
  //   name: "Aave USDT",
  //   des: " This vault invests USDT into Aave on BNB.",
  //   symbol: "aAaveUSDT",
  //   imgURL: "/bnb_logo.png",
  //   inputToken: {
  //     symbol: "USDT.BNB",
  //     decimals: 18,
  //     address: ZC_USDT_BSC_ADDRESS,
  //     imgURL: "/usdt.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Aave",
  //     strategyAddress: "0x199C08dA32C49FeEbdC9A752Cef16726065Fe861",
  //     network: "BNB",
  //     chainId: 56,
  //     netdes: "Binance Smart Chain has been around for a while.",
  //     imgURL: "/aave.png",
  //     des: "This is an Aave USDT strategy."
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
    id: "0x237B655eB18823C78042Da4CB366BA8093efDe04", // Base Sepolia ETH Vault
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/base.png",
    inputToken: {
      symbol: "ETH",
      decimals: 18,
      address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      imgURL: "/ETH.png",
      price: ethPrice,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x48326BdEa7CAF701cEee64f08faE899e90c110A1",
      chainId: 84532,
      network: "Base Sepolia",
      netdes: "Base is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  {
    id: "0xFAcD05d51ef312F3A23d5480376750c6f4c1c192", // Aave strategy on Eth Sepolia
    name: "AaveV3 ETH",
    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/Ethsepolia.png",
    inputToken: {
      symbol: "sETH",
      decimals: 18,
      address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
      imgURL: "/ETH.png",
      price: ethPrice,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x1aea20C27c3b0f34172aC416419994d39512887A",
      chainId: 11155111,
      network: "Eth Sepolia",
      netdes: "Eth Sepolia is a relatively new chain, backed by Coinbase and built on the OP stack.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },

  {
    id: "0xf18635c0e127Ac010dd484ba2EA123D8bc58a7E7", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
    name: "Mock USDC",
    des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
    symbol: "aMockUSDC",
    imgURL: "/ZetaChain.jpeg",
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
  // {
  //   id: "0x7a351114F9C2637da09f177b62A3f8736dfAa130", // Polygon Amoy POL Vault (POL is new name for MATIC)
  //   name: "Mock POL",
  //   des: " This vault invests POL (MATIC) into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
  //   symbol: "aMockPOL",
  //   imgURL: "/polygon_logo.png",
  //   inputToken: {
  //     symbol: "MATIC.AMOY",
  //     decimals: 18,
  //     address: ZC_TEST_MATIC_AMOY_ADDRESS,
  //     imgURL: "/polygon_logo.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     strategyAddress: "0x8AD0bD606B1820bb2a4e569EFC48501c5e0735E6",
  //     chainId: 80002,
  //     network: "Polygon Amoy",
  //     netdes: "Polygon is an Ethereum POS side-chain, that has been around for a while.",
  //     imgURL: "/polygon_logo.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },
  // {
  //   id: "0xc01f344A7eAd2D06A196D1b2aC93be78A16bD876", // BSC USDC Vault
  //   name: "Mock USDC",
  //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
  //   symbol: "aMockUSDC",
  //   imgURL: "/bscnet.jpg",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 18,
  //     address: ZC_TEST_USDC_BSC_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     strategyAddress: "0x99aDf091C5d6ad042F763018C3e43D622a22Cc24",
  //     chainId: 97,
  //     network: "BSC Testnet",
  //     netdes: "BSC testnet is the testnet for BNB Smart Chain - owned by Binance.",
  //     imgURL: "/bnb_logo.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },
];

// Export the appropriate vault data based on DEPLOY_ENV
export const VAULT_DATA = deployEnv === "testnet" ? TESTNET_VAULT_DATA : MAINNET_VAULT_DATA;

export const USER_SETTINGS_LOCAL_STORAGE_KEY = 'user_settings';
