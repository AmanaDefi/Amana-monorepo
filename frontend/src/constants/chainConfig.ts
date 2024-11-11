import { defineChain } from "thirdweb";

// Load environment variables
const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV || "mainnet"; // default to mainnet if not set

// Select RPC URL based on the environment
const rpcUrl =
  deployEnv === "testnet"
    ? process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA_TESTNET || ""
    : process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ZETA || "";

console.log("Deploy Environment:", deployEnv);
console.log("RPC URL:", rpcUrl);

// Define chain configuration based on environment
export const CURRENT_CHAIN = defineChain({
  chainId: deployEnv === "testnet" ? 7001 : 7000, // Use 7001 for testnet, 7000 for mainnet
  name: deployEnv === "testnet" ? "ZetaChain Testnet" : "ZetaChain Mainnet",
  shortName: "zeta",
  chain: "ZetaChain",
  rpc: [rpcUrl], // RPC should be an array of strings
  nativeCurrency: {
    name: "Zeta",
    symbol: "ZETA",
    decimals: 18,
  },
  explorers: [
    {
      name: "Zeta Explorer",
      url: deployEnv === "testnet" ? "https://testnet.explorer.zetachain.com" : "https://explorer.zetachain.com",
      standard: "EIP3091",
    },
  ],
  testnet: deployEnv === "testnet", // Set to true if testnet
  slug: "zetachain",
});

export const ACCOUNT_ABSTRACTION_CONFIG = {
  chain: CURRENT_CHAIN,
  sponsorGas: false,
  factoryAddress: "0x021A47c1F745cEaC5CD19DC92C5d117e84b1cD46",
};
