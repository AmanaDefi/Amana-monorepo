import type { BitcoinTxParams } from "../types/bitcoin.types";
export declare const getDepositFee: (api: string) => Promise<number>;
export declare const bitcoinMakeTransactionWithMemo: (params: BitcoinTxParams) => Promise<string>;