import { VaultData } from "../types/types";
import { BASE_USDC_ADDRESS, ZC_USDC_ETH_ADDRESS } from "../../../constants";
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
