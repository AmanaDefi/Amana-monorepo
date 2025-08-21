import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { AbiCoder, ethers, getBytes } from "ethers";
import { CHAIN_ID } from "@/constants/chainConfig";

const SEED = 'meta';

// Helper function to convert Uint8Array to Buffer without changing length
const formatMessage = (data: Uint8Array): Buffer => {
  return Buffer.from(data);  // Just convert type, preserve original length
};

// Helper function to ensure receiver is exactly 20 bytes
const formatReceiver = (recipient: string): Uint8Array => {
  const bytes = ethers.getBytes(recipient);
  const buffer = new Uint8Array(20);
  if (bytes.length <= 20) {
    buffer.set(bytes, 0);
  } else {
    buffer.set(bytes.slice(0, 20), 0);
  }
  return buffer;
};

// RevertOptions type definition - Anchor handles camelCase to snake_case conversion
export interface RevertOptions {
  revertAddress: PublicKey;       // pubkey
  abortAddress: Uint8Array;       // array [u8, 20]
  callOnRevert: boolean;          // bool
  revertMessage: Buffer;          // bytes
  onRevertGasLimit: anchor.BN;    // u64
}

export const createSolanaDepositTx = async (payer: PublicKey, amount: number, recipient: string, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  
  try {
    const ix = await program.methods
      .deposit(
        new anchor.BN(amount),
        formatReceiver(recipient),
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        systemProgram: SystemProgram.programId
      }).instruction();

    return ix;
  } catch (error) {
    throw error;
  }
}

export const createSolanaDepositAndCallTx = async (payer: PublicKey, amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  console.log("=== createSolanaDepositAndCallTx called ===");
  console.log("Payer:", payer.toBase58());
  console.log("Amount:", amount);
  console.log("Recipient:", recipient);
  console.log("Args:", args);
  console.log("Revert options:", revertOptions);
  
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  console.log("PDA account:", pdaAccount.toBase58());

  const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
  const message = formatMessage(encodedData);
  console.log("Encoded data length:", encodedData.length);
  console.log("Message length:", message.length);
  
  try {
    console.log("Creating instruction...");
    const ix = await program.methods
      .depositAndCall(
        new anchor.BN(amount),
        formatReceiver(recipient),
        message,
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        systemProgram: SystemProgram.programId
      }).instruction();
    console.log("Instruction created successfully");
    return ix;
  } catch (error) {
    console.error("Error creating instruction:", error);
    throw error;
  }
}

export const createSolanaWithdrawalTx = async (payer: PublicKey, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );

  const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
  const message = formatMessage(encodedData);
  
  const ix = await program.methods
    .call(
      formatReceiver(recipient),
      message,
      revertOptions 
    ).accounts({
      signer: payer
    }).instruction();

  return ix;
};

export const createDepositSplTokenAndCallTx = async (payer: PublicKey, mint: PublicKey, amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, 'utf-8')];
  const whiteListEntrySeeds = [Buffer.from("whitelist", 'utf-8'), mint.toBytes()]
  const [whiteListEntry] = anchor.web3.PublicKey.findProgramAddressSync(
    whiteListEntrySeeds,
    program.programId
  )
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const from = getAssociatedTokenAddressSync(mint, payer);
  const to = getAssociatedTokenAddressSync(mint, pdaAccount, true);

  const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
  const message = formatMessage(encodedData);

  try {
    const ix = await program.methods
      .depositSplTokenAndCall(
        new anchor.BN(amount),
        formatReceiver(recipient),
        message,
        revertOptions  
      )
      .accounts({
        signer: payer,
        pda: pdaAccount,
        whitelistEntry: whiteListEntry,
        mintAccount: mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        from,
        to,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    return ix;
  } catch (error) {
    throw error;
  }
}

export const createWithdrawSplTokenTx = async () => { }