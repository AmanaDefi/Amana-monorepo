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
exports.bitcoinMakeTransactionWithMemo = exports.getDepositFee = void 0;
const axios_1 = __importDefault(require("axios"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bitcoin_constants_1 = require("../types/bitcoin.constants");
const errorMemoTooLong = "Invalid memo: too long. Please, use less than 80 bytes (including the 20 bytes of the receiver address) or use inscription.";
const errorNoReceiver = "Invalid memo: first 20 bytes of the data should be EVM receiver address on ZetaChain";
const getDepositFee = async (api) => {
    try {
        const response = await axios_1.default.get(`${api}`);
        const gasPrice = response.data.GasPrice;
        const medianIndex = parseInt(gasPrice.median_index);
        const medianGasPrice = parseInt(gasPrice.prices[medianIndex]);
        return medianGasPrice * bitcoin_constants_1.ESTIMATED_VIRTUAL_SIZE;
    }
    catch (error) {
        console.error("Error fetching gas price:", error);
        throw error;
    }
};
exports.getDepositFee = getDepositFee;
const bitcoinMakeTransactionWithMemo = async (params) => {
    const TESTNET = bitcoin.networks.testnet;
    const memo = Buffer.from(params.memo || "", "hex");
    if (memo.length < bitcoin_constants_1.EVM_ADDRESS_LENGTH)
        throw new Error(errorNoReceiver);
    if (memo.length > bitcoin_constants_1.MAX_MEMO_LENGTH)
        throw new Error(errorMemoTooLong);
    const sortedUtxos = params.utxos.sort((a, b) => a.value - b.value);
    const need = params.amount + params.depositFee + params.networkFee;
    let sum = 0;
    const picked = [];
    for (const u of sortedUtxos) {
        sum += u.value;
        picked.push(u);
        if (sum >= need)
            break;
    }
    if (sum < need)
        throw new Error("Not enough funds");
    const change = sum - params.amount - params.depositFee - params.networkFee;
    const prevTxs = await Promise.all(picked.map((u) => axios_1.default.get(`${params.api}/tx/${u.txid}`).then((r) => r.data)));
    const psbt = new bitcoin.Psbt({ network: TESTNET });
    psbt.addOutput({
        address: params.gateway,
        value: params.amount + params.depositFee,
    });
    const embed = bitcoin.payments.embed({ data: [memo] });
    if (!embed.output)
        throw new Error("Unable to embed memo");
    psbt.addOutput({ script: embed.output, value: 0 });
    if (change > 0) {
        psbt.addOutput({ address: params.address, value: change });
    }
    picked.forEach((u, i) => {
        psbt.addInput({
            hash: prevTxs[i].txid,
            index: u.vout,
            witnessUtxo: {
                script: Buffer.from(prevTxs[i].vout[u.vout].scriptpubkey, "hex"),
                value: u.value,
            },
        });
    });
    picked.forEach((_, i) => psbt.signInput(i, params.key));
    psbt.finalizeAllInputs();
    return psbt.extractTransaction().toHex();
};
exports.bitcoinMakeTransactionWithMemo = bitcoinMakeTransactionWithMemo;
