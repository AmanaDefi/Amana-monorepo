/**
 * Generate a Bitcoin address from a private key
 *
 * @param pk - Private key in hex format
 * @param network - Bitcoin network ("mainnet" or "testnet")
 * @returns The generated Bitcoin address
 */
export declare const generateBitcoinAddress: (pk: string, network: "mainnet" | "testnet") => string;
