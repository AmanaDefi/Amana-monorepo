export type Address = string;
export type BtcAddress = string;
export declare enum OpCode {
    Call = 2,
    Deposit = 0,
    DepositAndCall = 1,
    Invalid = 3
}
export declare enum EncodingFormat {
    ABI = 0,
    CompactLong = 2,
    CompactShort = 1
}
declare class Header {
    encodingFmt: EncodingFormat;
    opCode: OpCode;
    constructor(encodingFmt: EncodingFormat, opCode: OpCode);
}
declare class FieldsV0 {
    receiver: Address;
    payload: Buffer;
    revertAddress: BtcAddress;
    constructor(receiver: Address, payload: Buffer, revertAddress: BtcAddress);
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
export declare const bitcoinEncode: (receiver: Address, payload: Buffer, revertAddress: BtcAddress, opCode?: OpCode, encodingFormat?: EncodingFormat) => string;
export declare const encodeToBytes: (header: Header, fields: FieldsV0) => Uint8Array;
export {};
