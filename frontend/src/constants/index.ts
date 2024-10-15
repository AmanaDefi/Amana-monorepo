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

export const VAULT_DATA: VaultData[] = [
  {
    id: "0x916b2a7312783Cf1538f6aAcFa1850fD24De205d", // Upgradeable Amana Aave Vault on Base
    name: "AaveV3 USDC",
    symbol: "aAaveUSDC",
    inputToken: {
      symbol: "USDC",
      decimals: 6,
      address: BASE_SEPOLIA_USDC_ADDRESS,
    },
    protocol: {
      name: "Aave",
      network: "Base",
    },
  },
  // {
  //   id: "0xFa99a92B181a24bE8f6144620F55615639BcD53a", // Upgradeable Amana Moonwell Vault on Base
  //   name: "Moonwell Flagship USDC",
  //   symbol: "aMoonwellUSDC",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 6,
  //     address: BASE_USDC_ADDRESS,
  //   },
  //   protocol: {
  //     name: "Moonwell",
  //     network: "Base",
  //   },
  // },
  // {
  //   id: "0x9d4d38e8a68390643E436AdB7Af2e80b2f7536bc", // Upgradeable Amana Compound Vault on Base
  //   name: "Compound USDC",
  //   symbol: "aCompoundUSDC",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 6,
  //     address: BASE_USDC_ADDRESS,
  //   },
  //   protocol: {
  //     name: "Compound",
  //     network: "Base",
  //   },
  // },
];
