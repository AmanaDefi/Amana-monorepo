"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeToBytes = exports.bitcoinEncode = exports.EncodingFormat = exports.OpCode = void 0;
const ethers_1 = require("ethers");
// Memo identifier byte
const MemoIdentifier = 0x5a;
// Enums
var OpCode;
(function (OpCode) {
    OpCode[OpCode["Call"] = 2] = "Call";
    OpCode[OpCode["Deposit"] = 0] = "Deposit";
    OpCode[OpCode["DepositAndCall"] = 1] = "DepositAndCall";
    OpCode[OpCode["Invalid"] = 3] = "Invalid";
})(OpCode || (exports.OpCode = OpCode = {}));
var EncodingFormat;
(function (EncodingFormat) {
    EncodingFormat[EncodingFormat["ABI"] = 0] = "ABI";
    EncodingFormat[EncodingFormat["CompactLong"] = 2] = "CompactLong";
    EncodingFormat[EncodingFormat["CompactShort"] = 1] = "CompactShort";
})(EncodingFormat || (exports.EncodingFormat = EncodingFormat = {}));
// Header Class
class Header {
    constructor(encodingFmt, opCode) {
        this.encodingFmt = encodingFmt;
        this.opCode = opCode;
    }
}
// FieldsV0 Class
class FieldsV0 {
    constructor(receiver, payload, revertAddress) {
        this.receiver = receiver;
        this.payload = payload;
        this.revertAddress = revertAddress;
    }
}
/**
 * Encodes data for a Bitcoin transaction
 * @param receiver - The address of the receiver
 * @param payload - The payload to be sent
 * @param revertAddress - Bitcoin address to revert funds to in case of failure
 * @param opCode - The operation code (defaults to DepositAndCall)
 * @param encodingFormat - The encoding format (defaults to ABI)
 * @returns The encoded data as a hex string
 */
const bitcoinEncode = (receiver, payload, revertAddress, opCode = OpCode.DepositAndCall, encodingFormat = EncodingFormat.ABI) => {
    // Create memo header
    const header = new Header(encodingFormat, opCode);
    // Create memo fields
    const fields = new FieldsV0(receiver, payload, revertAddress);
    return bytesToHex((0, exports.encodeToBytes)(header, fields));
};
exports.bitcoinEncode = bitcoinEncode;
// Main Encoding Function
const encodeToBytes = (header, fields) => {
    if (!header || !fields) {
        throw new Error("Header and fields are required");
    }
    // Construct Header Bytes
    const headerBytes = new Uint8Array(4);
    headerBytes[0] = MemoIdentifier;
    headerBytes[1] = (0x00 << 4) | (header.encodingFmt & 0x0f);
    headerBytes[2] = ((header.opCode & 0x0f) << 4) | 0x00;
    headerBytes[3] = 0b00000111;
    // Encode Fields
    let encodedFields;
    switch (header.encodingFmt) {
        case EncodingFormat.ABI:
            encodedFields = encodeFieldsABI(fields);
            break;
        case EncodingFormat.CompactShort:
        case EncodingFormat.CompactLong:
            encodedFields = encodeFieldsCompact(header.encodingFmt, fields);
            break;
        default:
            throw new Error("Unsupported encoding format");
    }
    // Combine Header and Fields
    return new Uint8Array(Buffer.concat([Buffer.from(headerBytes), Buffer.from(encodedFields)]));
};
exports.encodeToBytes = encodeToBytes;
// Helper: ABI Encoding
const encodeFieldsABI = (fields) => {
    const types = ["address", "bytes", "string"];
    const values = [fields.receiver, fields.payload, fields.revertAddress];
    const encodedData = new ethers_1.ethers.AbiCoder().encode(types, values);
    return Uint8Array.from(Buffer.from(encodedData.slice(2), "hex"));
};
// Helper: Compact Encoding
const encodeFieldsCompact = (compactFmt, fields) => {
    const encodedReceiver = Buffer.from(hexStringToBytes(fields.receiver));
    const encodedPayload = encodeDataCompact(compactFmt, fields.payload);
    const encodedRevertAddress = encodeDataCompact(compactFmt, new TextEncoder().encode(fields.revertAddress));
    return new Uint8Array(Buffer.concat([encodedReceiver, encodedPayload, encodedRevertAddress]));
};
// Helper: Compact Data Encoding
const encodeDataCompact = (compactFmt, data) => {
    const dataLen = data.length;
    let encodedLength;
    switch (compactFmt) {
        case EncodingFormat.CompactShort:
            if (dataLen > 255) {
                throw new Error("Data length exceeds 255 bytes for EncodingFmtCompactShort");
            }
            encodedLength = Buffer.from([dataLen]);
            break;
        case EncodingFormat.CompactLong:
            if (dataLen > 65535) {
                throw new Error("Data length exceeds 65535 bytes for EncodingFmtCompactLong");
            }
            encodedLength = Buffer.alloc(2);
            encodedLength.writeUInt16LE(dataLen);
            break;
        default:
            throw new Error("Unsupported compact format");
    }
    return Buffer.concat([encodedLength, Buffer.from(data)]);
};
const hexStringToBytes = (hexString) => {
    if (hexString.length % 2 !== 0) {
        throw new Error("Hex string must have an even length");
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return bytes;
};
const bytesToHex = (bytes) => {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0")) // Convert each byte to a 2-digit hex
        .join("");
};
