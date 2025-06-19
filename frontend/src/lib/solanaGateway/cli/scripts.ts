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
  createDepositSplTokenAndCallTx,
  createSolanaDepositAndCallTx,
  createSolanaDepositTx,
  createSolanaWithdrawalTx,
  RevertOptions,
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

  solanaDeposit = async (amount: BigInt, recipient: string, revertOptions: RevertOptions | null = null) => {
    try {
     
      const tx = new Transaction().add(
        await createSolanaDepositTx(this.wallet.publicKey, Number(amount), recipient, revertOptions, this.program)
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
     
      throw new Error;
    }
  }

  solanaDepositAndCall = async (amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null) => {
    try {
      // Create transaction
      const tx = new Transaction().add(
        await createSolanaDepositAndCallTx(this.wallet.publicKey, amount, recipient, args, revertOptions, this.program)
      );

      // Set blockhash and fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;

      // For wallet adapters, use the signTransaction from the adapter 
      const signedTx = await this.wallet.signTransaction(tx);

      // Send the pre-signed transaction
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false }
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");

      return signature;
    } catch (e) {
      
      throw new Error(`Transaction failed`);
    }
  }

  solanaWithdrawal = async (recipient: string, args: any, revertOptions: RevertOptions | null = null) => {
    try {
      const tx = new Transaction().add(
        await createSolanaWithdrawalTx(this.wallet.publicKey, recipient, args, revertOptions, this.program)
      );
      // Set blockhash and fee payer
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;

      // For wallet adapters, use the signTransaction from the adapter 
      const signedTx = await this.wallet.signTransaction(tx);

      // Send the pre-signed transaction
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false }
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");

      return signature;
    } catch (error) {
      throw new Error("Transaction Failed")
    }
  }

  depositSplTokenAndCall = async (mint: string, amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null) => {
    try {
      if (!this.wallet || !this.wallet.publicKey || !this.wallet.signTransaction) {
        throw new Error("Wallet not connected or signTransaction not available");
      }

      const tx = new Transaction().add(
        await createDepositSplTokenAndCallTx(
          this.wallet.publicKey,
          new PublicKey(mint),
          amount,
          recipient,
          args,
          revertOptions,
          this.program
        )
      );

      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;

      const signedTx = await this.wallet.signTransaction(tx);

      const signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
      });

      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      return signature;
    } catch (error) {
      console.error("Deposit error:", error);
      throw new Error(`Transaction failed`);
    }
  };

}