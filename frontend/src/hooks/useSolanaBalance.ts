import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { solanaRpcUrl } from "@/constants/chainConfig";
import { useQuery } from "@tanstack/react-query";
import { format } from "@/utils/utils";
import SolanaConnectionSingleton from "@/utils/solanaSingleton";

export default function useSolanaBalance() {
  const { publicKey, connected } = useWallet();
  const connection = SolanaConnectionSingleton.getInstance();

  const {
    data = { value: 0n, formatted: "0" },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["SolBalance", publicKey?.toBase58(), connected],
    queryFn: async () => {
     
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          return {
            value: BigInt(balance),
            formatted: format(BigInt(balance), 9),
          };
        } catch (error) {
          return { value: 0n, formatted: "0" };
        }
      } else return { value: 0n, formatted: "0" };
    },
    enabled: !!publicKey && connected === true,
  });

  return { balance: data, refetch };
}
