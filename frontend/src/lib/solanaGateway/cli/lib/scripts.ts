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

export const createSolanaDepositAndCallTx = async (payer: PublicKey, amount: number, recipient: string, args: any, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const message = Buffer.from(
    getBytes(
      new AbiCoder().encode(args.types, args.values)
    )
  );
  const ix = await program.methods
    .depositAndCall(
      new anchor.BN(amount),
      ethers.getBytes(recipient),
      message,
      RevertOptions
    ).accounts({
      pda: pdaAccount,
      signer: payer,
      systemProgram: SystemProgram.programId
    }).instruction();

  return ix;
}

export const createSolanaWithdrawalTx = async (payer: PublicKey, recipient: string, args: any, program: anchor.Program) => {
  return await createSolanaDepositAndCallTx(payer, 1, recipient, args, program);
}

export const createDepositSplTokenAndCallTx = async (payer: PublicKey, mint: PublicKey, amount: number, recipient: string, args: any, program: anchor.Program) => {
  const seeds = [Buffer.from(SEED, 'utf-8')];
  const whiteListEntrySeeds = [Buffer.from("whitelist", 'utf-8'), mint.toBytes()]
  const whiteListEntry = anchor.web3.PublicKey.findProgramAddressSync(
    whiteListEntrySeeds,
    program.programId
  )
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  const from = getAssociatedTokenAddressSync(mint, payer);
  const to = getAssociatedTokenAddressSync(mint, pdaAccount, true);
  const message = Buffer.from(getBytes(new AbiCoder().encode(args.types, args.values)));

  const revertOptions = {
    abortAddress: ethers.getBytes(options.abortAddress),
    callOnRevert: options.callOnRevert,
    onRevertGasLimit: new anchor.BN(options.onRevertGasLimit ?? 0),
    revertAddress: options.revertAddress
      ? new PublicKey(options.revertAddress)
      : provider.wallet.publicKey,
    revertMessage: Buffer.from(options.revertMessage, "utf8"),
  };

  const ix = await program.methods
    .depositSplTokenAndCall(
      new anchor.BN(amount),
      ethers.getBytes(recipient),
      message,
      revertOptions
    ).accounts({
      pda: pdaAccount,
      signer: payer,
      whiteListEntry,
      mintAccount: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      from,
      to,
      systemProgram: SystemProgram.programId
    }).instruction();

  return ix;
}


export const createWithdrawSplTokenTx = async () => { }