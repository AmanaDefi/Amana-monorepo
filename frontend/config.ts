import {
    AlchemyAccountsUIConfig,
    cookieStorage,
    createConfig,
  } from "@account-kit/react";
  import { alchemy, arbitrumSepolia } from "@account-kit/infra";
  import { QueryClient } from "@tanstack/react-query";
  
  const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!API_KEY) {
    throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not set");
  }
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
    if (!walletConnectProjectId) throw new Error("Invalid WalletConnect Id");
  
  const uiConfig: AlchemyAccountsUIConfig = {
    illustrationStyle: "outline",
    auth: {
      sections: [
        [{ type: "email" }],
        [
          { type: "passkey" },
          { type: "social", authProviderId: "google", mode: "popup" },
          { type: "social", authProviderId: "facebook", mode: "popup" },
        ],
        [
          {
            type: "external_wallets",
            walletConnect: { projectId: walletConnectProjectId },
          },
        ],
      ],
      addPasskeyOnSignup: false,
    },
  };
  
  export const config = createConfig(
    {
      transport: alchemy({ apiKey: API_KEY }),
      chain: arbitrumSepolia,
      ssr: true, // more about ssr: https://www.alchemy.com/docs/wallets/react/ssr
      storage: cookieStorage, // more about persisting state with cookies: https://www.alchemy.com/docs/wallets/react/ssr#persisting-the-account-state
      enablePopupOauth: true, // must be set to "true" if you plan on using popup rather than redirect in the social login flow
    },
    uiConfig
  );
  
  export const queryClient = new QueryClient();
  