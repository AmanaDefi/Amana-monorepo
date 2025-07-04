import { Connection } from '@solana/web3.js';
import { solanaRpcUrl } from '@/constants/chainConfig';

class SolanaConnectionSingleton {
  private static instance: Connection;

  private constructor() {}

  public static getInstance(): Connection {
    if (!SolanaConnectionSingleton.instance) {
      SolanaConnectionSingleton.instance = new Connection(solanaRpcUrl, 'confirmed');
    }
    return SolanaConnectionSingleton.instance;
  }
}

export default SolanaConnectionSingleton;