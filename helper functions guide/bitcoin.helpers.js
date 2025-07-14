"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeParseBitcoinAmount = exports.calculateFees = exports.makeRevealTransaction = exports.calculateRevealFee = exports.makeCommitTransaction = exports.buildRevealWitness = exports.compactSize = exports.LEAF_VERSION_TAPSCRIPT = exports.SIGNET = void 0;
const axios_1 = __importDefault(require("axios"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ethers_1 = require("ethers");
const bitcoin_constants_1 = require("../types/bitcoin.constants");
const bitcoinMemo_helpers_1 = require("./bitcoinMemo.helpers");
/**
 * Bitcoin Signet network parameters
 * Used for creating Signet-compatible transactions
 */
exports.SIGNET = {
    bech32: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.BECH32,
    bip32: {
        private: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.BIP32.PRIVATE,
        public: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.BIP32.PUBLIC,
    },
    messagePrefix: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.MESSAGE_PREFIX,
    pubKeyHash: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.PUBKEY_HASH,
    scriptHash: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.SCRIPT_HASH,
    wif: bitcoin_constants_1.BITCOIN_NETWORKS.SIGNET.WIF,
};
exports.LEAF_VERSION_TAPSCRIPT = bitcoin_constants_1.BITCOIN_SCRIPT.LEAF_VERSION_TAPSCRIPT;
/**
 * Encodes a number as a Bitcoin compact size.
 * Bitcoin uses a custom variable-length integer format for script element counts and lengths.
 *
 * @param n - The number to encode
 * @returns A Buffer containing the compact size representation
 */
const compactSize = (n) => {
    if (n < 0xfd)
        return Buffer.from([n]);
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
    // uint64
    const buf = Buffer.alloc(9);
    buf.writeUInt8(0xff, 0);
    buf.writeBigUInt64LE(BigInt(n), 1);
    return buf;
};
exports.compactSize = compactSize;
/**
 * Builds a witness stack for the reveal transaction.
 * The witness contains the data needed to reveal the inscribed data and spend the Taproot output.
 *
 * @param leafScript - The script containing the cross-chain message
 * @param controlBlock - The Taproot control block needed to validate the script path
 * @returns A Buffer containing the encoded witness data
 */
const buildRevealWitness = (leafScript, controlBlock) => {
    // Empty signature - we don't need a real signature as we're using the script path
    const sig = Buffer.alloc(64);
    const stack = [sig, leafScript, controlBlock];
    const parts = [(0, exports.compactSize)(stack.length)];
    for (const item of stack) {
        parts.push((0, exports.compactSize)(item.length));
        parts.push(item);
    }
    return Buffer.concat(parts);
};
exports.buildRevealWitness = buildRevealWitness;
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
const makeCommitTransaction = async (key, utxos, changeAddress, inscriptionData, api, amount, feeSat = bitcoin_constants_1.BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT) => {
    const scriptItems = [
        key.publicKey.slice(1, 33),
        bitcoin.opcodes.OP_CHECKSIG,
        bitcoin.opcodes.OP_FALSE,
        bitcoin.opcodes.OP_IF,
    ];
    // Add inscription data in chunks if it exceeds 520 bytes (max script element size)
    const MAX_SCRIPT_ELEMENT_SIZE = 520;
    if (inscriptionData.length > MAX_SCRIPT_ELEMENT_SIZE) {
        for (let i = 0; i < inscriptionData.length; i += MAX_SCRIPT_ELEMENT_SIZE) {
            const end = Math.min(i + MAX_SCRIPT_ELEMENT_SIZE, inscriptionData.length);
            scriptItems.push(inscriptionData.slice(i, end));
        }
    }
    else {
        scriptItems.push(inscriptionData);
    }
    scriptItems.push(bitcoin.opcodes.OP_ENDIF);
    const leafScript = bitcoin.script.compile(scriptItems);
    /* p2tr */
    const { output: commitScript, witness } = bitcoin.payments.p2tr({
        internalPubkey: key.publicKey.slice(1, 33),
        network: exports.SIGNET,
        redeem: { output: leafScript, redeemVersion: exports.LEAF_VERSION_TAPSCRIPT },
        scriptTree: { output: leafScript },
    });
    if (!witness)
        throw new Error("taproot build failed");
    const { revealFee, vsize } = (0, exports.calculateRevealFee)({
        controlBlock: witness[witness.length - 1],
        internalKey: key.publicKey.slice(1, 33),
        leafScript,
    }, bitcoin_constants_1.BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE);
    const depositFee = Math.ceil((bitcoin_constants_1.ESTIMATED_VIRTUAL_SIZE * 2 * revealFee) / vsize);
    const amountSat = amount + revealFee + depositFee;
    const sortedUtxos = utxos.sort((a, b) => a.value - b.value);
    let inTotal = 0;
    const picks = [];
    for (const u of sortedUtxos) {
        inTotal += u.value;
        picks.push(u);
        if (inTotal >= amountSat + feeSat)
            break;
    }
    if (inTotal < amountSat + feeSat)
        throw new Error("Not enough funds");
    const changeSat = inTotal - amountSat - feeSat;
    if (!commitScript)
        throw new Error("taproot build failed");
    const psbt = new bitcoin.Psbt({ network: exports.SIGNET });
    psbt.addOutput({ script: commitScript, value: amountSat });
    if (changeSat > 0)
        psbt.addOutput({ address: changeAddress, value: changeSat });
    for (const u of picks) {
        const tx = (await axios_1.default.get(`${api}/tx/${u.txid}`)).data;
        psbt.addInput({
            hash: u.txid,
            index: u.vout,
            witnessUtxo: {
                script: Buffer.from(tx.vout[u.vout].scriptpubkey, "hex"),
                value: u.value,
            },
        });
    }
    psbt.signAllInputs(key);
    psbt.finalizeAllInputs();
    return {
        controlBlock: witness[witness.length - 1],
        internalKey: key.publicKey.slice(1, 33),
        leafScript,
        txHex: psbt.extractTransaction().toHex(),
    };
};
exports.makeCommitTransaction = makeCommitTransaction;
const calculateRevealFee = (commitData, feeRate) => {
    const witness = (0, exports.buildRevealWitness)(commitData.leafScript, commitData.controlBlock);
    const txOverhead = bitcoin_constants_1.BITCOIN_TX.TX_OVERHEAD; // 10 bytes: version (4) + marker (1) + flag (1) + locktime (4)
    // Input vbytes:
    // 36 bytes: outpoint (32-byte txid + 4-byte vout)
    // 1 byte: scriptSig length (always 0 for segwit, but still encoded as a 1-byte varint)
    // 4 bytes: sequence
    // witness length is counted in weight units, so we divide by 4 to convert to virtual bytes
    const inputVbytes = 36 + 1 + 4 + Math.ceil(witness.length / 4);
    const outputVbytes = bitcoin_constants_1.BITCOIN_TX.P2WPKH_OUTPUT_VBYTES; // 31 bytes: 8 (value) + 1 (script length) + 22 (P2WPKH script)
    const vsize = txOverhead + inputVbytes + outputVbytes;
    const revealFee = Math.ceil(vsize * feeRate);
    return { revealFee, vsize };
};
exports.calculateRevealFee = calculateRevealFee;
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
const makeRevealTransaction = (commitTxId, commitVout, commitValue, to, feeRate, commitData, key) => {
    const psbt = new bitcoin.Psbt({ network: exports.SIGNET });
    const { output: commitScript } = bitcoin.payments.p2tr({
        internalPubkey: commitData.internalKey,
        network: exports.SIGNET,
        scriptTree: { output: commitData.leafScript },
    });
    psbt.addInput({
        hash: commitTxId,
        index: commitVout,
        tapLeafScript: [
            {
                controlBlock: commitData.controlBlock,
                leafVersion: exports.LEAF_VERSION_TAPSCRIPT,
                script: commitData.leafScript,
            },
        ],
        witnessUtxo: { script: commitScript, value: commitValue },
    });
    const { revealFee } = (0, exports.calculateRevealFee)(commitData, feeRate);
    const outputValue = commitValue - revealFee;
    if (outputValue < bitcoin_constants_1.BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH) {
        throw new Error(`Insufficient value in commit output (${commitValue} sat) to cover reveal fee (${revealFee} sat) and maintain minimum output (${bitcoin_constants_1.BITCOIN_LIMITS.DUST_THRESHOLD.P2WPKH} sat)`);
    }
    psbt.addOutput({ address: to, value: outputValue });
    psbt.signInput(0, key);
    psbt.finalizeAllInputs();
    return psbt.extractTransaction(true).toHex();
};
exports.makeRevealTransaction = makeRevealTransaction;
/**
 * Calculates the total fees for a Bitcoin inscription transaction
 * @param data - The inscription data buffer
 * @returns Object containing commit fee, reveal fee, deposit fee, and total fee
 */
const calculateFees = async (data, api) => {
    const commitFee = bitcoin_constants_1.BITCOIN_FEES.DEFAULT_COMMIT_FEE_SAT;
    const revealFee = Math.ceil((bitcoin_constants_1.BITCOIN_TX.TX_OVERHEAD +
        36 +
        1 +
        43 +
        Math.ceil(data.length / 4) +
        bitcoin_constants_1.BITCOIN_TX.P2WPKH_OUTPUT_VBYTES) *
        bitcoin_constants_1.BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE);
    const depositFee = await (0, bitcoinMemo_helpers_1.getDepositFee)(api);
    const totalFee = commitFee + revealFee + depositFee;
    return { commitFee, depositFee, revealFee, totalFee };
};
exports.calculateFees = calculateFees;
/**
 * Safely converts a Bitcoin amount from string to number.
 * Validates that the amount doesn't exceed JavaScript's safe integer limit.
 *
 * @param amount - The Bitcoin amount as a string (e.g. "1.5" for 1.5 BTC)
 * @param decimals - Number of decimal places (default: 8 for Bitcoin)
 * @returns The amount in satoshis as a number
 * @throws Error if the amount exceeds JavaScript's safe integer limit
 */
const safeParseBitcoinAmount = (amount, decimals = 8) => {
    const parsedAmount = ethers_1.ethers.parseUnits(amount, decimals);
    if (parsedAmount > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("Amount exceeds maximum safe integer limit");
    }
    return Number(parsedAmount);
};
exports.safeParseBitcoinAmount = safeParseBitcoinAmount;