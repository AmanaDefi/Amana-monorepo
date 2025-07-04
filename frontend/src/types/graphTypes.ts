export interface GraphVault {
  id: string;
  name: string;
  symbol: string;
  type?: string;
  description?: string;
  imgURL?: string;
  depositFeePaidFromGasTank: boolean;
  asset: string; // Bytes! in schema
  assetSymbol: string;
  assetDecimals: number;
  assetImgURL?: string;
  assetPrice?: string; // BigDecimal in schema 
  decimals: number; // Int! in schema
  strategy?: string; // Bytes in schema
  strategyNetwork?: string;
  strategyChainId?: number; // Int in schema
  protocolName?: string;
  protocolImgURL?: string;
  protocolDescription?: string;
  networkDescription?: string;
  rewardsContractAddress?: string; // Bytes in schema
  treasury?: string; // Bytes in schema
  perfFee: string;
  createdAtBlock: string;
  createdAtTimestamp: string;
  tvl: string;
  totalDeposited: string;
  totalWithdrawn: string;
  sharesSupply: string;
  pricePerShare: string;
  apy7d: string;
  apy30d?: string;
  riskLevel?: number;
  protocolPoints?: number;
  protocolPointsDescription?: string;
  cooldownPeriod?: number;
  minDeposit?: number;
  maxWithdraw?: number;
}

export interface GraphUserPosition {
  id: string;
  vault: {
    id: string;
    name: string;
    symbol: string;
    assetSymbol: string;
    assetDecimals: number;
    imgURL?: string;
  };
  user: string;
  sharesBalance: string;
  assetsBalance: string;
  totalDeposited: string;
  totalWithdrawn: string;
  totalSharesReceived: string;
  totalSharesRedeemed: string;
  firstDepositAt: string;
  lastInteractionAt: string;
  depositCount: number;
  withdrawalCount: number;
  balanceUSD?: string;
}

export interface GraphDeposit {
  id: string;
  vault: {
    id: string;
    name: string;
    symbol: string;
    assetSymbol: string;
    assetDecimals: number;
  };
  user: string;
  amount: string;
  shares: string;
  vaultNonce: string;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
  pricePerShare: string;
}

export interface GraphWithdrawal {
  id: string;
  vault: {
    id: string;
    name: string;
    symbol: string;
    assetSymbol: string;
    assetDecimals: number;
  };
  user: string;
  amount: string;
  shares: string;
  vaultNonce: string;
  blockNumber: string;
  timestamp: string;
  transactionHash: string;
  pricePerShare: string;
}

export interface GetVaultsResponse {
  vaults: GraphVault[];
}

export interface GetVaultDetailsResponse {
  vault: GraphVault;
}

export interface GetUserPositionsResponse {
  userPositions: GraphUserPosition[];
}

export interface GetUserTransactionsResponse {
  deposits: GraphDeposit[];
  withdrawals: GraphWithdrawal[];
}
