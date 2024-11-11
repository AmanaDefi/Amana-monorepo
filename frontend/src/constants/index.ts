import { VaultData } from "../types/types";
import { ZC_USDC_ETH_ADDRESS } from "../../../constants";
export const VAULT_DATA: VaultData[] = [
  {
    id: "0x3377E48A2D1C41977f718bEAff3f4b52763C90dd", // Amana Aave Vault on Zetachain testnet
    name: "AaveV3 ETH",
    symbol: "aAaveETH",
    inputToken: { // what is the input token here? If you're on ZC then it's ZC_ETH_BASE_SEPOLIA I think?
      symbol: "ETH",
      decimals: 18,
      address: ZC_USDC_ETH_ADDRESS,
      imgURL: "/USDC.png",
      price: 3040
    },
    protocol: {
      name: "Aave",
      network: "Athens",
      imgURL: "/aave.png"
    },
  },
];
