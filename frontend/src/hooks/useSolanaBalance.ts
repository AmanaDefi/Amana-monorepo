
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { solanaRpcUrl } from "@/constants/chainConfig";
import { useState, useEffect } from "react";
import { Balance } from "@/types/types";

export default function useSolanaBalance() {
  const [balance, setBalance] = useState<Balance>({value: 0n, formatted: "0"})
  const {publicKey, connected} = useWallet()
  const connection = new Connection(solanaRpcUrl)

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((balance) => {
        setBalance({
          value: BigInt(balance),
          formatted: (balance / LAMPORTS_PER_SOL).toFixed(4)})
      })
    }
  }, [publicKey, connected])

  return balance;
}
