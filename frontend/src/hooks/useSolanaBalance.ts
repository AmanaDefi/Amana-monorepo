
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { solanaRpcUrl } from "@/constants/chainConfig";
import { useQuery } from "@tanstack/react-query";
import { toTokens } from "thirdweb";

export default function useSolanaBalance() {
  const { publicKey, connected } = useWallet()
  const connection = new Connection(solanaRpcUrl)

  const { data = { value: 0n, formatted: "0" }, isLoading, error } = useQuery({
    queryKey: ["SolBalance", publicKey?.toBase58(), connected],
    queryFn: async () => {
      console.log("Fetching Solana Address")
      if (publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          return {
            value: BigInt(balance),
            formatted: toTokens(BigInt(balance), 9)
          }
        } catch (error) {
          return { value: 0n, formatted: "0" }
        }
      }
    },
    refetchInterval: 2000,
    enabled: !!publicKey && connected === true,
  })

  return data;
}
