import { getContract } from "viem";
import { getPublicClient, getWalletClient } from "./getPublicClient";

export const getContractCustom = ({
  address,
  chainId,
  abi,
}: {
  address: string;
  chainId: number;
  abi: any;
}) => {
  const publicClient = getPublicClient(chainId);
  const walletClient = getWalletClient(chainId);
  if (!publicClient || !walletClient) return false;

  const contract = getContract({
    client: { public: publicClient, wallet: walletClient },
    address: address,
    abi: abi,
  });

  return contract;
};
