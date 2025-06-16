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
const MESSAGE_SIZE = 256; // Expected message size by the Solana program

// Helper function to ensure message is exactly the required size
const formatMessage = (data: Uint8Array): Uint8Array => {
  const buffer = new Uint8Array(MESSAGE_SIZE);
  if (data.length <= MESSAGE_SIZE) {
    buffer.set(data, 0);
  } else {
    buffer.set(data.slice(0, MESSAGE_SIZE), 0);
  }
  return buffer;
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

// RevertOptions type definition to match the Solana program interface
export interface RevertOptions {
  revertAddress: PublicKey;       // pubkey
  abortAddress: Uint8Array;       // array [u8, 20]
  callOnRevert: boolean;          // bool
  revertMessage: Buffer;          // bytes (Buffer works better with Anchor)
  onRevertGasLimit: anchor.BN;    // u64
}

export const createSolanaDepositTx = async (payer: PublicKey, amount: number, recipient: string, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  
  try {
    // Try with RevertOptions first
    const ix = await program.methods
      .deposit(
        new anchor.BN(amount),
        formatReceiver(recipient),
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        system_program: SystemProgram.programId
      }).instruction();

    return ix;
  } catch (error) {
    console.error("Error creating deposit instruction with RevertOptions:", error);
    throw error; // Let the error bubble up instead of falling back
  }
}

export const createSolanaDepositAndCallTx = async (payer: PublicKey, amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const message = formatMessage(
    getBytes(
      new AbiCoder().encode(args.types, args.values)
    )
  );
  
  try {
    // Try with RevertOptions first
    const ix = await program.methods
      .depositAndCall(
        new anchor.BN(amount),
        formatReceiver(recipient),
        message,
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        system_program: SystemProgram.programId
      }).instruction();

    return ix;
  } catch (error) {
    console.error("Error creating depositAndCall instruction with RevertOptions:", error);
    throw error; // Let the error bubble up instead of falling back
  }
}

export const createSolanaWithdrawalTx = async (payer: PublicKey, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const message = formatMessage(
    getBytes(
      new AbiCoder().encode(args.types, args.values)
    )
  );
  
  try {
    // Try with RevertOptions first
    const ix = await program.methods
      .withdrawAndCall(
        formatReceiver(recipient),
        message,
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        system_program: SystemProgram.programId
      }).instruction();

    return ix;
  } catch (error) {
    console.error("Error creating withdrawAndCall instruction with RevertOptions:", error);
    throw error; // Let the error bubble up instead of falling back
  }
}

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
  const message = formatMessage(getBytes(new AbiCoder().encode(args.types, args.values)));

  try {
    // Use minimal account specification, let Anchor resolve the rest
    const ix = await program.methods
      .depositSplTokenAndCall(
        new anchor.BN(amount),
        formatReceiver(recipient),
        message,
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        whitelist_entry: whiteListEntry,
        mint_account: mint,
        from,
        to
      }).instruction();

    return ix;
  } catch (error) {
    console.error("Error creating depositSplTokenAndCall instruction with RevertOptions:", error);
    throw error; // Let the error bubble up instead of falling back
  }
}

export const createWithdrawSplTokenTx = async () => { }