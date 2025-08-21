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
import SolanaConnectionSingleton from "@/utils/solanaSingleton";

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
    this.connection = SolanaConnectionSingleton.getInstance();

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
      console.log(`Depositing ${amount} SOL to ${recipient}`)
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
      console.log(e)
      throw new Error;
    }
  }

  solanaDepositAndCall = async (amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null) => {
    try {
      console.log("=== solanaDepositAndCall called ===");
      console.log("Amount:", amount);
      console.log("Recipient:", recipient);
      console.log("Args:", args);
      console.log("Revert options:", revertOptions);
      console.log("Wallet public key:", this.wallet.publicKey?.toBase58());
      
      // Create transaction
      console.log("Creating transaction...");
      const tx = new Transaction().add(
        await createSolanaDepositAndCallTx(this.wallet.publicKey, amount, recipient, args, revertOptions, this.program)
      );
      console.log("Transaction created");

      // Set blockhash and fee payer
      console.log("Getting latest blockhash...");
      const { blockhash } = await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.wallet.publicKey;
      console.log("Blockhash set:", blockhash);

      // For wallet adapters, use the signTransaction from the adapter 
      console.log("About to sign transaction - this should trigger wallet popup");
      console.log("Sign transaction function:", typeof this.wallet.signTransaction);
      console.log("Wallet adapter:", this.wallet);
      
      // Create a wrapper to track the signing process
      const originalSignTransaction = this.wallet.signTransaction;
      const wrappedSignTransaction = async (transaction: any) => {
        console.log("=== signTransaction called ===");
        console.log("Transaction to sign:", transaction);
        try {
          const result = await originalSignTransaction.call(this.wallet, transaction);
          console.log("Transaction signed successfully");
          return result;
        } catch (error) {
          console.error("Error during transaction signing:", error);
          throw error;
        }
      };
      
      const signedTx = await wrappedSignTransaction(tx);
      console.log("Transaction signed successfully");

      // Send the pre-signed transaction
      console.log("Sending raw transaction...");
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false }
      );
      console.log("Transaction sent, signature:", signature);

      // Wait for confirmation
      console.log("Waiting for confirmation...");
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed:", confirmation);

      return signature;
    } catch (e: any) {
      console.error("Error in solanaDepositAndCall:", e);
      console.error("Error details:", {
        message: e.message,
        stack: e.stack,
        name: e.name
      });
      throw new Error(`Transaction failed: ${e.message}`);
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