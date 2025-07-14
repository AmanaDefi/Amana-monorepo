import { Command } from "commander";
import { ECPairInterface } from "ecpair";
import { type BtcUtxo } from "../types/bitcoin.types";
import { EncodingFormat } from "../utils/bitcoinEncode";
export interface BitcoinKeyPair {
    address: string;
    key: ECPairInterface;
}
export interface TransactionInfo {
    amount: string;
    depositFee: number;
    encodedMessage?: string;
    encodingFormat: EncodingFormat;
    gateway: string;
    inscriptionCommitFee: number;
    inscriptionRevealFee: number;
    network: string;
    operation: string;
    rawInscriptionData: string;
    receiver?: string;
    revertAddress?: string;
    sender: string;
}
/**
 * Sets up a Bitcoin key pair using either a provided private key or one stored in the account data
 */
export declare const setupBitcoinKeyPair: (privateKey: string | undefined, name: string) => BitcoinKeyPair;
/**
 * Fetches unspent transaction outputs (UTXOs) for the given address
 */
export declare const fetchUtxos: (address: string, api: string) => Promise<BtcUtxo[]>;
/**
 * Displays transaction details to the user and asks for confirmation before proceeding
 */
export declare const displayAndConfirmTransaction: (info: TransactionInfo) => Promise<void>;
/**
 * Displays memo transaction details to the user and asks for confirmation before proceeding
 */
export declare const displayAndConfirmMemoTransaction: (amount: number, networkFee: number, depositFee: number, gateway: string, sender: string, memo: string) => Promise<void>;
/**
 * Broadcasts a raw Bitcoin transaction to the network
 */
export declare const broadcastBtcTransaction: (txHex: string, api: string) => Promise<string>;
/**
 * Creates and broadcasts both commit and reveal transactions for Bitcoin inscriptions
 */
export declare const createAndBroadcastTransactions: (key: ECPairInterface, utxos: BtcUtxo[], address: string, data: Buffer, api: string, amount: number, gateway: string) => Promise<{
    commitTxid: string;
    revealTxid: string;
}>;
export declare const createBitcoinCommandWithCommonOptions: (name: string) => Command;
export declare const createBitcoinMemoCommandWithCommonOptions: (name: string) => Command;
export declare const createBitcoinInscriptionCommandWithCommonOptions: (name: string) => Command;
/**
 * Parses a Bitcoin amount string and converts it to satoshis as a number
 */
export declare const parseAmount: (amount: string) => number;
/**
 * Constructs and validates a memo string from receiver address and data
 * @param receiver - The receiver address (hex string, with or without 0x prefix)
 * @param data - The data to include in the memo (hex string, with or without 0x prefix)
 * @returns The constructed memo string
 * @throws Error if the combined length exceeds 80 bytes
 */
export declare const constructMemo: (receiver: string, data?: string) => string;