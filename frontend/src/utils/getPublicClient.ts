import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import {
  createPublicClient,
  http,
  PublicClient,
  WalletClient,
  createWalletClient,
  custom,
  EIP1193Provider,
} from "viem";

import type { Chain } from "viem/chains";
import { alchemyApiKey } from "../../alchemyConfig";
import { Connector } from "wagmi";

const clientCache = new Map<number, PublicClient>();
const walletClientCache = new Map<number, WalletClient>();

export const getRpcUrl = (chain: Chain): string => {
  if (alchemyApiKey) {
    const alchemyUrl = chain.rpcUrls.alchemy?.http[0];
    if (alchemyUrl) {
      return `${alchemyUrl}/${alchemyApiKey}`;
    }
  }
  return chain.rpcUrls.default.http[0];
};

export const getPublicClient = (chainId: number): PublicClient | null => {
  // if (clientCache.has(chainId)) {
  //   return clientCache.get(chainId)!;
  // }

  const chain = SUPPORTED_CHAINS.find((c) => c.chain.id === chainId)?.chain;
  if (!chain) {
    console.log(`Chain with id:${chainId} doesn't supported`);
    return null;
  }

  const client = createPublicClient({
    chain: chain,
    transport: http(getRpcUrl(chain)),
    batch: {
      multicall: true,
    },
  });

  clientCache.set(chainId, client);


  return client;
};

export const getWalletClient = async (chainId: number, connector?: Connector | null): Promise<WalletClient | null> => {
  if (walletClientCache.has(chainId)) {
    return walletClientCache.get(chainId)!;
  }

  const chain = SUPPORTED_CHAINS.find((c) => c.chain.id === chainId)?.chain;
  if (!chain) {
    console.log(`Chain with id:${chainId} doesn't supported`);
    return null;
  }
  if (!window || !window?.ethereum || window.ethereum === undefined || !connector) {
    console.log(`There is no wallet providers`);
    return null;
  }
  const providerInstance = await connector.getProvider() as EIP1193Provider;

  const client = createWalletClient({
    chain: chain,
    transport: custom(providerInstance),
  });

  walletClientCache.set(chainId, client);

  return client;
};
