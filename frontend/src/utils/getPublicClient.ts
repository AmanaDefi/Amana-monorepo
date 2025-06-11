import {
  createPublicClient,
  http,
  PublicClient,
  WalletClient,
  createWalletClient,
  custom,
} from "viem";
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  zetachain,
  zetachainAthensTestnet,
} from "viem/chains";
import type { Chain } from "viem/chains";

const clientCache = new Map<number, PublicClient>();
const walletClientCache = new Map<number, WalletClient>();

const supportedChains: Chain[] = [
  mainnet,
  sepolia,
  base,
  baseSepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  bsc,
  bscTestnet,
  avalanche,
  avalancheFuji,
  zetachain,
  zetachainAthensTestnet,
];

export const getRpcUrl = (chain: Chain): string => {
  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (alchemyApiKey) {
    const alchemyUrl = chain.rpcUrls.alchemy?.http[0];
    if (alchemyUrl) {
      return `${alchemyUrl}/${alchemyApiKey}`;
    }
  }
  return chain.rpcUrls.default.http[0];
};

export const getPublicClient = (chainId: number): PublicClient | null => {
  if (clientCache.has(chainId)) {
    return clientCache.get(chainId)!;
  }

  const chain = supportedChains.find((c) => c.id === chainId);
  if (!chain) {
    console.error(`Chain with id:${chainId} doesn't supported`);
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

export const getWalletClient = (chainId: number): WalletClient | null => {
  if (walletClientCache.has(chainId)) {
    return walletClientCache.get(chainId)!;
  }

  const chain = supportedChains.find((c) => c.id === chainId);
  if (!chain) {
    console.error(`Chain with id:${chainId} doesn't supported`);
    return null;
  }

  const client = createWalletClient({
    chain: chain,
    transport: custom(window.ethereum!),
  });

  walletClientCache.set(chainId, client);

  return client;
};
