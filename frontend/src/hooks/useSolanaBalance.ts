
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { solanaRpcUrl } from "@/constants/chainConfig";
import { useState, useEffect } from "react";

export default function useActiveWalletBalance() {
  const [balance, setBalance] = useState<number>(0)
  const {publicKey} = useWallet()

  useEffect(() => {
    if (publicKey) {
      const connection = new Connection(solanaRpcUrl)
      connection.getBalance(publicKey).then((balance) => {
        setBalance(balance / LAMPORTS_PER_SOL)
      })
    }
  }, [publicKey])

  return balance;
}
