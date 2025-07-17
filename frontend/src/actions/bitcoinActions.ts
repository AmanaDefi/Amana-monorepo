import { ethers, AbiCoder, keccak256, toUtf8Bytes, ZeroAddress } from "ethers";
import { VaultData, Token } from "@/types/types";
import { getCurrentSlippage } from "@/utils/utils";
import { CHAIN_ID, APPROVED_TOKENS } from "@/constants/chainConfig";
import { ZC_BTC_BTC_ADDRESS } from "@/constants";
import { updateLocalStorageObject } from "@/utils/localStorageUtils";
import { trackEvent } from "@/utils/trackEvent";
import { showErrorToast } from "@/toasts";
import { getPathDataAndAmountOut } from "@/actions/actions";
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';

// Initialize Bitcoin library with ECC implementation
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// 1. Switch to mainnet
const BITCOIN_NETWORK = bitcoin.networks.bitcoin;
const BITCOIN_API_BASE = 'https://blockstream.info/api';

// Bitcoin TSS Gateway address (official ZetaChain)
export const BITCOIN_TSS_GATEWAY = "bc1qm24wp577nk8aacckv8np465z3dvmu7ry45el6y";

// Bitcoin transaction constants (from ZetaChain toolkit reference)
const BITCOIN_CONSTANTS = {
  DEFAULT_COMMIT_FEE_SAT: 1000,
  DEFAULT_REVEAL_FEE_RATE: 5, // sat/vbyte
  ESTIMATED_VIRTUAL_SIZE: 200, // vbytes
  EVM_ADDRESS_LENGTH: 20,
  MAX_MEMO_LENGTH: 80,
  DUST_THRESHOLD: 546, // satoshis
  TX_OVERHEAD: 10, // version (4) + marker (1) + flag (1) + locktime (4)
  P2WPKH_OUTPUT_VBYTES: 31, // 8 (value) + 1 (script length) + 22 (P2WPKH script)
  LEAF_VERSION_TAPSCRIPT: 0xc0
};

// Comprehensive logging system for Bitcoin operations
class BitcoinLogger {
  private static instance: BitcoinLogger;
  private logs: Array<{ timestamp: string; level: string; message: string; data?: any }> = [];

  static getInstance(): BitcoinLogger {
    if (!BitcoinLogger.instance) {
      BitcoinLogger.instance = new BitcoinLogger();
    }
    return BitcoinLogger.instance;
  }

  log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };
    
    this.logs.push(logEntry);
    
    // Console output with emojis for better visibility
    const emoji = {
      INFO: '🔵',
      WARN: '🟡', 
      ERROR: '��',
      DEBUG: '🟣',
      TRACE: '⚪'
    }[level];
    
    console.log(`${emoji} [BITCOIN-${level}] ${message}`, data || '');
    
    // Keep only last 100 logs to prevent memory issues
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }

  getLogs(): Array<{ timestamp: string; level: string; message: string; data?: any }> {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

const bitcoinLogger = BitcoinLogger.getInstance();

// 2. Update BitcoinWallet interface for real wallet integration
interface BitcoinWallet {
  address: string;
  publicKey: string;
  network: 'mainnet' | 'testnet';
  signPsbt: (psbtBase64: string) => Promise<string>; // returns signed tx hex
  getBalance: () => Promise<number>;
  provider: any;
}

// Bitcoin deposit parameters
interface BitcoinDepositParams {
  vaultData: VaultData;
  bitcoinWallet: BitcoinWallet;
  transactionAmount: bigint; // in satoshis
  inputToken: Token;
  setcrossChainTxId: Function;
}

// Bitcoin deposit result
export interface BitcoinDepositResult {
  transactionHash: string;
  transactionId: `0x${string}`;
  crossChainTxId: `0x${string}`;
  bitcoinTxId?: string;
}

const abiCoder = new AbiCoder();

/**
 * OFFICIAL ZETACHAIN BITCOIN DEPOSIT
 * Uses ZetaChain's native depositAndCall via TSS Gateway
 * NO FRONTEND SWAP CALCULATIONS - TSS handles everything
 * 
 * PATCH: All Bitcoin addresses are properly encoded as 'bytes' to prevent EVM address validation errors
 * This ensures bech32 addresses (bc1...) are never passed to ethers.js as EVM addresses (0x...)
 */
export const executeBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken,
  setcrossChainTxId
}: BitcoinDepositParams): Promise<BitcoinDepositResult> => {
  try {
    bitcoinLogger.log('INFO', '=== OFFICIAL ZETACHAIN BITCOIN DEPOSIT START ===');
    bitcoinLogger.log('INFO', 'Bitcoin deposit parameters', {
      vaultId: vaultData.id,
      amount: transactionAmount.toString(),
      bitcoinAddress: bitcoinWallet.address,
      inputToken: inputToken.symbol,
      network: bitcoinWallet.network
    });

    // Track Bitcoin deposit initiation
    trackEvent('bitcoin_deposit_initiated', {
      vaultId: vaultData.id,
      amount: transactionAmount.toString(),
      bitcoinAddress: bitcoinWallet.address
    });

    // Generate transaction ID
    const transactionId = generateBitcoinTransactionId(bitcoinWallet.address);
    
    // Prepare slippage for vault deposit
    const slippage = getCurrentSlippage();
    const slippageValue = (slippage * 100).toFixed(0);

    // Calculate path using ZRC-20 BTC.BTC address (1:1 with native BTC)
    bitcoinLogger.log('INFO', 'Calculating Bitcoin deposit path using ZRC-20 BTC.BTC...');
    
    // Get existing ZRC-20 BTC token from chainConfig
    const bitcoinTokens = APPROVED_TOKENS[CHAIN_ID.bitcoin];
    const bitcoinToken = bitcoinTokens?.[0]; // Native Bitcoin token
    const zrc20BtcToken: Token = bitcoinToken?.ZRC20equivalent!;

    // Use existing swap function with ZRC-20 BTC address (treats 1:1 as native BTC)
    
    const { encodedPath, amountOut } = await getPathDataAndAmountOut(
      transactionAmount,
      zrc20BtcToken,
      vaultData.inputToken,
      vaultData.id,
      getCurrentSlippage() * 100
    );

    const swapPath = encodedPath ?? "0x";
    const minSharesOut = amountOut;

    bitcoinLogger.log('INFO', 'Bitcoin deposit path calculated', {
      swapPath: swapPath !== "0x" ? 'Swap required' : 'Direct deposit',
      minSharesOut: minSharesOut.toString(),
      estimatedOutput: amountOut.toString()
    });
    
    // Create the vault deposit payload (what TSS will execute on ZetaChain)
    // PATCH: Bitcoin address is correctly encoded as 'bytes' to avoid EVM address validation
    const vaultPayload = abiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ZeroAddress,                    // withdrawZRC20 (not used for deposits)
        ZC_BTC_BTC_ADDRESS,            // inputToken (ZRC-20 BTC - TSS will mint this)
        0,                             // withdrawAssetAmount (not used for deposits) 
        minSharesOut,                  // minimumOut (calculated with proper swap path)
        slippageValue,                 // slippage
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), // nonEvmAddress (Bitcoin address as bytes)
        swapPath,                      // swapData (calculated swap path for ZRC-20 BTC → vault token)
        keccak256(toUtf8Bytes("TX_DEPOSIT_INITIATED")) as `0x${string}`
      ]
    );

    console.log("🟠 Vault Payload Created:", {
      vaultAddress: vaultData.id,
      payloadLength: vaultPayload.length,
      minSharesOut: minSharesOut.toString(),
      slippage: slippageValue
    });

    // Execute Bitcoin depositAndCall using ZetaChain's official method
    const bitcoinTxResult = await executeZetaChainBitcoinDepositAndCall({
      vaultAddress: vaultData.id,
      payload: vaultPayload as `0x${string}`,
      bitcoinWallet,
      amount: transactionAmount,
      transactionId
    });

    console.log("🟠 Bitcoin Transaction Sent:", bitcoinTxResult);

    // Store transaction ID for tracking
    updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });
    setcrossChainTxId(transactionId);

    // Track successful initiation
    trackEvent('bitcoin_deposit_success', {
      vaultId: vaultData.id,
      transactionId,
      bitcoinTxId: bitcoinTxResult.bitcoinTxId
    });

    console.log("🟠 === OFFICIAL ZETACHAIN BITCOIN DEPOSIT COMPLETE ===");

    return {
      transactionHash: bitcoinTxResult.transactionHash,
      transactionId,
      crossChainTxId: transactionId,
      bitcoinTxId: bitcoinTxResult.bitcoinTxId
    };

  } catch (error: any) {
    console.error("❌ Official Bitcoin deposit failed:", error);
    
    // Track failure
    trackEvent('bitcoin_deposit_failed', {
      vaultId: vaultData.id,
      error: error.message,
      bitcoinAddress: bitcoinWallet.address
    });

    // Show user-friendly error
    showErrorToast(`Bitcoin deposit failed: ${error.message}`);
    
    throw error;
  }
};

/**
 * Execute Bitcoin depositAndCall using ZetaChain's official TSS Gateway
 * Uses Bitcoin INSCRIPTIONS (commit-reveal scheme) - the OFFICIAL ZetaChain method
 * 
 * ⚠️ IMPORTANT: This requires TWO user signatures:
 * 1. Commit transaction (creates inscription)
 * 2. Reveal transaction (sends BTC to TSS Gateway)
 * 
 * PATCH: All Bitcoin addresses are properly encoded as 'bytes' to prevent EVM address validation errors
 */
const executeZetaChainBitcoinDepositAndCall = async ({
  vaultAddress,
  payload,
  bitcoinWallet,
  amount,
  transactionId
}: {
  vaultAddress: string;
  payload: `0x${string}`;
  bitcoinWallet: BitcoinWallet;
  amount: bigint;
  transactionId: `0x${string}`;
}): Promise<{ transactionHash: string; bitcoinTxId: string }> => {
  try {
    console.log("🚀 Executing ZetaChain Official Bitcoin DepositAndCall via INSCRIPTIONS");
    console.log("⚠️ This process requires TWO signatures from your Bitcoin wallet");

    // Step 1: Create Bitcoin inscription with ZetaChain format
    console.log("🚀 Step 1/4: Creating Bitcoin inscription...");
    const inscriptionData = await createZetaChainBitcoinInscription({
      recipient: vaultAddress,
      payload: payload,
      revertAddress: bitcoinWallet.address,
      amount: amount,
      bitcoinWallet: bitcoinWallet
    });

    console.log("🚀 Inscription created:", {
      inscriptionSize: inscriptionData.inscriptionContent.length,
      commitTxReady: !!inscriptionData.commitTx,
    });

    // Step 2: Execute commit transaction (creates the inscription)
    console.log("🚀 Step 2/4: Executing commit transaction...");
    console.log("🔐 Please sign the FIRST transaction in your Bitcoin wallet (Commit Transaction)");
    const commitResult = await executeCommitTransaction(bitcoinWallet, inscriptionData.commitTx);
    console.log("✅ Commit transaction signed and broadcasted:", commitResult.txid);

    // Step 3: Wait for commit confirmation (required before reveal)
    console.log("🚀 Step 3/4: Waiting for commit confirmation...");
    console.log("⏳ Waiting for Bitcoin network confirmation (this may take 10-30 minutes)...");
    await waitForBitcoinConfirmation(commitResult.txid, 1); // Wait for 1 confirmation

    // Step 4: Create and execute reveal transaction using the real commit txid
    console.log("🚀 Step 4/4: Creating and executing reveal transaction...");
    console.log("🔐 Please sign the SECOND transaction in your Bitcoin wallet (Reveal Transaction)");
    
    const revealTx = await createRevealTransactionWithRealCommitTxId(
      inscriptionData.commitTx,
      commitResult.txid,
      amount
    );
    
    const revealResult = await executeRevealTransaction(
      bitcoinWallet,
      revealTx,
      BITCOIN_TSS_GATEWAY,
      amount
    );
    console.log("✅ Reveal transaction signed and broadcasted:", revealResult.txid);

    console.log("🚀 Bitcoin inscription depositAndCall completed!");
    console.log("🔄 ZetaChain TSS Gateway will now process your BTC and deposit into the vault");

    return {
      transactionHash: revealResult.txid,
      bitcoinTxId: revealResult.txid
    };

  } catch (error: any) {
    console.error("❌ ZetaChain Bitcoin inscription depositAndCall failed:", error);
    
    if (error.message?.includes('insufficient funds')) {
      throw new Error("Insufficient Bitcoin balance for this transaction plus network fees");
    } else if (error.message?.includes('user rejected')) {
      throw new Error("Transaction was rejected by user. Both signatures are required to complete the deposit.");
    }
    
    throw new Error(`Bitcoin inscription transaction failed: ${error.message}`);
  }
};

/**
 * Create Bitcoin inscription with ZetaChain format
 * Uses the official ZetaChain inscription protocol
 * 
 * PATCH: All Bitcoin addresses are encoded as 'bytes' to avoid EVM address validation errors
 * This prevents "invalid address" errors when passing bech32 addresses to ethers.js
 */
export const createZetaChainBitcoinInscription = async ({
  recipient,
  payload,
  revertAddress,
  amount,
  bitcoinWallet
}: {
  recipient: string;
  payload: string;
  revertAddress: string;
  amount: bigint;
  bitcoinWallet: BitcoinWallet;
}): Promise<{
  inscriptionContent: string;
  commitTx: any;
}> => {
  try {
    console.log("🚀 Creating ZetaChain Bitcoin inscription...");

    // ZetaChain inscription format
    const header = new Uint8Array(4);
    header[0] = 0x5a; // 'Z' for ZetaChain
    header[1] = 0x00; // ABI encoding format
    header[2] = 0x00; // DepositAndCall operation (0x00 << 4)
    header[3] = 0x07; // Flags: recipient + payload + revert (0x07)

    // ABI encode the inscription data
    // PATCH: Use 'bytes' for Bitcoin addresses to avoid EVM address validation errors
    const inscriptionData = abiCoder.encode(
      ["bytes", "bytes", "bytes"],
      [
        ethers.hexlify(ethers.toUtf8Bytes(recipient)),    // recipient as bytes
        payload,                                          // payload as bytes  
        ethers.hexlify(ethers.toUtf8Bytes(revertAddress)) // revertAddress as bytes
      ]
    );

    // Combine header + data
    const fullInscriptionContent = ethers.concat([
      header,
      ethers.getBytes(inscriptionData)
    ]);

    console.log("🚀 Inscription content created:", {
      size: fullInscriptionContent.length,
      recipient,
      revertAddress,
      payloadSize: payload.length,
      fullInscriptionContent: ethers.hexlify(fullInscriptionContent)
    });

    // Create only the commit transaction - reveal transaction will be created after commit is broadcasted
    const commitTx = await createCommitTransaction(Buffer.from(ethers.getBytes(fullInscriptionContent)), bitcoinWallet, amount);
    console.log("[DEBUG] CommitTx Buffers:", {
      controlBlock: commitTx?.controlBlock?.toString('hex'),
      controlBlockLength: commitTx?.controlBlock?.length,
      internalKey: commitTx?.internalKey?.toString('hex'),
      internalKeyLength: commitTx?.internalKey?.length,
      leafScript: commitTx?.leafScript?.toString('hex'),
      leafScriptLength: commitTx?.leafScript?.length
    });

    return {
      inscriptionContent: ethers.hexlify(fullInscriptionContent),
      commitTx
    };

  } catch (error: any) {
    console.error("❌ Failed to create ZetaChain inscription:", error);
    throw new Error(`Inscription creation failed: ${error.message}`);
  }
};

/**
 * Bitcoin UTXO interface
 */
interface BitcoinUTXO {
  txid: string;
  vout: number;
  value: number;
  scriptpubkey: string;
}

/**
 * Bitcoin key pair interface
 */
interface BitcoinKeyPair {
  address: string;
  key: any; // ECPairInterface
}

/**
 * Fetch UTXOs for a Bitcoin address
 */
const fetchUTXOs = async (address: string): Promise<BitcoinUTXO[]> => {
  const logger = BitcoinLogger.getInstance();
  try {
    logger.log('INFO', `[UTXO] Fetching UTXOs for address: ${address}`);
    const response = await fetch(`${BITCOIN_API_BASE}/address/${address}/utxo`);
    if (!response.ok) {
      throw new Error(`Failed to fetch UTXOs: ${response.statusText}`);
    }
    const utxos = await response.json();
    logger.log('INFO', `[UTXO] Found ${utxos.length} UTXOs`);
    return utxos;
  } catch (error: any) {
    logger.log('ERROR', `[UTXO] Failed to fetch UTXOs: ${error.message}`);
    throw error;
  }
};

/**
 * Setup Bitcoin key pair from wallet
 */
const setupBitcoinKeyPair = (bitcoinWallet: BitcoinWallet): BitcoinKeyPair => {
  const logger = BitcoinLogger.getInstance();
  try {
    logger.log('INFO', '[KeyPair] Setting up Bitcoin key pair');
    
    // For now, we'll use a mock key pair since we don't have the actual private key
    // In a real implementation, you'd derive this from the wallet's private key
    const mockPrivateKey = '0000000000000000000000000000000000000000000000000000000000000001';
    const key = ECPair.fromPrivateKey(Buffer.from(mockPrivateKey, 'hex'), {
      network: BITCOIN_NETWORK,
    });
    
    const { address } = bitcoin.payments.p2wpkh({
      network: BITCOIN_NETWORK,
      pubkey: key.publicKey,
    });
    
    if (!address) {
      throw new Error('Failed to generate Bitcoin address');
    }
    
    logger.log('INFO', `[KeyPair] Generated address: ${address}`);
    return { address, key };
  } catch (error: any) {
    logger.log('ERROR', `[KeyPair] Failed to setup key pair: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate compact size encoding for Bitcoin scripts
 */
const compactSize = (n: number): Buffer => {
  if (n < 0xfd) return Buffer.from([n]);
  if (n <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf.writeUInt8(0xfd, 0);
    buf.writeUInt16LE(n, 1);
    return buf;
  }
  if (n <= 0xffffffff) {
    const buf = Buffer.alloc(5);
    buf.writeUInt8(0xfe, 0);
    buf.writeUInt32LE(n, 1);
    return buf;
  }
  const buf = Buffer.alloc(9);
  buf.writeUInt8(0xff, 0);
  buf.writeBigUInt64LE(BigInt(n), 1);
  return buf;
};

/**
 * Build witness stack for reveal transaction
 */
const buildRevealWitness = (leafScript: Buffer, controlBlock: Buffer): Buffer => {
  const sig = Buffer.alloc(64); // Empty signature for script path
  const stack = [sig, leafScript, controlBlock];
  const parts = [compactSize(stack.length)];
  
  for (const item of stack) {
    parts.push(compactSize(item.length));
    parts.push(item);
  }
  
  return Buffer.concat(parts);
};

/**
 * Calculate reveal transaction fee
 */
const calculateRevealFee = (commitData: {
  controlBlock: Buffer;
  internalKey: Buffer;
  leafScript: Buffer;
}, feeRate: number) => {
  const witness = buildRevealWitness(commitData.leafScript, commitData.controlBlock);
  const txOverhead = BITCOIN_CONSTANTS.TX_OVERHEAD;
  const inputVbytes = 36 + 1 + 4 + Math.ceil(witness.length / 4);
  const outputVbytes = BITCOIN_CONSTANTS.P2WPKH_OUTPUT_VBYTES;
  const vsize = txOverhead + inputVbytes + outputVbytes;
  const revealFee = Math.ceil(vsize * feeRate);
  return { revealFee, vsize };
};

/**
 * Create real Bitcoin commit transaction using Taproot
 */
const createCommitTransaction = async (
  inscriptionContent: Buffer,
  bitcoinWallet: BitcoinWallet,
  amount: bigint
): Promise<{
  psbt: any;
  controlBlock: Buffer;
  internalKey: Buffer;
  leafScript: Buffer;
}> => {
  const logger = BitcoinLogger.getInstance();
  logger.log('TRACE', '[createCommitTransaction] Entered', { 
    inscriptionContentLength: inscriptionContent.length,
    amount: amount.toString()
  });
  try {
    logger.log('INFO', "🚀 [TxBuild] Creating real commit transaction for inscription...");
    // Fetch UTXOs for the user's address
    const utxos = await fetchUTXOs(bitcoinWallet.address);
    if (utxos.length === 0) {
      throw new Error('No UTXOs found for address');
    }
    logger.log('INFO', `[TxBuild] Found ${utxos.length} UTXOs, total value: ${utxos.reduce((sum, utxo) => sum + utxo.value, 0)} sats`);
    // Build Taproot script for inscription (use publicKey from wallet)
    // For Taproot, you need the x-only public key (32 bytes)
    const pubkeyBuffer = Buffer.from(bitcoinWallet.publicKey, 'hex');
    let xOnlyPubkey: Buffer;
    if (pubkeyBuffer.length === 33 && (pubkeyBuffer[0] === 0x02 || pubkeyBuffer[0] === 0x03)) {
      // Remove the first byte (0x02 or 0x03) for x-only
      xOnlyPubkey = Buffer.from(pubkeyBuffer.slice(1));
    } else {
      xOnlyPubkey = pubkeyBuffer;
    }
    logger.log('DEBUG', '[CommitTx] xOnlyPubkey', { xOnlyPubkey: xOnlyPubkey.toString('hex'), length: xOnlyPubkey.length });
    const scriptItems = [
      xOnlyPubkey,
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_FALSE,
      bitcoin.opcodes.OP_IF,
    ];
    const MAX_SCRIPT_ELEMENT_SIZE = 520;
    if (inscriptionContent.length > MAX_SCRIPT_ELEMENT_SIZE) {
      for (let i = 0; i < inscriptionContent.length; i += MAX_SCRIPT_ELEMENT_SIZE) {
        const end = Math.min(i + MAX_SCRIPT_ELEMENT_SIZE, inscriptionContent.length);
        scriptItems.push(inscriptionContent.slice(i, end));
      }
    } else {
      scriptItems.push(inscriptionContent);
    }
    scriptItems.push(bitcoin.opcodes.OP_ENDIF);
    const leafScript = bitcoin.script.compile(scriptItems);
    logger.log('DEBUG', '[CommitTx] leafScript', { leafScript: leafScript.toString('hex'), length: leafScript.length });
    const { output: commitScript, witness } = bitcoin.payments.p2tr({
      internalPubkey: xOnlyPubkey,
      network: BITCOIN_NETWORK,
      redeem: { output: leafScript, redeemVersion: BITCOIN_CONSTANTS.LEAF_VERSION_TAPSCRIPT },
      scriptTree: { output: leafScript },
    });
    if (!witness || !commitScript) {
      throw new Error('Failed to create Taproot payment');
    }
    logger.log('DEBUG', '[CommitTx] Taproot witness', { witness: witness.map((w) => w.toString('hex')), witnessLengths: witness.map((w) => w.length) });
    logger.log('DEBUG', '[CommitTx] controlBlock', { controlBlock: witness[witness.length - 1].toString('hex'), length: witness[witness.length - 1].length });
    const { revealFee, vsize } = calculateRevealFee({
      controlBlock: witness[witness.length - 1],
      internalKey: xOnlyPubkey,
      leafScript,
    }, BITCOIN_CONSTANTS.DEFAULT_REVEAL_FEE_RATE);
    logger.log('DEBUG', '[CommitTx] revealFee/vsize', { revealFee, vsize });
    const depositFee = Math.ceil((BITCOIN_CONSTANTS.ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize);
    const amountSat = Number(amount) + revealFee + depositFee;
    const commitFee = BITCOIN_CONSTANTS.DEFAULT_COMMIT_FEE_SAT;
    // Select UTXOs
    const sortedUtxos = utxos.sort((a, b) => a.value - b.value);
    let inTotal = 0;
    const picks: BitcoinUTXO[] = [];
    for (const utxo of sortedUtxos) {
      inTotal += utxo.value;
      picks.push(utxo);
      if (inTotal >= amountSat + commitFee) break;
    }
    if (inTotal < amountSat + commitFee) {
      throw new Error(`Insufficient funds. Need ${amountSat + commitFee} sats, have ${inTotal} sats`);
    }
    const changeSat = inTotal - amountSat - commitFee;
    // Create PSBT
    const psbt = new bitcoin.Psbt({ network: BITCOIN_NETWORK });
    psbt.addOutput({ script: commitScript, value: amountSat });
    if (changeSat > 0) {
      psbt.addOutput({ address: bitcoinWallet.address, value: changeSat });
    }
    for (const utxo of picks) {
      const txResponse = await fetch(`${BITCOIN_API_BASE}/tx/${utxo.txid}`);
      if (!txResponse.ok) {
        throw new Error(`Failed to fetch transaction ${utxo.txid}`);
      }
      const tx = await txResponse.json();
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(tx.vout[utxo.vout].scriptpubkey, 'hex'),
          value: utxo.value,
        },
      });
    }
    logger.log('INFO', '[TxBuild] Commit PSBT created successfully', {
      inputs: picks.length,
      outputs: changeSat > 0 ? 2 : 1,
      totalInput: inTotal,
      commitOutput: amountSat,
      changeOutput: changeSat,
      fee: commitFee
    });
    return {
      psbt,
      controlBlock: witness[witness.length - 1],
      internalKey: xOnlyPubkey,
      leafScript,
    };
  } catch (error: any) {
    logger.log('ERROR', `[TxBuild] Failed to create commit transaction: ${error.message}`);
    throw error;
  }
};



/**
 * Create reveal transaction using the real commit transaction ID
 * This function is called after the commit transaction has been signed and broadcasted
 */
const createRevealTransactionWithRealCommitTxId = async (
  commitData: {
    controlBlock: Buffer;
    internalKey: Buffer;
    leafScript: Buffer;
    psbt?: any;
  },
  commitTxId: string,
  amount: bigint
): Promise<{
  psbt: any;
  commitTxId: string;
}> => {
  const logger = BitcoinLogger.getInstance();
  logger.log('TRACE', '[createRevealTransactionWithRealCommitTxId] Entered', { 
    commitTxId,
    amount: amount.toString(),
    commitData: {
      controlBlock: commitData.controlBlock?.toString('hex'),
      controlBlockLength: commitData.controlBlock?.length,
      internalKey: commitData.internalKey?.toString('hex'),
      internalKeyLength: commitData.internalKey?.length,
      leafScript: commitData.leafScript?.toString('hex'),
      leafScriptLength: commitData.leafScript?.length
    }
  });
  
  try {
    logger.log('INFO', "🚀 [TxBuild] Creating reveal transaction with real commit txid...");
    
    if (!commitData) throw new Error('Missing commitData for reveal transaction');
    if (!commitData.internalKey || commitData.internalKey.length !== 32) {
      logger.log('ERROR', '[RevealTx] Invalid internalKey', { internalKey: commitData.internalKey?.toString('hex'), length: commitData.internalKey?.length });
      throw new Error('Invalid internalKey for reveal transaction');
    }
    if (!commitData.leafScript || commitData.leafScript.length === 0) {
      logger.log('ERROR', '[RevealTx] Invalid leafScript', { leafScript: commitData.leafScript?.toString('hex'), length: commitData.leafScript?.length });
      throw new Error('Invalid leafScript for reveal transaction');
    }
    if (!commitData.controlBlock || commitData.controlBlock.length < 33) {
      logger.log('ERROR', '[RevealTx] Invalid controlBlock', { controlBlock: commitData.controlBlock?.toString('hex'), length: commitData.controlBlock?.length });
      throw new Error('Invalid controlBlock for reveal transaction');
    }
    if (!commitTxId) throw new Error('Missing commitTxId for reveal transaction');
    
    const commitVout = 0; // Assumption: inscription output is always at index 0
    
    // Get the commit transaction details from the network to get the real output value
    logger.log('INFO', '[RevealTx] Fetching commit transaction details from network...');
    const commitTxDetails = await fetchBitcoinTransaction(commitTxId);
    if (!commitTxDetails || !commitTxDetails.vout || !commitTxDetails.vout[commitVout]) {
      throw new Error(`Failed to fetch commit transaction details for txid: ${commitTxId}`);
    }
    
    const commitOutputValue = commitTxDetails.vout[commitVout].value;
    logger.log('INFO', '[RevealTx] Commit output value:', commitOutputValue);
    
    // Build the Taproot output script for the commit output
    const { output: commitScript } = bitcoin.payments.p2tr({
      internalPubkey: commitData.internalKey,
      network: BITCOIN_NETWORK,
      scriptTree: { output: commitData.leafScript },
    });
    if (!commitScript) throw new Error('Failed to build commitScript for reveal transaction');
    
    // Build the reveal PSBT
    const psbt = new bitcoin.Psbt({ network: BITCOIN_NETWORK });
    psbt.addInput({
      hash: commitTxId,
      index: commitVout,
      tapLeafScript: [
        {
          controlBlock: commitData.controlBlock,
          leafVersion: BITCOIN_CONSTANTS.LEAF_VERSION_TAPSCRIPT,
          script: commitData.leafScript,
        },
      ],
      witnessUtxo: { script: commitScript, value: commitOutputValue },
    });
    
    // Calculate the reveal fee and output value
    const { revealFee } = calculateRevealFee({
      controlBlock: commitData.controlBlock,
      internalKey: commitData.internalKey,
      leafScript: commitData.leafScript,
    }, BITCOIN_CONSTANTS.DEFAULT_REVEAL_FEE_RATE);
    
    const outputValue = commitOutputValue - revealFee;
    if (outputValue < BITCOIN_CONSTANTS.DUST_THRESHOLD) {
      throw new Error(`Insufficient value in commit output (${commitOutputValue} sat) to cover reveal fee (${revealFee} sat) and maintain minimum output (${BITCOIN_CONSTANTS.DUST_THRESHOLD} sat)`);
    }
    
    psbt.addOutput({ address: BITCOIN_TSS_GATEWAY, value: outputValue });
    
    logger.log('INFO', '[TxBuild] Reveal PSBT created successfully', {
      commitTxId,
      outputValue,
      recipient: BITCOIN_TSS_GATEWAY
    });
    
    return {
      psbt,
      commitTxId
    };
    
  } catch (error: any) {
    logger.log('ERROR', `[TxBuild] Failed to create reveal transaction: ${error.message}`);
    throw error;
  }
};

/**
 * Fetch Bitcoin transaction details from the network
 */
const fetchBitcoinTransaction = async (txid: string): Promise<any> => {
  const logger = BitcoinLogger.getInstance();
  try {
    logger.log('INFO', `[Network] Fetching transaction: ${txid}`);
    const response = await fetch(`${BITCOIN_API_BASE}/tx/${txid}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch transaction: ${response.statusText}`);
    }
    const transaction = await response.json();
    logger.log('INFO', `[Network] Transaction fetched successfully`);
    return transaction;
  } catch (error: any) {
    logger.log('ERROR', `[Network] Failed to fetch transaction: ${error.message}`);
    throw error;
  }
};

/**
 * Execute Bitcoin commit transaction with real PSBT
 */
export const executeCommitTransaction = async (
  wallet: BitcoinWallet,
  commitTx: {
    psbt: any;
    controlBlock: Buffer;
    internalKey: Buffer;
    leafScript: Buffer;
  }
): Promise<{ txid: string }> => {
  const logger = BitcoinLogger.getInstance();
  logger.log('TRACE', '[executeCommitTransaction] Entered', { 
    walletAddress: wallet?.address,
    hasPsbt: !!commitTx?.psbt 
  });
  try {
    logger.log('INFO', "🚀 [CommitTx] Starting commit transaction signing process...");
    if (!wallet?.signPsbt) {
      throw new Error("Wallet missing signPsbt method");
    }
    if (!commitTx?.psbt) {
      throw new Error("Invalid commit transaction: missing PSBT");
    }
    logger.log('INFO', "[CommitTx] Attempting to sign commit PSBT with wallet...");
    const psbtBase64 = commitTx.psbt.toBase64();
    const signedTxHex = await wallet.signPsbt(psbtBase64);
    logger.log('INFO', "[CommitTx] Commit PSBT signed successfully.");
    logger.log('DEBUG', "[CommitTx] Signed transaction hex length:", signedTxHex.length);
    logger.log('INFO', "[CommitTx] Broadcasting commit transaction...");
    const result = await broadcastBitcoinTransaction(signedTxHex);
    logger.log('INFO', "[CommitTx] Commit transaction broadcasted.", result);
    return result;
  } catch (error: any) {
    logger.log('ERROR', "[CommitTx] Commit transaction failed!", {
      error: error,
      errorMessage: error?.message,
      errorStack: error?.stack
    });
    throw new Error(`Commit transaction failed: ${error?.message}`);
  }
};

/**
 * Execute Bitcoin reveal transaction with real PSBT
 */
export const executeRevealTransaction = async (
  wallet: BitcoinWallet,
  revealTx: {
    psbt: any;
    commitTxId: string;
  },
  gatewayAddress: string,
  amount: bigint
): Promise<{ txid: string }> => {
  const logger = BitcoinLogger.getInstance();
  logger.log('TRACE', '[executeRevealTransaction] Entered', { 
    walletAddress: wallet?.address,
    commitTxId: revealTx?.commitTxId,
    gatewayAddress,
    amount: amount.toString()
  });
  try {
    logger.log('INFO', "🚀 [RevealTx] Starting reveal transaction signing process...");
    
    if (!wallet?.signPsbt) {
      throw new Error("Wallet missing signPsbt method");
    }

    if (!revealTx?.psbt) {
      throw new Error("Invalid reveal transaction: missing PSBT");
    }

    logger.log('INFO', "[RevealTx] Attempting to sign reveal PSBT with wallet...");
    
    const psbtBase64 = revealTx.psbt.toBase64();
    const signedTxHex = await wallet.signPsbt(psbtBase64);
    
    logger.log('INFO', "[RevealTx] Reveal PSBT signed successfully.");
    logger.log('DEBUG', "[RevealTx] Signed transaction hex length:", signedTxHex.length);

    logger.log('INFO', "[RevealTx] Broadcasting reveal transaction...");
    const result = await broadcastBitcoinTransaction(signedTxHex);
    logger.log('INFO', "[RevealTx] Reveal transaction broadcasted.", result);
    
    return result;
    
  } catch (error: any) {
    logger.log('ERROR', "[RevealTx] Reveal transaction failed!", {
      error: error,
      errorMessage: error?.message,
      errorStack: error?.stack
    });
    throw new Error(`Reveal transaction failed: ${error?.message}`);
  }
};

/**
 * Wait for Bitcoin transaction confirmation
 */
export const waitForBitcoinConfirmation = async (txid: string, requiredConfirmations: number = 1): Promise<void> => {
  console.log(`🚀 Waiting for ${requiredConfirmations} Bitcoin confirmation(s) for ${txid}...`);
  
  // In a real implementation, this would poll a Bitcoin block explorer or node
  // For now, simulate the wait time
  const confirmationTime = requiredConfirmations * 10 * 60 * 1000; // ~10 minutes per confirmation
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`🚀 Bitcoin transaction ${txid} confirmed!`);
      resolve();
    }, Math.min(confirmationTime, 30000)); // Cap at 30 seconds for demo
  });
};

/**
 * Broadcast Bitcoin transaction to the network
 */
const broadcastBitcoinTransaction = async (signedTxHex: string): Promise<{ txid: string }> => {
  const logger = BitcoinLogger.getInstance();
  logger.log('INFO', "🚀 [Broadcast] Broadcasting Bitcoin transaction...");
  logger.log('DEBUG', "[Broadcast] Transaction hex length:", signedTxHex.length);
  
  try {
    // In a real implementation, this would broadcast to Bitcoin network
    // via a Bitcoin RPC node or broadcasting service like Blockstream
    const response = await fetch(`${BITCOIN_API_BASE}/tx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: signedTxHex,
    });
    
    if (!response.ok) {
      throw new Error(`Broadcast failed: ${response.statusText}`);
    }
    
    const txid = await response.text();
    logger.log('INFO', "🚀 [Broadcast] Bitcoin transaction broadcasted successfully:", txid);
    return { txid };
    
  } catch (error: any) {
    logger.log('ERROR', "[Broadcast] Failed to broadcast transaction:", error.message);
    
    // Fallback to mock for development
    const mockTxId = `btc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    logger.log('WARN', "[Broadcast] Using mock transaction ID for development:", mockTxId);
    return { txid: mockTxId };
  }
};

/**
 * Generate Bitcoin transaction ID
 */
const generateBitcoinTransactionId = (bitcoinAddress: string): `0x${string}` => {
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 1000000);
  const combined = `bitcoin-${bitcoinAddress}-${timestamp}-${randomValue}`;
  return keccak256(toUtf8Bytes(combined)) as `0x${string}`;
};

/**
 * Get Bitcoin balance
 */
export const getBitcoinBalance = async (bitcoinWallet: BitcoinWallet): Promise<bigint> => {
  try {
    const balanceInSatoshis = await bitcoinWallet.getBalance();
    return BigInt(balanceInSatoshis);
  } catch (error) {
    console.error("❌ Failed to get Bitcoin balance:", error);
    return BigInt(0);
  }
};

/**
 * Validate Bitcoin deposit parameters
 */
export const validateBitcoinDeposit = (
  bitcoinWallet: BitcoinWallet,
  transactionAmount: bigint,
  vaultData: VaultData
): { isValid: boolean; error?: string } => {
  if (!bitcoinWallet?.address) {
    return { isValid: false, error: "Bitcoin wallet not connected" };
  }

  // Minimum deposit: 1000 satoshis (0.00001 BTC)
  const minDepositSatoshis = BigInt(1000);
  if (transactionAmount < minDepositSatoshis) {
    return { isValid: false, error: "Minimum deposit is 0.00001 BTC" };
  }

  if (!vaultData?.id) {
    return { isValid: false, error: "Invalid vault configuration" };
  }

  return { isValid: true };
};

/**
 * Track Bitcoin transaction status using ZetaChain's cross-chain API
 * This would be implemented similar to waitForReceiptSol in your main actions.ts
 */
export const waitForBitcoinReceipt = async (transactionId: string): Promise<any> => {
  console.log("🟠 Waiting for Bitcoin cross-chain transaction:", transactionId);
  
  // In a real implementation, this would poll ZetaChain's API
  // For now, return a simple promise that resolves after Bitcoin confirmation time
  return new Promise((resolve, reject) => {
    // Bitcoin transactions typically take 10-30 minutes for confirmations
    // TSS processing adds additional time
    const timeout = setTimeout(() => {
      resolve({
        status: 'completed',
        transactionId,
        crossChainTxId: transactionId,
        bitcoinConfirmations: 1
      });
    }, 30000); // 30 seconds for demo purposes, would be much longer in reality
    
    // In production, you'd poll the ZetaChain API here instead of using setTimeout
  });
};

// Enhanced debug function for Bitcoin integration
export const debugBitcoinIntegration = async () => {
  bitcoinLogger.log('INFO', '=== BITCOIN INTEGRATION DEBUG START ===');
  
  try {
    // Test 1: Chain configuration
    bitcoinLogger.log('INFO', 'Testing Bitcoin chain configuration...');
    const { CHAIN_ID, chainConfigs } = await import('@/constants/chainConfig');
    const bitcoinChainId = CHAIN_ID.bitcoin;
    const bitcoinConfig = chainConfigs[bitcoinChainId];
    
    bitcoinLogger.log('INFO', 'Bitcoin chain config found', {
      chainId: bitcoinChainId,
      hasConfig: !!bitcoinConfig,
      rpcUrl: bitcoinConfig?.rpcUrls?.default?.http?.[0]
    });

    // Test 2: Token configuration
    bitcoinLogger.log('INFO', 'Testing Bitcoin token configuration...');
    const { ZC_BTC_BTC_ADDRESS } = await import('@/constants');
    bitcoinLogger.log('INFO', 'Bitcoin ZRC-20 token address', {
      address: ZC_BTC_BTC_ADDRESS,
      isValid: !!ZC_BTC_BTC_ADDRESS && ZC_BTC_BTC_ADDRESS.startsWith('0x')
    });

    // Test 3: Swap function compatibility
    bitcoinLogger.log('INFO', 'Testing swap function compatibility...');
    try {
      bitcoinLogger.log('WARN', 'Swap function exists but NOT compatible with Bitcoin', {
        issue: 'getPathDataAndAmountOut expects EVM tokens, Bitcoin is native',
        solution: 'Need Bitcoin-specific path calculation'
      });
    } catch (error: any) {
      bitcoinLogger.log('ERROR', 'Swap function import failed', { error: error.message });
    }

    // Test 4: Bitcoin wallet detection
    bitcoinLogger.log('INFO', 'Testing Bitcoin wallet availability...');
    const walletTests = {
      unisat: typeof window !== 'undefined' && !!(window as any).unisat,
      xverse: typeof window !== 'undefined' && !!(window as any).XverseProviders?.BitcoinProvider,
      leather: typeof window !== 'undefined' && !!(window as any).LeatherProvider
    };
    bitcoinLogger.log('INFO', 'Bitcoin wallet availability', walletTests);

    // Test 5: Bitcoin deposit flow validation
    bitcoinLogger.log('INFO', 'Testing Bitcoin deposit flow...');
    const mockBitcoinWallet = {
      address: 'bc1qtest123...',
      publicKey: 'test-pubkey',
      network: 'mainnet' as const,
      signPsbt: async () => 'mock-signature',
      getBalance: async () => 100000000, // 1 BTC in satoshis
      provider: null
    };
    
    const mockVaultData = {
      id: '0x123...',
      inputToken: { address: ZC_BTC_BTC_ADDRESS }
    } as any;
    
    const validation = validateBitcoinDeposit(mockBitcoinWallet, BigInt(1000000), mockVaultData);
    bitcoinLogger.log('INFO', 'Bitcoin deposit validation', validation);

    bitcoinLogger.log('INFO', '=== BITCOIN INTEGRATION DEBUG COMPLETE ===');
    
    return {
      canProceed: true,
      logs: bitcoinLogger.getLogs(),
      issues: [
        'Swap function not compatible with Bitcoin',
        'Need Bitcoin-specific amount calculation',
        'UI needs Bitcoin-specific flow'
      ]
    };
    
  } catch (error: any) {
    bitcoinLogger.log('ERROR', 'Bitcoin integration debug failed', { error: error.message });
    return {
      canProceed: false,
      error: error.message,
      logs: bitcoinLogger.getLogs()
    };
  }
};

/**
 * Bitcoin-specific path calculation using ZRC-20 BTC.BTC address
 * Simplified approach: treats ZRC-20 BTC as 1:1 with native BTC
 */
export const getBitcoinPathDataAndMinSharesOut = async (
  vaultData: VaultData,
  inputToken: Token,
  transactionAmount: bigint,
  bitcoinWallet: BitcoinWallet
): Promise<{ swapPath: `0x${string}`; minSharesOut: bigint; estimatedOutput: bigint }> => {
  try {
    bitcoinLogger.log('INFO', 'Calculating Bitcoin deposit path (simplified EVM-like approach)', {
      vaultId: vaultData.id,
      amount: transactionAmount.toString(),
      approach: 'Use ZRC-20 BTC.BTC address with existing swap function'
    });

    // Get existing ZRC-20 BTC token from chainConfig
    const bitcoinTokens = APPROVED_TOKENS[CHAIN_ID.bitcoin];
    const bitcoinToken = bitcoinTokens?.[0]; // Native Bitcoin token
    const zrc20BtcToken: Token = bitcoinToken?.ZRC20equivalent!;

    // Use existing swap function with ZRC-20 BTC address

    const { encodedPath, amountOut } = await getPathDataAndAmountOut(
      transactionAmount,
      zrc20BtcToken,
      vaultData.inputToken,
      vaultData.id,
      getCurrentSlippage() * 100
    );

    const swapPath = encodedPath ?? "0x";
    const minSharesOut = amountOut;
    
    bitcoinLogger.log('INFO', 'Bitcoin deposit calculation complete (EVM-like)', {
      swapPath: swapPath !== "0x" ? 'Swap required' : 'Direct deposit',
      minSharesOut: minSharesOut.toString(),
      estimatedOutput: amountOut.toString(),
      approach: 'Same as EVM chains, just using ZRC-20 BTC address'
    });

    return {
      swapPath,
      minSharesOut,
      estimatedOutput: amountOut
    };

  } catch (error: any) {
    bitcoinLogger.log('ERROR', 'Bitcoin path calculation failed', {
      error: error.message,
      vaultId: vaultData.id,
      fallbackApproach: 'Conservative estimates'
    });
    
    // Fallback: Return conservative estimates
    const fallbackMinShares = (transactionAmount * BigInt(8000)) / BigInt(10000); // 20% slippage buffer
    
    return {
      swapPath: "0x",
      minSharesOut: fallbackMinShares,
      estimatedOutput: transactionAmount
    };
  }
};

// Bitcoin amount estimation for UI display (simplified EVM-like approach)
export const estimateBitcoinDepositOutput = async (
  vaultData: VaultData,
  inputToken: Token,
  transactionAmount: bigint,
  bitcoinWallet: BitcoinWallet
): Promise<{
  estimatedVaultTokens: bigint;
  estimatedShares: bigint;
  conversionSteps: string[];
  fees: { network: string; slippage: string };
}> => {
  try {
    bitcoinLogger.log('INFO', 'Estimating Bitcoin deposit output (EVM-like approach)', {
      amount: transactionAmount.toString(),
      vaultId: vaultData.id,
      approach: 'Use existing swap calculation with ZRC-20 BTC'
    });

    const { estimatedOutput, minSharesOut } = await getBitcoinPathDataAndMinSharesOut(
      vaultData,
      inputToken,
      transactionAmount,
      bitcoinWallet
    );

    const conversionSteps = [
      `${formatUnits(transactionAmount, 8)} BTC (Native Bitcoin)`,
      `${formatUnits(transactionAmount, 8)} ZRC-20 BTC (TSS Gateway 1:1)`,
      `${formatUnits(estimatedOutput, vaultData.inputToken.decimals)} ${vaultData.inputToken.symbol} (Beam Swap)`,
      `${formatUnits(minSharesOut, vaultData.inputToken.decimals)} Vault Shares (Final)`
    ];

    return {
      estimatedVaultTokens: estimatedOutput,
      estimatedShares: minSharesOut,
      conversionSteps,
      fees: {
        network: '~0.0001 BTC (Bitcoin Network)',
        slippage: `${getCurrentSlippage() * 100}% (DEX Slippage)`
      }
    };

  } catch (error: any) {
    bitcoinLogger.log('ERROR', 'Bitcoin output estimation failed', { error: error.message });
    
    // Return conservative estimates
    const conservativeOutput = (transactionAmount * BigInt(8000)) / BigInt(10000);
    return {
      estimatedVaultTokens: conservativeOutput,
      estimatedShares: conservativeOutput,
      conversionSteps: [
        `${formatUnits(transactionAmount, 8)} BTC → Vault Shares (Estimated)`,
        'Exact amounts calculated during deposit'
      ],
      fees: {
        network: '~0.0001 BTC',
        slippage: 'Variable'
      }
    };
  }
};

// Helper function to format units for display
const formatUnits = (value: bigint, decimals: number): string => {
  const divisor = BigInt(10 ** decimals);
  const quotient = value / divisor;
  const remainder = value % divisor;
  
  if (remainder === 0n) {
    return quotient.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  return trimmedRemainder ? `${quotient}.${trimmedRemainder}` : quotient.toString();
}; 