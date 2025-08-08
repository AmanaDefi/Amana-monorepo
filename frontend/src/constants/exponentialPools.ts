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
};
