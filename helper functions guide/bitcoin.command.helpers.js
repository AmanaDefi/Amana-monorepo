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
exports.constructMemo = exports.parseAmount = exports.createBitcoinInscriptionCommandWithCommonOptions = exports.createBitcoinMemoCommandWithCommonOptions = exports.createBitcoinCommandWithCommonOptions = exports.createAndBroadcastTransactions = exports.broadcastBtcTransaction = exports.displayAndConfirmMemoTransaction = exports.displayAndConfirmTransaction = exports.fetchUtxos = exports.setupBitcoinKeyPair = void 0;
const confirm_1 = __importDefault(require("@inquirer/confirm"));
const axios_1 = __importDefault(require("axios"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const commander_1 = require("commander");
const ecpair_1 = __importDefault(require("ecpair"));
const ethers_1 = require("ethers");
const ecc = __importStar(require("tiny-secp256k1"));
const bitcoin_constants_1 = require("../types/bitcoin.constants");
const bitcoin_types_1 = require("../types/bitcoin.types");
const shared_constants_1 = require("../types/shared.constants");
const accounts_1 = require("./accounts");
const bitcoin_helpers_1 = require("./bitcoin.helpers");
const handleError_1 = require("./handleError");
/**
 * Sets up a Bitcoin key pair using either a provided private key or one stored in the account data
 */
const setupBitcoinKeyPair = (privateKey, name) => {
    const keyPrivateKey = privateKey ||
        (0, accounts_1.getAccountData)("bitcoin", name)?.privateKey;
    if (!keyPrivateKey) {
        const errorMessage = (0, handleError_1.handleError)({
            context: "Failed to retrieve private key",
            error: new Error("Private key not found"),
            shouldThrow: false,
        });
        throw new Error(errorMessage);
    }
    // Initialize Bitcoin library with ECC implementation
    bitcoin.initEccLib(ecc);
    // Set up Bitcoin key pair
    const ECPair = (0, ecpair_1.default)(ecc);
    const key = ECPair.fromPrivateKey(Buffer.from(keyPrivateKey, "hex"), {
        network: bitcoin_helpers_1.SIGNET,
    });
    const { address } = bitcoin.payments.p2wpkh({
        network: bitcoin_helpers_1.SIGNET,
        pubkey: key.publicKey,
    });
    return { address: address, key };
};
exports.setupBitcoinKeyPair = setupBitcoinKeyPair;
/**
 * Fetches unspent transaction outputs (UTXOs) for the given address
 */
const fetchUtxos = async (address, api) => {
    return (await axios_1.default.get(`${api}/address/${address}/utxo`)).data;
};
exports.fetchUtxos = fetchUtxos;
const formatBTC = (sats) => ethers_1.ethers.formatUnits(BigInt(sats), 8);
/**
 * Displays transaction details to the user and asks for confirmation before proceeding
 */
const displayAndConfirmTransaction = async (info) => {
    const notApplicable = "encoded in raw inscription data";
    const amountInSats = info.amount
        ? Number(ethers_1.ethers.parseUnits(info.amount, 8))
        : 0;
    const totalSats = amountInSats +
        info.inscriptionCommitFee +
        info.inscriptionRevealFee +
        info.depositFee;
    console.log(`
Network: ${info.network}
${info.amount ? `Amount: ${info.amount} BTC (${amountInSats} sats)` : ""}
Inscription Commit Fee: ${info.inscriptionCommitFee} sats (${formatBTC(info.inscriptionCommitFee)} BTC)
Inscription Reveal Fee: ${info.inscriptionRevealFee} sats (${formatBTC(info.inscriptionRevealFee)} BTC)
Deposit Fee: ${info.depositFee} sats (${formatBTC(info.depositFee)} BTC)
Total: ${totalSats} sats (${formatBTC(totalSats)} BTC)
Gateway: ${info.gateway}
Sender: ${info.sender}
Receiver: ${info.receiver || notApplicable}
Revert Address: ${info.revertAddress || notApplicable}
Operation: ${info.operation}
${info.encodedMessage ? `Encoded Message: ${info.encodedMessage}` : ""}
Encoding Format: ${info.encodingFormat}
Raw Inscription Data: ${info.rawInscriptionData}
`);
    await (0, confirm_1.default)({ message: "Proceed?" }, { clearPromptOnDone: true });
};
exports.displayAndConfirmTransaction = displayAndConfirmTransaction;
/**
 * Displays memo transaction details to the user and asks for confirmation before proceeding
 */
const displayAndConfirmMemoTransaction = async (amount, networkFee, depositFee, gateway, sender, memo) => {
    const totalAmount = amount + depositFee;
    console.log(`
Network: Signet
Gateway: ${gateway}
Sender: ${sender}
Operation: Memo Transaction
Memo: ${memo}
Deposit Amount: ${amount} sats (${formatBTC(amount)} BTC)
Network Fee: ${networkFee} sats (${formatBTC(networkFee)} BTC)
Deposit Fee: ${depositFee} sats (${formatBTC(depositFee)} BTC)
Deposit Total: ${totalAmount} sats (${formatBTC(totalAmount)} BTC)
`);
    await (0, confirm_1.default)({ message: "Proceed?" }, { clearPromptOnDone: true });
};
exports.displayAndConfirmMemoTransaction = displayAndConfirmMemoTransaction;
/**
 * Broadcasts a raw Bitcoin transaction to the network
 */
const broadcastBtcTransaction = async (txHex, api) => {
    const { data } = await axios_1.default.post(`${api}/tx`, txHex, {
        headers: { "Content-Type": "text/plain" },
    });
    return data;
};
exports.broadcastBtcTransaction = broadcastBtcTransaction;
/**
 * Creates and broadcasts both commit and reveal transactions for Bitcoin inscriptions
 */
const createAndBroadcastTransactions = async (key, utxos, address, data, api, amount, gateway) => {
    // Create and broadcast commit transaction
    const commit = await (0, bitcoin_helpers_1.makeCommitTransaction)(key, utxos, address, data, api, amount);
    const commitTxid = await (0, exports.broadcastBtcTransaction)(commit.txHex, api);
    console.log("Commit TXID:", commitTxid);
    // Create and broadcast reveal transaction
    const revealHex = (0, bitcoin_helpers_1.makeRevealTransaction)(commitTxid, 0, amount, gateway, bitcoin_constants_1.BITCOIN_FEES.DEFAULT_REVEAL_FEE_RATE, {
        controlBlock: commit.controlBlock,
        internalKey: commit.internalKey,
        leafScript: commit.leafScript,
    }, key);
    const revealTxid = await (0, exports.broadcastBtcTransaction)(revealHex, api);
    console.log("Reveal TXID:", revealTxid);
    return { commitTxid, revealTxid };
};
exports.createAndBroadcastTransactions = createAndBroadcastTransactions;
const createBitcoinCommandWithCommonOptions = (name) => {
    return new commander_1.Command(name)
        .option("--yes", "Skip confirmation prompt", false)
        .option("-r, --receiver <address>", "ZetaChain receiver address")
        .requiredOption("-g, --gateway <address>", "Bitcoin gateway (TSS) address", bitcoin_constants_1.DEFAULT_GATEWAY)
        .addOption(new commander_1.Option("--private-key <key>", "Bitcoin private key").conflicts([
        "name",
    ]))
        .addOption(new commander_1.Option("--name <name>", "Account name")
        .default(shared_constants_1.DEFAULT_ACCOUNT_NAME)
        .conflicts(["private-key"]));
};
exports.createBitcoinCommandWithCommonOptions = createBitcoinCommandWithCommonOptions;
const createBitcoinMemoCommandWithCommonOptions = (name) => {
    return (0, exports.createBitcoinCommandWithCommonOptions)(name)
        .option("-d, --data <data>", "Pass raw data")
        .option("--network-fee <fee>", "Network fee (in sats)", "1750");
};
exports.createBitcoinMemoCommandWithCommonOptions = createBitcoinMemoCommandWithCommonOptions;
const createBitcoinInscriptionCommandWithCommonOptions = (name) => {
    return (0, exports.createBitcoinCommandWithCommonOptions)(name)
        .option("--revert-address <address>", "Revert address")
        .addOption(new commander_1.Option("--format <format>", "Encoding format")
        .choices(bitcoin_types_1.formatEncodingChoices)
        .default("ABI"))
        .addOption(new commander_1.Option("--data <data>", "Pass raw data").conflicts([
        "types",
        "values",
        "revert-address",
        "receiver",
    ]))
        .option("--bitcoin-api <url>", "Bitcoin API", bitcoin_constants_1.DEFAULT_BITCOIN_API)
        .option("--gas-price-api <url>", "ZetaChain API", bitcoin_constants_1.DEFAULT_GAS_PRICE_API);
};
exports.createBitcoinInscriptionCommandWithCommonOptions = createBitcoinInscriptionCommandWithCommonOptions;
/**
 * Parses a Bitcoin amount string and converts it to satoshis as a number
 */
const parseAmount = (amount) => {
    const amountSatBig = ethers_1.ethers.parseUnits(amount, 8);
    if (amountSatBig > Number.MAX_SAFE_INTEGER) {
        throw new Error("Amount exceeds JS safe-integer range");
    }
    return Number(amountSatBig);
};
exports.parseAmount = parseAmount;
/**
 * Constructs and validates a memo string from receiver address and data
 * @param receiver - The receiver address (hex string, with or without 0x prefix)
 * @param data - The data to include in the memo (hex string, with or without 0x prefix)
 * @returns The constructed memo string
 * @throws Error if the combined length exceeds 80 bytes
 */
const constructMemo = (receiver, data) => {
    const cleanReceiver = receiver.startsWith("0x")
        ? receiver.slice(2)
        : receiver;
    const cleanData = data?.startsWith("0x") ? data.slice(2) : data;
    const receiverLength = cleanReceiver.length / 2; // Divide by 2 since it's hex string
    const dataLength = cleanData ? cleanData.length / 2 : 0;
    const totalLength = receiverLength + dataLength;
    if (totalLength > 80) {
        throw new Error(`Memo too long: ${totalLength} bytes. Maximum allowed length is 80 bytes (including the 20 bytes of the receiver address).`);
    }
    return cleanReceiver + (cleanData || "");
};
exports.constructMemo = constructMemo;