import { inAppWallet, createWallet } from "thirdweb/wallets";
// import { ACCOUNT_ABSTRACTION_CONFIG } from "@/constants/chainConfig";

export const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email", "passkey"],
    },
    //smartAccount: ACCOUNT_ABSTRACTION_CONFIG,
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("com.ledger"),
];
