import { Program, Wallet, web3 } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

import IDL from "./lib/IDL.json";
import {
  createSolanaDepositTx,
} from "./lib/scripts";
import { solanaConnection } from "@/utils/utils";

interface ISetConnectionParams {
  cluster: web3.Cluster; // env from CLI global params
  wallet: NodeWallet | Wallet; // needs to be both for TS & CLI differences
  signerKeypair: Keypair;
  rpc?: string;
  fm?: number;
}


export class SolanaZetaClient {
  public connection: Connection;
  public program: Program;
  public provider: anchor.Provider;
  public wallet: Wallet;
  public feeMultiplier: number = 1;
  public programId: PublicKey;

  constructor(wallet: Wallet) {
    this.programId = new anchor.web3.PublicKey(IDL.address);
    this.connection = solanaConnection

    this.wallet = wallet;

    anchor.setProvider(
      new anchor.AnchorProvider(this.connection, wallet!, {
        skipPreflight: true,
        commitment: "confirmed",
      })
    );
    this.provider = anchor.getProvider();
    this.program = new anchor.Program(IDL as anchor.Idl, this.provider);
  }

  solanaDeposit = async (amount: BigInt, recipient: string) => {
    try {
      console.log(`Depositing ${amount} SOL to ${recipient}`)
      const tx = new Transaction().add(
        await createSolanaDepositTx(this.wallet.publicKey, Number(amount), recipient, this.program)
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet?.publicKey;

      this.wallet?.signTransaction(tx);
      const txId = this.provider.sendAndConfirm!(tx, [], {
        commitment: "confirmed"
      });
      return txId;
    } catch (e) {
      console.log(e)
      throw new Error;
    }
  }
}