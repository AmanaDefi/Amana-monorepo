import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { ConnectedWallet } from "@privy-io/react-auth";
import {
  createPublicClient,
  PublicClient,
  WalletClient,
  createWalletClient,
  custom,
  http,
  Chain,
} from "viem";
import { zetachain } from "viem/chains";

const clientCache = new Map<string, PublicClient>();
const walletClientCache = new Map<string, WalletClient>();

export const getPublicClient = async (
  wallet?: ConnectedWallet,
  activeChainId?: number,
): Promise<PublicClient | null> => {
  // if (clientCache.has(wallet?.chainId?.split(":")[1] ?? "7000")) {
  //   return clientCache.get(wallet?.chainId?.split(":")[1] ?? "7000")!;
  // }
  console.log(activeChainId);

  const chain =
    SUPPORTED_CHAINS.find(
      (chain) =>
        chain.id ===
        Number(activeChainId ?? wallet?.chainId?.split(":")[1] ?? 7000),
    ) ?? zetachain;

  if (!wallet || !!activeChainId) {
    return createPublicClient({
      chain: chain,
      transport: http(chain.rpcUrls.default.http[0]),
    }) as PublicClient;
  }

  const provider = await wallet?.getEthereumProvider();

  if (!chain || !provider) {
    console.log(
      `Chain with id:${wallet?.chainId?.split(":")[1]} doesn't supported`,
    );
    return null;
  }

  const client = createPublicClient({
    chain: chain,
    transport: custom(provider),
  }) as PublicClient;

  clientCache.set(wallet?.chainId?.split(":")[1], client);

  return client;
};

export const getWalletClient = async (
  wallet: ConnectedWallet,
): Promise<WalletClient | null> => {
  if (walletClientCache.has(wallet?.chainId?.split(":")[1])) {
    return walletClientCache.get(wallet?.chainId?.split(":")[1])!;
  }

  const chain = SUPPORTED_CHAINS.find(
    (c) => c.id.toString() === wallet?.chainId?.split(":")[1],
  );
  if (!chain) {
    console.log(
      `Chain with id:${wallet?.chainId?.split(":")[1]} doesn't supported`,
    );
    return null;
  }

  const provider = await wallet?.getEthereumProvider();

  const walletClient = createWalletClient({
    account: wallet.address,
    chain: chain,
    transport: custom(provider),
  });

  walletClientCache.set(wallet?.chainId?.split(":")[1], walletClient);

  return walletClient;
};
