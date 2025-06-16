# Amana ZetaChain Subgraph

This subgraph indexes all Amana Vaults on ZetaChain, providing comprehensive data about vault operations, user positions, and cross-chain strategies.

## Setup

### 1. Install Dependencies
```bash
yarn install
```

### 2. Create Subgraph in The Graph Studio (optional)

1. Go to [The Graph Studio](https://thegraph.com/studio/)
2. Connect your wallet
3. Click "Create a Subgraph"
4. Name the subgraph: `amana-zetachain`
5. Copy the Deploy Key from Studio

### 3. Configure API Key

Create a `.env` file in the project root

### 4. Generate Types (optional, deploy will do this)
```bash
yarn codegen
```

### 5. Build Subgraph (optional, deploy will do this)
```bash
yarn build
```

## Deployment

### Automatic Deploy (Windows)
```bash
yarn deploy
```

### Manual Deploy
```bash
# Authentication
graph auth YOUR_DEPLOY_KEY

# Deploy
graph deploy amana/amana-zetachain --access-token YOUR_DEPLOY_KEY
```

### Unix/Linux/Mac
```bash
yarn deploy:unix
```

## After Deployment

1. The subgraph will synchronize with the blockchain
2. Check the status on The Graph Studio
3. After synchronization, the subgraph will be available for queries

## Architecture

- **Cross-chain Vaults** with various DeFi strategies
- **Network:** ZetaChain (omnichain hub)
- **Indexed Events:**
  - `VaultInitialized` - vault creation
  - `Deposited` - user deposits
  - `Withdrawn` - fund withdrawals
  - `StrategyUpdated` - strategy changes

## GraphQL Queries

### Complete Vault Data (Frontend Integration Ready)
```graphql
query GetVaultsForFrontend {
  vaults {
    # Basic vault info
    id
    name
    symbol
    type
    description
    imgURL
    depositFeePaidFromGasTank
    
    # Asset token info (matches inputToken in frontend)
    asset
    assetSymbol
    assetDecimals
    assetImgURL
    assetPrice
    
    # Protocol info
    protocolName
    protocolImgURL
    protocolDescription
    strategy
    strategyNetwork
    strategyChainId
    networkDescription
    rewardsContractAddress
    
    # Financial data
    tvl
    sharesSupply
    pricePerShare
    apy7d
    apy30d
    totalDeposited
    totalWithdrawn
    riskLevel
    
    # Metadata
    createdAtTimestamp
    perfFee
  }
}
```

### User-Specific Data
```graphql
query GetUserVaultData($userAddress: Bytes!) {
  # User positions
  userPositions(where: { user: $userAddress, sharesBalance_gt: "0" }) {
    id
    vault {
      id
      name
      symbol
      type
      imgURL
      assetSymbol
      assetImgURL
      protocolName
      protocolImgURL
      strategyNetwork
    }
    sharesBalance
    assetsBalance
    totalDeposited
    totalWithdrawn
    firstDepositAt
    lastInteractionAt
    depositCount
    withdrawalCount
  }
  
  # Recent user transactions
  deposits(
    where: { user: $userAddress }
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    vault {
      name
      symbol
      assetSymbol
    }
    amount
    shares
    timestamp
    pricePerShare
    crossChainTxId
    transactionHash
  }
  
  withdrawals(
    where: { user: $userAddress }
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    vault {
      name
      symbol
      assetSymbol
    }
    amount
    shares
    timestamp
    pricePerShare
    crossChainTxId
    transactionHash
  }
}
```

### Vault Analytics
```graphql
query GetVaultAnalytics($vaultId: ID!) {
  vault(id: $vaultId) {
    id
    name
    symbol
    tvl
    totalDeposited
    totalWithdrawn
    sharesSupply
    pricePerShare
    apy7d
    apy30d
    
    # Daily data for charts
    vaultDayDatas(
      first: 30
      orderBy: date
      orderDirection: desc
    ) {
      date
      tvl
      pricePerShare
      dailyDeposit
      dailyWithdraw
      uniqueDepositors
      uniqueWithdrawers
    }
  }
}
```

### Frontend Integration Helper Query
```graphql
query GetVaultDataForComponent($vaultIds: [ID!]!) {
  vaults(where: { id_in: $vaultIds }) {
    # Exact match for VaultData interface
    id
    name
    type
    symbol
    description: description
    imgURL
    depositFeePaidFromGasTank
    
    # InputToken equivalent
    inputToken: {
      symbol: assetSymbol
      decimals: assetDecimals
      address: asset
      imgURL: assetImgURL
      price: assetPrice
    }
    
    # Protocol equivalent
    protocol: {
      name: protocolName
      strategyAddress: strategy
      rewardsContractAddress: rewardsContractAddress
      network: strategyNetwork
      chainId: strategyChainId
      netdes: networkDescription
      imgURL: protocolImgURL
      des: protocolDescription
    }
    
    # Financial metrics
    tvl
    apy7d
    pricePerShare
    totalDeposited
    totalWithdrawn
    riskLevel
  }
}
```

### Performance Metrics
```graphql
query GetVaultPerformance {
  vaults(orderBy: apy7d, orderDirection: desc) {
    id
    name
    symbol
    protocolName
    strategyNetwork
    tvl
    apy7d
    apy30d
    pricePerShare
    totalDeposited
    riskLevel
  }
}
```

### Cross-Chain Overview
```graphql
query GetCrossChainVaults {
  vaults {
    id
    name
    protocolName
    strategyNetwork
    strategyChainId
    tvl
    apy7d
    
    # Group by network
    deposits(first: 1, orderBy: timestamp, orderDirection: desc) {
      crossChainTxId
      timestamp
    }
  }
}
```

### Basic Vault Information
```graphql
query GetVaults {
  vaults {
    id
    name
    symbol
    strategyNetwork  # "Base", "Ethereum", "Polygon", etc.
    tvl
    sharesSupply
    pricePerShare
    apy7d
    totalDeposited
    totalWithdrawn
  }
}
```

### User Positions
```graphql
query GetUserPositions($user: Bytes!) {
  userPositions(where: { user: $user, sharesBalance_gt: "0" }) {
    id
    vault {
      name
      symbol
    }
    sharesBalance
    assetsBalance
    totalDeposited
    totalWithdrawn
    firstDepositAt
    lastInteractionAt
  }
}
```

### Recent Transactions
```graphql
query GetRecentDeposits {
  deposits(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    user
    amount
    shares
    timestamp
    vault {
      name
      symbol
    }
    pricePerShare
  }
}
```

## Current Vaults

The subgraph tracks cross-chain vaults deployed on ZetaChain that interact with various DeFi protocols:

| Vault Name | Strategy Network | Protocol | Asset |
|------------|------------------|----------|-------|
| Venus USDT | BSC | Venus | USDT |
| Euler USDC | Base | Euler | USDC |
| Mock USDC | ZetaChain | Mock (Testing) | USDC |

*Note: Vault addresses and strategies are dynamically indexed from on-chain events*

## Data Structure

### Vault Entity
- **Basic Info**: name, symbol, asset, decimals
- **Financial Data**: TVL, shares supply, price per share
- **Performance**: 7-day APY calculation
- **Strategy Info**: current strategy address and network
- **Lifecycle**: total deposited/withdrawn amounts

### User Position Entity
- **Balances**: current shares and assets balance
- **History**: lifetime deposits, withdrawals, and share movements
- **Timestamps**: first deposit and last interaction tracking
- **Statistics**: deposit/withdrawal counts

### Transaction Entities
- **Deposits**: asset amounts, shares received, cross-chain tx IDs
- **Withdrawals**: asset amounts, shares redeemed, cross-chain tx IDs
- **Pricing**: price per share at transaction time

### Daily Aggregates
- **Vault Day Data**: daily TVL, volume, unique users
- **User Position Day Data**: daily balance snapshots

## Testing Queries

You can test the subgraph using the provided test queries in `test-queries.md` or directly in The Graph Studio playground.

## Troubleshooting

### "Subgraph not found" Error
- Ensure you created the subgraph in The Graph Studio
- Verify the subgraph name matches: `amana-zetachain`
- Use the correct Deploy Key from Studio

### Authentication Issues
- Check that the API key is correctly saved in `.env`
- Ensure you're using the Deploy Key, not an API Key
- Verify the key has proper permissions

### Sync Issues
- Check if the starting block number is correct
- Verify contract addresses in `subgraph.yaml`
- Monitor indexing status in The Graph Studio

## Development

### Local Testing
```bash
# Run tests
yarn test

# Check schema
yarn codegen
```

### Updating Schema
1. Modify `schema.graphql`
2. Run `yarn codegen` to regenerate types
3. Update mapping files in `src/`
4. Test and deploy

## Cross-Chain Features

This subgraph specifically handles:
- **Omnichain deposits** from multiple networks
- **Cross-chain transaction tracking** via transaction IDs
- **Multi-network strategy monitoring**
- **Unified user position aggregation** across chains