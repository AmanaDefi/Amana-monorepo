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

  return createPublicClient({
    chain: chain,
    transport: http(chain.rpcUrls.default.http[0]),
  }) as PublicClient;
};

export const getWalletClient = async (
  wallet: ConnectedWallet,
): Promise<WalletClient | null> => {
  if (wallet?.walletClientType === "wagmi") {
    if (typeof window !== "undefined" && window.ethereum) {
      const chainId = wallet.chainId?.split(":")[1] || "1";

      const chain = chainsWithCustomRpcs().find(
        (c) => c.id.toString() === chainId,
      );

      if (!chain) {
        console.log(`Chain with id:${chainId} doesn't supported`);
        return null;
      }

      return createWalletClient({
        account: wallet.address,
        chain: chain,
        transport: custom((window as any).ethereum),
      });
    }
    return null;
  }

  if (walletClientCache.has(wallet?.chainId?.split(":")[1])) {
    return walletClientCache.get(wallet?.chainId?.split(":")[1])!;
  }

  const chain = chainsWithCustomRpcs().find(
    (c) => c.id.toString() === wallet?.chainId?.split(":")[1],
  );
  if (!chain) {
    console.log(
      `Chain with id:${wallet?.chainId?.split(":")[1]} doesn't supported`,
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

  walletClientCache.set(wallet?.chainId?.split(":")[1], walletClient);

  return walletClient;
};
