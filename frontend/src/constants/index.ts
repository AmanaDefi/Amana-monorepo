import { VaultData } from "../types/types";

export const OPTIMISM_USDC_CONTRACT_ADDRESS = "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85";
export const ARB_USDC_CONTRACT_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_USDT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
export const BASE_SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

export const ARB_AAVE_POOL_ADDRESS = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";
export const ARB_AAVE_RECEIPT_TOKEN_ADDRESS = "0x724dc807b04555b71ed48a6896b6F41593b8C637";
export const ARB_USDC_HOLDER_ADDRESS = "0xf89d7b9c864f589bbF53a82105107622B35EaA40"

export const BASE_AAVE_POOL_ADDRESS = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
export const BASE_AAVE_RECEIPT_TOKEN_ADDRESS = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB";
export const BASE_USDC_HOLDER_ADDRESS = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
export const BASE_USDT_HOLDER_ADDRESS = "0x0d5CF4Ff52A658000979C7901100817BD6cb72c6"

export const BASE_SEPOLIA_AAVE_POOL_ADDRESS = "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
export const BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS = "0xf53B60F4006cab2b3C4688ce41fD5362427A2A66";

export const MOONWELL_BASE_USDC_VAULT_ADDRESS = "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca";
export const COMPOUND_BASE_USDC_VAULT_ADDRESS = "0xb125E6687d4313864e53df431d5425969c15Eb2F";

export const ZC_USDC_ETH_ADDRESS = "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a";
export const ZC_USDT_ETH_ADDRESS = "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7";
export const ZC_EDDY_FOURPOOL_ADDRESS = "0x448028804461e8e5a8877c228F3adFd58c3Da6B6";
export const ZC_EDDY4P_ADDRESS = "0xf45DC12FDEcA77afF35602d7FBE3B97f7f3dCBB2";

export const ZC_USDC_HOLDER_ADDRESS = "0x56BF8D4a6E7b59D2C0E40Cba2409a4a30ab4FbE2";
export const ZC_USDT_HOLDER_ADDRESS = "0x22BA7b2bE3DAA5fACF4969558Bf5C3009c08C7F3";

export const ETH_BASESEPOLIA_ADDRESS = "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD";
export const BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS = "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f";
export const ETH_BASESEPOLIA_HOLDER_ADDRESS = "0xaFA6c18bFaF153a5AfedaC43D8795B56edd148c9"; // only holding 0.17 ETH
export const ZC_TEST_WETH_ADDRESS = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
export const ZC_TEST_WETH_HOLDER_ADDRESS = "0x19caCb4c0A7fC25598CC44564ED0eCA01249fc31"; // holding 9688 WETH

export const VAULT_DATA: VaultData[] = [
  {
    id: "0x916b2a7312783Cf1538f6aAcFa1850fD24De205d", // Amana Aave Vault on Base
    name: "AaveV3 USDC",
    symbol: "aAaveUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1
    },
    protocol: {
      name: "Aave",
      network: "Base",
      imgURL: "/aave.png"
    },
  },
  {
    id: "0xFa99a92B181a24bE8f6144620F55615639BcD53a", // Amana Moonwell Vault on Base
    name: "Moonwell Flagship USDC",
    symbol: "aMoonwellUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1
    },
    protocol: {
      name: "Moonwell",
      network: "Base",
      imgURL: "/Moonwell.jpg"
    },
  },
  {
    id: "0x9d4d38e8a68390643E436AdB7Af2e80b2f7536bc", // Amana Compound Vault on Base
    name: "Compound USDC",
    symbol: "aCompoundUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_USDC_ADDRESS,
      imgURL: "/USDC.png",
      price: 1
    },
    protocol: {
      name: "Compound",
      network: "Base",
      imgURL: "/compound.png"
    },
  },
    {
    id: "0x2951CeE73b27c2b1Ffd66A03b77eEdD79012d2BF", // Amana Eddy Vault on Zetachain
    name: "Eddy USDC",
    symbol: "aEddyUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: ZC_USDC_ETH_ADDRESS,
      imgURL: "/USDC.png",
      price: 1
    },
    protocol: {
      name: "Eddy",
      network: "Zetachain",
      imgURL: "/compound.png"
    },
  },
];
