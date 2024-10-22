import { defineChain } from "thirdweb";
// import * as dotenv from "dotenv";

// dotenv.config();

const rpc_url = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA || "";
console.log("rpc_url1", rpc_url);

export const CURRENT_CHAIN = defineChain({
  chainId: 7000, // ZetaChain's chain ID
  name: "ZetaChain Mainnet", // Full name of the chain
  shortName: "zeta", // Short name for the chain
  chain: "ZetaChain", // A string representing the chain
  rpc: [rpc_url], // RPC should be an array of strings
  nativeCurrency: {
    name: "Zeta", // Name of the native currency
    symbol: "ZETA", // Symbol for the currency (e.g., ETH, ZETA)
    decimals: 18, // Number of decimals
  },
  explorers: [
    {
      name: "Zeta Explorer",
      url: "https://explorer.zetachain.com",
      standard: "EIP3091",
    },
  ],
  testnet: false, // Set this to false since it's the mainnet
  slug: "zetachain", // A URL-friendly identifier
});

export const ACCOUNT_ABSTRACTION_CONFIG = {
  chain: CURRENT_CHAIN,
  sponsorGas: true,
  factoryAddress: "0x021A47c1F745cEaC5CD19DC92C5d117e84b1cD46"
};
