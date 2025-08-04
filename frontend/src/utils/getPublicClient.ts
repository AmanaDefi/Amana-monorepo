import { chainsWithCustomRpcs, customZetachain } from "@/constants/chainConfig";
import { ConnectedWallet } from "@privy-io/react-auth";
import {
  createPublicClient,
  PublicClient,
  WalletClient,
  createWalletClient,
  custom,
  http,
} from "viem";

const walletClientCache = new Map<string, WalletClient>();

export const getPublicClient = (activeChainId?: number) => {
  const chain =
    chainsWithCustomRpcs().find(
      (chain) => chain.id === Number(activeChainId),
    ) ?? customZetachain;

  if (typeof window !== 'undefined' && (window as any).DEBUG_BITCOIN) {
    console.log('[getPublicClient] Called with activeChainId:', activeChainId);
    console.log('[getPublicClient] Resolved chain:', chain);
    console.log('[getPublicClient] All available chains:', chainsWithCustomRpcs().map(c => c.id));
  }

  return createPublicClient({
    chain: chain,
    transport: http(chain.rpcUrls.default.http[0]),
  }) as PublicClient;
};

export const getWalletClient = async (
  wallet: ConnectedWallet,
): Promise<WalletClient | null> => {
  if (walletClientCache.has(wallet?.chainId?.split(":")[1])) {
    return walletClientCache.get(wallet?.chainId?.split(":")[1])!;
  }

  const chainIdStr = wallet?.chainId?.split(":")[1];
  const chain = chainsWithCustomRpcs().find(
    (c) => c.id.toString() === chainIdStr,
  );
  if (!chain) {
    console.error(
      `[getWalletClient] Chain with id:${chainIdStr} doesn't supported.`,
      { wallet, chainIdStr, availableChains: chainsWithCustomRpcs().map(c => c.id) }
    );
    return null;
  }

  const provider = await wallet?.getEthereumProvider();
  provider.rpcTimeoutDuration = 60 * 1000 * 10;

  const walletClient = createWalletClient({
    account: wallet.address,
    chain: chain,
    transport: custom(provider),
  });

  walletClientCache.set(chainIdStr, walletClient);

  return walletClient;
};
