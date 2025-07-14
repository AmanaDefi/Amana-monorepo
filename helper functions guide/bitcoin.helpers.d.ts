import * as bitcoin from "bitcoinjs-lib";
import type { BtcUtxo } from "../types/bitcoin.types";
/**
 * Bitcoin Signet network parameters
 * Used for creating Signet-compatible transactions
 */
export declare const SIGNET: {
    bech32: string;
    bip32: {
        private: number;
        public: number;
    };
    messagePrefix: string;
    pubKeyHash: number;
    scriptHash: number;
    wif: number;
};
export declare const LEAF_VERSION_TAPSCRIPT: number;
/**
 * Encodes a number as a Bitcoin compact size.
 * Bitcoin uses a custom variable-length integer format for script element counts and lengths.
 *
 * @param n - The number to encode
 * @returns A Buffer containing the compact size representation
 */
export declare const compactSize: (n: number) => Buffer;
/**
 * Builds a witness stack for the reveal transaction.
 * The witness contains the data needed to reveal the inscribed data and spend the Taproot output.
 *
 * @param leafScript - The script containing the cross-chain message
 * @param controlBlock - The Taproot control block needed to validate the script path
 * @returns A Buffer containing the encoded witness data
 */
export declare const buildRevealWitness: (leafScript: Buffer, controlBlock: Buffer) => Buffer<ArrayBuffer>;
/**
 * Creates a commit transaction that embeds cross-chain message data in a Taproot output.
 * The commit transaction creates a special UTXO that can be spent later to reveal the inscription.
 *
 * @param key - Bitcoin signer (private key)
 * @param utxos - Available UTXOs to spend
 * @param changeAddress - Address to send change to
 * @param inscriptionData - Cross-chain message data to inscribe
 * @param api - Bitcoin API endpoint for fetching transaction data
 * @param amountSat - Amount to inscribe in satoshis
 * @param feeSat - Fee for the transaction in satoshis
 * @returns Object containing transaction data and Taproot script details
 */
export declare const makeCommitTransaction: (key: bitcoin.Signer, utxos: BtcUtxo[], changeAddress: string, inscriptionData: Buffer, api: string, amount: number, feeSat?: number) => Promise<{
    controlBlock: Buffer<ArrayBufferLike>;
    internalKey: Buffer<ArrayBuffer>;
    leafScript: Buffer<ArrayBufferLike>;
    txHex: string;
}>;
export declare const calculateRevealFee: (commitData: {
    controlBlock: Buffer;
    internalKey: Buffer;
    leafScript: Buffer;
}, feeRate: number) => {
    revealFee: number;
    vsize: number;
};
/**
 * Creates a reveal transaction that spends the commit transaction output and reveals the inscription.
 * This transaction sends funds to the ZetaChain gateway while exposing the cross-chain message.
 *
 * @param commitTxId - Transaction ID of the commit transaction
 * @param commitVout - Output index in the commit transaction to spend (typically 0)
 * @param commitValue - Value of the commit output in satoshis
 * @param to - Gateway address to send funds to
 * @param feeRate - Fee rate in satoshis per vbyte
 * @param commitData - Data from the commit transaction needed to spend it
 * @param key - Bitcoin signer (private key)
 * @returns Hex-encoded transaction ready for broadcast
 */
export declare const makeRevealTransaction: (commitTxId: string, commitVout: number, commitValue: number, to: string, feeRate: number, commitData: {
    controlBlock: Buffer;
    internalKey: Buffer;
    leafScript: Buffer;
}, key: bitcoin.Signer) => string;
/**
 * Calculates the total fees for a Bitcoin inscription transaction
 * @param data - The inscription data buffer
 * @returns Object containing commit fee, reveal fee, deposit fee, and total fee
 */
export declare const calculateFees: (data: Buffer, api: string) => Promise<{
    commitFee: number;
    depositFee: number;
    revealFee: number;
    totalFee: number;
}>;
/**
 * Safely converts a Bitcoin amount from string to number.
 * Validates that the amount doesn't exceed JavaScript's safe integer limit.
 *
 * @param amount - The Bitcoin amount as a string (e.g. "1.5" for 1.5 BTC)
 * @param decimals - Number of decimal places (default: 8 for Bitcoin)
 * @returns The amount in satoshis as a number
 * @throws Error if the amount exceeds JavaScript's safe integer limit
 */
export declare const safeParseBitcoinAmount: (amount: string, decimals?: number) => number;