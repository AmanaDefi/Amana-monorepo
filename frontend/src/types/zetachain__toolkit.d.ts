declare module '@zetachain/toolkit' {
  export function bitcoinDepositAndCall(params: {
    amount: number;
    recipient: string;
    message: string;
    bitcoinWallet: any;
    revertAddress: string;
  }): Promise<{
    hash: string;
    commitTxId?: string;
    revealTxId?: string;
  }>;
} 