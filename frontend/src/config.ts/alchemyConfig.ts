import {
    AlchemyAccountsUIConfig,
    cookieStorage,
    createConfig,
  } from '@account-kit/react';
  import { alchemy, base, } from '@account-kit/infra';
  
  const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const walletConnecProjecttId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
  
  if (!apiKey) throw new Error('Invalid API KEY');
  if (!walletConnecProjecttId) throw new Error('Invalid WalletConnect Id');
  
  const uiConfig: AlchemyAccountsUIConfig = {
    illustrationStyle: 'outline',
    auth: {
      sections: [
        [{ type: 'email' }],
        [
          {
            type: 'external_wallets',
            walletConnect: { projectId: walletConnecProjecttId },
          },
        ],
      ],
      addPasskeyOnSignup: false,
    },
  };
  
  export const alchemyConfig = createConfig(
    {
      transport: alchemy({ apiKey }),
      chain: base,
      ssr: true,
      storage: cookieStorage,
      enablePopupOauth: true,
    },
    uiConfig
  );
  