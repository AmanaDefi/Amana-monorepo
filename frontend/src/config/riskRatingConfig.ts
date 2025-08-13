// Risk Rating Configuration
export const RISK_RATING_CONFIG = {
  // Enable/disable risk ratings globally
  enabled: true,
  
  // Show protocol risk ratings
  showProtocolRisk: true,
  
  // Show asset risk ratings
  showAssetRisk: true,
  
  // Cache duration in milliseconds (48 hours - 2 days)
  cacheDuration: 48 * 60 * 60 * 1000,
  
  // Batch size for API calls (keep minimal to respect small rate limits)
  batchSize: 1,
  
  // Retry configuration
  maxRetries: 3,
  retryDelay: 2000,
  
  // Rate limiting delay between batches (ms)
  batchDelay: 1500,
  
  // API timeout (ms)
  timeout: 30000,
  
  // Global cooldown applied when upstream reports rate limiting
  globalCooldownOnRateLimitMs: 60 * 60 * 1000, // 1 hour

  // Debug: fetch only a specific vaultId (lowercased). Set to null to disable.
  // Fluid USDC (Base) Amana vault id from subgraph mapping.ts
  debugOnlyVaultId: '0xe5fa0e4ba13d516908c5313b3375b7ede24bfe7a',
} as const;

// Feature flags for different risk rating displays
export const RISK_RATING_FEATURES = {
  // Show risk ratings in vault grid
  showInGrid: true,
  
  // Show risk ratings in vault details
  showInDetails: true,
  
  // Show risk ratings in vault overview
  showInOverview: true,
  
  // Show Exponential attribution
  showAttribution: true,
  
  // Show links to Exponential pages
  showLinks: true,
} as const;
