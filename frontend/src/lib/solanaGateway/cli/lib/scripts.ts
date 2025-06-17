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

// RevertOptions type definition - Anchor handles camelCase to snake_case conversion
export interface RevertOptions {
  revertAddress: PublicKey;       // pubkey
  abortAddress: Uint8Array;       // array [u8, 20]
  callOnRevert: boolean;          // bool
  revertMessage: Buffer;          // bytes
  onRevertGasLimit: anchor.BN;    // u64
}

export const createSolanaDepositTx = async (payer: PublicKey, amount: number, recipient: string, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  console.log("🚀 Creating SOL deposit transaction");
  console.log("💰 Amount:", amount);
  console.log("🎯 Recipient:", recipient);
  console.log("👤 Payer:", payer.toString());
  
  const seeds = [Buffer.from(SEED, "utf-8")];
  const [pdaAccount] = anchor.web3.PublicKey.findProgramAddressSync(
    seeds,
    program.programId
  );
  
  console.log("🏛️ PDA Account:", pdaAccount.toString());
  console.log("📋 RevertOptions provided:", revertOptions ? "Yes" : "No");
  
  if (revertOptions) {
    console.log("📋 RevertOptions details:", {
      revertAddress: revertOptions.revertAddress.toString(),
      abortAddress: Array.from(revertOptions.abortAddress),
      callOnRevert: revertOptions.callOnRevert,
      revertMessage: revertOptions.revertMessage.toString(),
      onRevertGasLimit: revertOptions.onRevertGasLimit.toString()
    });
  }
  
  try {
    const ix = await program.methods
      .deposit(
        new anchor.BN(amount),
        formatReceiver(recipient),
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        systemProgram: SystemProgram.programId  // Use camelCase as per Anchor 0.30
      }).instruction();

    console.log("✅ SOL deposit instruction created successfully");
    return ix;
  } catch (error) {
    console.error("❌ Error creating SOL deposit instruction:", error);
    throw error;
  }
}

export const createSolanaDepositAndCallTx = async (payer: PublicKey, amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  console.log("🚀 Creating SOL depositAndCall transaction");
  console.log("💰 Amount:", amount);
  console.log("🎯 Recipient:", recipient);
  console.log("👤 Payer:", payer.toString());
  console.log("📜 Args:", args);
  
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
  
  console.log("🏛️ PDA Account:", pdaAccount.toString());
  console.log("📨 Message length:", message.length);
  console.log("📋 RevertOptions provided:", revertOptions ? "Yes" : "No");
  
  if (revertOptions) {
    console.log("📋 RevertOptions details:", {
      revertAddress: revertOptions.revertAddress.toString(),
      abortAddress: Array.from(revertOptions.abortAddress),
      callOnRevert: revertOptions.callOnRevert,
      revertMessage: revertOptions.revertMessage.toString(),
      onRevertGasLimit: revertOptions.onRevertGasLimit.toString()
    });
  }
  
  try {
    const ix = await program.methods
      .depositAndCall(
        new anchor.BN(amount),
        formatReceiver(recipient),
        message,
        revertOptions
      ).accounts({
        signer: payer,
        pda: pdaAccount,
        systemProgram: SystemProgram.programId  // Use camelCase as per Anchor 0.30
      }).instruction();

    console.log("✅ SOL depositAndCall instruction created successfully");
    return ix;
  } catch (error) {
    console.error("❌ Error creating SOL depositAndCall instruction:", error);
    throw error;
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
  
  const ix = await program.methods
    .withdrawAndCall(
      formatReceiver(recipient),
      message,
      revertOptions
    ).accounts({
      signer: payer,
      pda: pdaAccount,
      systemProgram: SystemProgram.programId  // Use camelCase as per Anchor 0.30
    }).instruction();

  return ix;
}

export const createDepositSplTokenAndCallTx = async (payer: PublicKey, mint: PublicKey, amount: number, recipient: string, args: any, revertOptions: RevertOptions | null = null, program: anchor.Program) => {
  console.log("🚀 Creating SPL token depositAndCall transaction");
  console.log("💰 Amount:", amount);
  console.log("🪙 Mint:", mint.toString());
  console.log("🎯 Recipient:", recipient);
  console.log("👤 Payer:", payer.toString());
  console.log("📜 Args:", args);
  
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

  console.log("🏛️ PDA Account:", pdaAccount.toString());
  console.log("📝 Whitelist Entry:", whiteListEntry.toString());
  console.log("📤 From Account:", from.toString());
  console.log("📥 To Account:", to.toString());
  console.log("📨 Message length:", message.length);
  console.log("📋 RevertOptions provided:", revertOptions ? "Yes" : "No");
  
  // Add comprehensive account logging for debugging
  console.log("🔍 All accounts being passed:");
  console.log("  - signer:", payer.toString());
  console.log("  - pda:", pdaAccount.toString());
  console.log("  - whitelistEntry:", whiteListEntry.toString());
  console.log("  - mintAccount:", mint.toString());
  console.log("  - tokenProgram:", TOKEN_PROGRAM_ID.toString());
  console.log("  - from:", from.toString());
  console.log("  - to:", to.toString());
  console.log("  - systemProgram:", SystemProgram.programId.toString());
  
  if (revertOptions) {
    console.log("📋 RevertOptions details:", {
      revertAddress: revertOptions.revertAddress.toString(),
      abortAddress: Array.from(revertOptions.abortAddress),
      callOnRevert: revertOptions.callOnRevert,
      revertMessage: revertOptions.revertMessage.toString(),
      onRevertGasLimit: revertOptions.onRevertGasLimit.toString()
    });
  }

  try {
    // Manual PDA derivation to avoid Anchor 0.30.1 account resolution issues
    console.log("🔧 Deriving accounts manually to avoid resolution conflicts");
    
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
        whitelistEntry: whiteListEntry,  // Use camelCase as per Anchor 0.30
        mintAccount: mint,               // Use camelCase as per Anchor 0.30  
        tokenProgram: TOKEN_PROGRAM_ID,
        from,
        to,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    console.log("✅ SPL token depositAndCall instruction created successfully");
    return ix;
  } catch (error) {
    console.error("❌ Error creating SPL token depositAndCall instruction:", error);
    console.error("❌ Error details:", {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    throw error;
  }
}

export const createWithdrawSplTokenTx = async () => { }