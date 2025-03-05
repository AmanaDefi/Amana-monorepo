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
import { ethers } from "ethers";

const SEED = 'meta';

export const createSolanaDepositTx = async (payer: PublicKey, amount: number, recipient: string, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const ix = await program.methods
    .deposit(
      new anchor.BN(amount),
      ethers.getBytes(recipient)
    ).accounts({
      pda: pdaAccount,
      signer: payer,
      systemProgram: SystemProgram.programId
    }).instruction();

  console.log({ ix })
  return ix;
}

export const createSolanaDepositAndCallTx = async (payer: PublicKey, amount: BigInt, recipient: string, message: any, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const ix = await program.methods
    .depositAndCall(
      amount,
      Uint8Array.from(ethers.getBytes(recipient))
    ).accounts({
      pda: pdaAccount,
      signer: payer,
      systemProgram: SystemProgram.programId
    }).instruction();

  return ix;
}
