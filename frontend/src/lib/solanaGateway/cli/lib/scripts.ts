import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAssociatedTokenAddress,
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
  try {
    console.log("Creating Solana deposit and call transaction instruction...");
    console.log("Instruction params:", { payer: payer.toBase58(), amount, recipient, args, revertOptions });
    
    const seeds = [Buffer.from(SEED, "utf-8")];
    const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      seeds,
      program.programId
    );

    console.log("PDA account:", pdaAccount.toBase58());

    const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
    const message = formatMessage(encodedData);
    
    console.log("Encoded data and message created");

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

    console.log("Transaction instruction created successfully");
    return ix;
  } catch (error) {
    console.error("Error creating Solana deposit and call transaction instruction:", error);
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
  try {
    console.log("Creating Solana deposit SPL token and call transaction instruction...");
    console.log("Instruction params:", { payer: payer.toBase58(), mint: mint.toBase58(), amount, recipient, args, revertOptions });
    
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
    
    console.log("PDA account:", pdaAccount.toBase58());
    console.log("Whitelist entry:", whiteListEntry.toBase58());
    
    // Ensure we're passing PublicKey objects, not strings
    console.log("Payer type:", typeof payer, "is PublicKey:", payer instanceof PublicKey);
    console.log("Mint type:", typeof mint, "is PublicKey:", mint instanceof PublicKey);
    console.log("PDA type:", typeof pdaAccount, "is PublicKey:", pdaAccount instanceof PublicKey);
    
    // Convert to PublicKey if needed to ensure compatibility
    const payerPublicKey = payer instanceof PublicKey ? payer : new PublicKey(payer);
    const mintPublicKey = mint instanceof PublicKey ? mint : new PublicKey(mint);
    const pdaPublicKey = pdaAccount instanceof PublicKey ? pdaAccount : new PublicKey(pdaAccount);
    
    let from: PublicKey;
    let to: PublicKey;
    
    // Bypass the problematic getAssociatedTokenAddress function entirely
    // and use the manual derivation approach which is more reliable
    console.log("Using manual ATA derivation to avoid library compatibility issues...");
    
    try {
      // For the 'from' ATA: [owner, TOKEN_PROGRAM_ID, mint]
      const fromSeeds = [
        payerPublicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ];
      const [fromATA] = anchor.web3.PublicKey.findProgramAddressSync(
        fromSeeds,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      from = fromATA;
      console.log("From ATA created successfully:", from.toBase58());
      
      // For the 'to' ATA: [owner, TOKEN_PROGRAM_ID, mint] 
      // Note: We're not using allowOwnerOffCurve to avoid the compatibility issue
      const toSeeds = [
        pdaPublicKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ];
      const [toATA] = anchor.web3.PublicKey.findProgramAddressSync(
        toSeeds,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      to = toATA;
      console.log("To ATA created successfully:", to.toBase58());
      
    } catch (error: any) {
      console.error("Error in manual ATA derivation:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        mintPublicKey: mintPublicKey.toBase58(),
        payerPublicKey: payerPublicKey.toBase58(),
        pdaPublicKey: pdaPublicKey.toBase58()
      });
      
      // If manual derivation fails, try the library function as fallback
      console.log("Trying library function as fallback...");
      try {
        from = getAssociatedTokenAddressSync(mintPublicKey, payerPublicKey);
        to = getAssociatedTokenAddressSync(mintPublicKey, pdaPublicKey, false); // Use false to avoid the issue
        console.log("Library function fallback successful:");
        console.log("From ATA:", from.toBase58());
        console.log("To ATA:", to.toBase58());
      } catch (fallbackError: any) {
        console.error("Library function fallback also failed:", fallbackError);
        throw error; // Throw the original error
      }
    }

    const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
    const message = formatMessage(encodedData);

    console.log("About to create instruction with accounts:", {
      signer: payer.toBase58(),
      pda: pdaAccount.toBase58(),
      whitelistEntry: whiteListEntry.toBase58(),
      mintAccount: mint.toBase58(),
      from: from.toBase58(),
      to: to.toBase58()
    });

    console.log("About to call formatReceiver with recipient:", recipient);
    const formattedReceiver = formatReceiver(recipient);
    console.log("Formatted receiver:", formattedReceiver);

    console.log("RevertOptions:", revertOptions);
    if (revertOptions) {
      console.log("- revertAddress:", revertOptions.revertAddress.toBase58());
      console.log("- abortAddress:", revertOptions.abortAddress);
      console.log("- callOnRevert:", revertOptions.callOnRevert);
      console.log("- revertMessage:", revertOptions.revertMessage);
      console.log("- onRevertGasLimit:", revertOptions.onRevertGasLimit.toString());
    }

    console.log("About to create .accounts() with these values:");
    console.log("- signer:", payer.toBase58());
    console.log("- pda:", pdaAccount.toBase58());
    console.log("- whitelistEntry:", whiteListEntry.toBase58());
    console.log("- mintAccount:", mint.toBase58());
    console.log("- from:", from.toBase58());
    console.log("- to:", to.toBase58());

    const ix = await program.methods
      .depositSplTokenAndCall(
        new anchor.BN(amount),
        formattedReceiver,
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

    console.log("Transaction instruction created successfully");
    return ix;
  } catch (error) {
    console.error("Error creating deposit SPL token and call instruction:", error);
    throw error;
  }
}

export const createWithdrawSplTokenTx = async () => { }