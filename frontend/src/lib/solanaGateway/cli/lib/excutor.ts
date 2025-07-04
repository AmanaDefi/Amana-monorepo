import { VersionedTransaction } from "@solana/web3.js";
import SolanaConnectionSingleton from "@/utils/solanaSingleton";

interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export const execute = async (transaction: VersionedTransaction, latestBlockhash: Blockhash, isBuy: boolean = true) => {

  const connection = SolanaConnectionSingleton.getInstance();

  const signature = await connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
  
  const confirmation = await connection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    }
  );

if (confirmation.value.err) {
    return "";
  }

  return signature;
}
