import {
  AlchemyAccountsUIConfig,
  cookieStorage,
  createConfig,
} from "@account-kit/react";
import {
  alchemy,
  mainnet,
  sepolia,
  base,
  baseSepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  defineAlchemyChain,
} from "@account-kit/infra";
import {
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  zetachain,
  zetachainAthensTestnet,
} from "viem/chains";
import {
  avalancheFujiRpcUrl,
  avalancheMainnetRpcUrl,
  bscMainnetRpcUrl,
  bscTestnetRpcUrl,
  zetaRpcUrl,
} from "@/constants/chainConfig";
import { QueryClient } from "@tanstack/react-query";

const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

if (!apiKey) throw new Error("Invalid API KEY");
if (!walletConnectProjectId) throw new Error("Invalid WalletConnect Id");

const uiConfig: AlchemyAccountsUIConfig = {
  illustrationStyle: "filled",
  auth: {
    sections: [
      [{ type: "email" }],
      [
        { type: "passkey" },
        { type: "social", authProviderId: "google", mode: "popup" },
      ],
      // [
      //   {
      //     type: "external_wallets",
      //     walletConnect: { projectId: walletConnectProjectId },
      //   },
      // ],
    ],
    addPasskeyOnSignup: true,
  },
};

// const bscChain = defineAlchemyChain({
//   chain: bsc,
//   rpcBaseUrl: bscMainnetRpcUrl,
// });
// const bscTestnetChain = defineAlchemyChain({
//   chain: bscTestnet,
//   rpcBaseUrl: bscTestnetRpcUrl,
// });
// const avalancheChain = defineAlchemyChain({
//   chain: avalanche,
//   rpcBaseUrl: avalancheMainnetRpcUrl,
// });
// const avalancheFujiChain = defineAlchemyChain({
//   chain: avalancheFuji,
//   rpcBaseUrl: avalancheFujiRpcUrl,
// });
// const zetachainChain = defineAlchemyChain({
//   chain: zetachain,
//   rpcBaseUrl: zetaRpcUrl,
// });
// const zetachainAthensTestnetChain = defineAlchemyChain({
//   chain: zetachainAthensTestnet,
//   rpcBaseUrl: zetaRpcUrl,
// });

export const alchemyConfig = createConfig(
  {
    transport: alchemy({ apiKey }),
    chain: mainnet,
    chains: [
      {
        chain: mainnet,
      },
      // {
      //   chain: sepolia,
      // },
      // {
      //   chain: base,
      // },
      // {
      //   chain: baseSepolia,
      // },
      // {
      //   chain: polygon,
      // },
      // {
      //   chain: polygonAmoy,
      // },
      // {
      //   chain: bscChain,
      // },
      // {
      //   chain: bscTestnetChain,
      // },
      // {
      //   chain: avalancheChain,
      // },
      // {
      //   chain: avalancheFujiChain,
      // },
      // {
      //   chain: arbitrum,
      // },
      // {
      //   chain: arbitrumSepolia,
      // },
      // {
      //   chain: zetachainChain,
      // },
      // {
      //   chain: zetachainAthensTestnetChain,
      // },
    ],
    ssr: false,
    storage: cookieStorage,
    enablePopupOauth: true,
  },
  uiConfig,
);

export const queryClient = new QueryClient();
