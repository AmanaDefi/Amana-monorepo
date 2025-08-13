export type ExponentialPoolMapping = {
  poolToken: string; // Exponential pool token address
  protocol?: string; // hint; defaults to our protocol mapping
  blockchain?: string; // hint; defaults to mapped chain name
};

// Map our vault.id (Amana vault address) -> Exponential pool token address
export const VAULT_TO_EXPONENTIAL_POOL: Record<string, ExponentialPoolMapping> = {
  // Fluid USDC (Base)
  // Amana vault id (from subgraph mapping.ts): 0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69
  // Exponential Fluid USDC pool token: 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169
  '0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69': {
    poolToken: '0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169',
    protocol: 'fluid',
    blockchain: 'ethereum', // Base L2
  },
  
  // Aave USDT (BNB)
  // Amana vault id: 0xe5fa0e4ba13d516908c5313b3375b7ede24bfe7a
  // Trying USDT token address as pool token since that's what Exponential might expect
  '0xe5fa0e4ba13d516908c5313b3375b7ede24bfe7a': {
    poolToken: '0xa9251ca9DE909CB71783723713B21E4233fbf1B1', // USDT token address
    protocol: 'aave',
    blockchain: 'bsc',
  },
};
