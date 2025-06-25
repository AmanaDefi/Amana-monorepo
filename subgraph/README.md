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
4. Name the subgraph, as example: `amana-zetachain`
5. Set zetachain as network
6. Visit endpoints page at [The Graph Studio](https://thegraph.com/studio/), copy Bearer token and 
Development Query URL (you could select version of subgraph here),
Set Frontend env vars accordingly:
NEXT_PUBLIC_GRAPH_URL
NEXT_PUBLIC_GRAPH_API_KEY
7. Copy the Authenticate Key from details page [The Graph Studio](https://thegraph.com/studio/) 

### 3. Configure API

Create a `.env` file in the project root by subgraph\.env.example and paste Authenticate Key

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
graph auth YOUR_AUTH_KEY

#code generation
graph codegen && graph build

# Deploy
graph deploy amana-zetachain
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
    pricePerShare
    totalDeposited
    totalWithdrawn
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