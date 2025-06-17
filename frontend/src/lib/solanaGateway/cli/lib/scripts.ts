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
    console.log("🧪 TESTING: Using null instead of revertOptions for SOL deposit");
    
    const ix = await program.methods
      .deposit(
        new anchor.BN(amount),
        formatReceiver(recipient),
        null  // Testing with null instead of revertOptions
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
  console.log('🔧 BEFORE formatMessage - SOL depositAndCall args:');
  console.log('  Types:', JSON.stringify(args.types, null, 2));
  console.log('  Values (detailed):', JSON.stringify(args.values.map((v: any, i: number) => ({
    position: i,
    type: args.types[i],
    value: typeof v === 'bigint' ? v.toString() : v,
    valueType: typeof v,
    length: typeof v === 'string' ? v.length : 'N/A',
    hexLength: typeof v === 'string' && v.startsWith('0x') ? (v.length - 2) / 2 : 'N/A'
  })), null, 2));

  const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
  console.log('🔄 ABI encoded data:');
  console.log('  Length:', encodedData.length);
  console.log('  Type:', typeof encodedData);
  console.log('  As hex:', '0x' + Buffer.from(encodedData).toString('hex'));
  
  const message = formatMessage(encodedData);
  
  console.log('✅ AFTER formatMessage - SOL depositAndCall result:');
  console.log('  Message length:', message.length);
  console.log('  Message type:', typeof message);
  console.log('  Message constructor:', message.constructor.name);
  console.log('  Is Buffer?:', Buffer.isBuffer(message));
  console.log('  Message as hex:', '0x' + Buffer.from(message).toString('hex'));
  console.log('  Message first 64 bytes:', '0x' + Buffer.from(message.slice(0, Math.min(64, message.length))).toString('hex'));
  console.log('  Message last 64 bytes:', '0x' + Buffer.from(message.slice(-Math.min(64, message.length))).toString('hex'));
  
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
    console.log("🧪 TESTING: Using null instead of revertOptions for SOL depositAndCall");
    
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
  console.log('🔧 BEFORE formatMessage - Withdrawal args:');
  console.log('  Types:', JSON.stringify(args.types, null, 2));
  console.log('  Values (detailed):', JSON.stringify(args.values.map((v: any, i: number) => ({
    position: i,
    type: args.types[i],
    value: typeof v === 'bigint' ? v.toString() : v,
    valueType: typeof v,
    length: typeof v === 'string' ? v.length : 'N/A',
    hexLength: typeof v === 'string' && v.startsWith('0x') ? (v.length - 2) / 2 : 'N/A'
  })), null, 2));

  const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
  console.log('🔄 ABI encoded data:');
  console.log('  Length:', encodedData.length);
  console.log('  Type:', typeof encodedData);
  console.log('  As hex:', '0x' + Buffer.from(encodedData).toString('hex'));
  
  const message = formatMessage(encodedData);
  
  console.log('✅ AFTER formatMessage - Withdrawal result:');
  console.log('  Message length:', message.length);
  console.log('  Message type:', typeof message);
  console.log('  Message constructor:', message.constructor.name);
  console.log('  Is Buffer?:', Buffer.isBuffer(message));
  console.log('  Message as hex:', '0x' + Buffer.from(message).toString('hex'));
  console.log('  Message first 64 bytes:', '0x' + Buffer.from(message.slice(0, Math.min(64, message.length))).toString('hex'));
  console.log('  Message last 64 bytes:', '0x' + Buffer.from(message.slice(-Math.min(64, message.length))).toString('hex'));
  
  console.log("🧪 TESTING: Using null instead of revertOptions for withdrawal");
  
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
  
  console.log('🔧 BEFORE formatMessage - SPL depositAndCall args:');
  console.log('  Types:', JSON.stringify(args.types, null, 2));
  console.log('  Values (detailed):', JSON.stringify(args.values.map((v: any, i: number) => ({
    position: i,
    type: args.types[i],
    value: typeof v === 'bigint' ? v.toString() : v,
    valueType: typeof v,
    length: typeof v === 'string' ? v.length : 'N/A',
    hexLength: typeof v === 'string' && v.startsWith('0x') ? (v.length - 2) / 2 : 'N/A'
  })), null, 2));

  const encodedData = getBytes(new AbiCoder().encode(args.types, args.values));
  console.log('🔄 ABI encoded data:');
  console.log('  Length:', encodedData.length);
  console.log('  Type:', typeof encodedData);
  console.log('  As hex:', '0x' + Buffer.from(encodedData).toString('hex'));
  
  const message = formatMessage(encodedData);
  
  console.log('✅ AFTER formatMessage - SPL depositAndCall result:');
  console.log('  Message length:', message.length);
  console.log('  Message type:', typeof message);
  console.log('  Message constructor:', message.constructor.name);
  console.log('  Is Buffer?:', Buffer.isBuffer(message));
  console.log('  Message as hex:', '0x' + Buffer.from(message).toString('hex'));
  console.log('  Message first 64 bytes:', '0x' + Buffer.from(message.slice(0, Math.min(64, message.length))).toString('hex'));
  console.log('  Message last 64 bytes:', '0x' + Buffer.from(message.slice(-Math.min(64, message.length))).toString('hex'));
  
  console.log("🏛️ PDA Account:", pdaAccount.toString());
  console.log("📝 Whitelist Entry:", whiteListEntry.toString());
  console.log("📤 From Account:", from.toString());
  console.log("📥 To Account:", to.toString());
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
    
    console.log("🔧 Using revertOptions again - testing the bytes encoding fix");
    
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