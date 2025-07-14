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
exports.generateBitcoinAddress = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = __importDefault(require("ecpair"));
const ecc = __importStar(require("tiny-secp256k1"));
/**
 * Generate a Bitcoin address from a private key
 *
 * @param pk - Private key in hex format
 * @param network - Bitcoin network ("mainnet" or "testnet")
 * @returns The generated Bitcoin address
 */
const generateBitcoinAddress = (pk, network) => {
    const bitcoinNetwork = network === "testnet" ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
    const ECPair = (0, ecpair_1.default)(ecc);
    const key = ECPair.fromPrivateKey(Buffer.from(pk, "hex"), {
        network: bitcoinNetwork,
    });
    const { address } = bitcoin.payments.p2wpkh({
        network: bitcoinNetwork,
        pubkey: key.publicKey,
    });
    if (!address)
        throw new Error("Unable to generate bitcoin address");
    return address;
};
exports.generateBitcoinAddress = generateBitcoinAddress;
