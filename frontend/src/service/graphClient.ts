import { GraphQLClient } from 'graphql-request';
import { GRAPH_URL, GRAPH_API_KEY } from '@/config.ts/apiConfig';
import {
  GetVaultsResponse,
  GetVaultDetailsResponse,
  GetUserPositionsResponse,
  GetUserTransactionsResponse,
} from '@/types/graphTypes';

class GraphClient {
  private client: GraphQLClient;

  constructor() {
    const headers: Record<string, string> = {};

    if (GRAPH_API_KEY) {
      headers['Authorization'] = `Bearer ${GRAPH_API_KEY}`;
    }

    this.client = new GraphQLClient(GRAPH_URL, {
      headers
    });
  }

  async getVaults(): Promise<GetVaultsResponse> {
    const query = `
      query GetVaults {
        vaults(orderBy: tvl, orderDirection: desc) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    return this.client.request(query) as Promise<GetVaultsResponse>;
  }

  async getVaultsPaginated(
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const query = `
      query GetVaultsPaginated($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async searchVaultsPaginated(
    searchTerm: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let whereClause = '';
    if (isFullAddressSearch) {
      whereClause = `where: { id: "${searchTerm.toLowerCase()}" }`;
    } else if (isPartialAddressSearch) {
      whereClause = `where: { id_contains: "${searchTerm.toLowerCase()}" }`;
    } else {
      whereClause = `where: { name_contains_nocase: "${searchTerm}" }`;
    }

    const query = `
      query SearchVaultsPaginated($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          ${whereClause}
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;
    return result;
  }

  async getSearchVaultsCount(searchTerm: string): Promise<{ vaults: Array<{ id: string }> }> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let whereClause = '';
    if (isFullAddressSearch) {
      whereClause = `where: { id: "${searchTerm.toLowerCase()}" }`;
    } else if (isPartialAddressSearch) {
      whereClause = `where: { id_contains: "${searchTerm.toLowerCase()}" }`;
    } else {
      whereClause = `where: { name_contains_nocase: "${searchTerm}" }`;
    }

    const query = `
      query GetSearchVaultsCount {
        vaults(${whereClause}) {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async getVaultsCount(): Promise<{ vaults: Array<{ id: string }> }> {
    const query = `
      query GetVaultsCount {
        vaults {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async getVaultDetails(vaultId: string): Promise<GetVaultDetailsResponse> {
    const query = `
      query GetVaultDetails($vaultId: ID!) {
        vault(id: $vaultId) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    return this.client.request(query, { vaultId }) as Promise<GetVaultDetailsResponse>;
  }

  async getUserPositions(userAddress: string): Promise<GetUserPositionsResponse> {
    const query = `
      query GetUserPositions($userAddress: Bytes!) {
        userPositions(where: { user: $userAddress, sharesBalance_gt: "0" }) {
          id
          vault {
            id
            name
            symbol
            assetSymbol
            assetDecimals
            imgURL
          }
          user
          sharesBalance
          assetsBalance
          totalDeposited
          totalWithdrawn
          totalSharesReceived
          totalSharesRedeemed
          firstDepositAt
          lastInteractionAt
          depositCount
          withdrawalCount
        }
      }
    `;

    return this.client.request(query, { userAddress: userAddress.toLowerCase() }) as Promise<GetUserPositionsResponse>;
  }

  async getUserTransactions(userAddress: string, first: number = 20, skip: number = 0): Promise<GetUserTransactionsResponse> {
    const query = `
      query GetUserTransactions($userAddress: Bytes!, $first: Int!, $skip: Int!) {
        deposits(
          where: { user: $userAddress }
          orderBy: timestamp
          orderDirection: desc
          first: $first
          skip: $skip
        ) {
          id
          vault {
            id
            name
            symbol
            assetSymbol
            assetDecimals
          }
          user
          amount
          shares
          vaultNonce
          blockNumber
          timestamp
          transactionHash
          pricePerShare
        }
        withdrawals(
          where: { user: $userAddress }
          orderBy: timestamp
          orderDirection: desc
          first: $first
          skip: $skip
        ) {
          id
          vault {
            id
            name
            symbol
            assetSymbol
            assetDecimals
          }
          user
          amount
          shares
          vaultNonce
          blockNumber
          timestamp
          transactionHash
          pricePerShare
        }
      }
    `;

    return this.client.request(query, {
      userAddress: userAddress.toLowerCase(),
      first,
      skip
    }) as Promise<GetUserTransactionsResponse>;
  }

  async getVaultsByNetwork(
    network: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const query = `
      query GetVaultsByNetwork($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          where: { strategyNetwork: "${network}" }
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async getVaultsByNetworkCount(network: string): Promise<{ vaults: Array<{ id: string }> }> {
    const query = `
      query GetVaultsByNetworkCount {
        vaults(where: { strategyNetwork: "${network}" }) {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async searchVaultsPaginatedWithNetwork(
    searchTerm: string,
    network: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let searchClause = '';
    if (isFullAddressSearch) {
      searchClause = `id: "${searchTerm.toLowerCase()}"`;
    } else if (isPartialAddressSearch) {
      searchClause = `id_contains: "${searchTerm.toLowerCase()}"`;
    } else {
      searchClause = `name_contains_nocase: "${searchTerm}"`;
    }

    const whereClause = `where: { ${searchClause}, strategyNetwork: "${network}" }`;

    const query = `
      query SearchVaultsPaginatedWithNetwork($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          ${whereClause}
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async getSearchVaultsWithNetworkCount(searchTerm: string, network: string): Promise<{ vaults: Array<{ id: string }> }> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let searchClause = '';
    if (isFullAddressSearch) {
      searchClause = `id: "${searchTerm.toLowerCase()}"`;
    } else if (isPartialAddressSearch) {
      searchClause = `id_contains: "${searchTerm.toLowerCase()}"`;
    } else {
      searchClause = `name_contains_nocase: "${searchTerm}"`;
    }

    const whereClause = `where: { ${searchClause}, strategyNetwork: "${network}" }`;

    const query = `
      query GetSearchVaultsWithNetworkCount {
        vaults(${whereClause}) {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async getVaultsByProtocol(
    protocol: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const query = `
      query GetVaultsByProtocol($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          where: { protocolName: "${protocol}" }
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async getVaultsByProtocolCount(protocol: string): Promise<{ vaults: Array<{ id: string }> }> {
    const query = `
      query GetVaultsByProtocolCount {
        vaults(where: { protocolName: "${protocol}" }) {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async searchVaultsPaginatedWithProtocol(
    searchTerm: string,
    protocol: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let searchClause = '';
    if (isFullAddressSearch) {
      searchClause = `id: "${searchTerm.toLowerCase()}"`;
    } else if (isPartialAddressSearch) {
      searchClause = `id_contains: "${searchTerm.toLowerCase()}"`;
    } else {
      searchClause = `name_contains_nocase: "${searchTerm}"`;
    }

    const whereClause = `where: { ${searchClause}, protocolName: "${protocol}" }`;

    const query = `
      query SearchVaultsPaginatedWithProtocol($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          ${whereClause}
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };
    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async getSearchVaultsWithProtocolCount(searchTerm: string, protocol: string): Promise<{ vaults: Array<{ id: string }> }> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let searchClause = '';
    if (isFullAddressSearch) {
      searchClause = `id: "${searchTerm.toLowerCase()}"`;
    } else if (isPartialAddressSearch) {
      searchClause = `id_contains: "${searchTerm.toLowerCase()}"`;
    } else {
      searchClause = `name_contains_nocase: "${searchTerm}"`;
    }

    const whereClause = `where: { ${searchClause}, protocolName: "${protocol}" }`;

    const query = `
      query GetSearchVaultsWithProtocolCount {
        vaults(${whereClause}) {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async getVaultsByNetworkAndProtocol(
    network: string,
    protocol: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const query = `
      query GetVaultsByNetworkAndProtocol($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          where: { strategyNetwork: "${network}", protocolName: "${protocol}" }
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async getVaultsByNetworkAndProtocolCount(network: string, protocol: string): Promise<{ vaults: Array<{ id: string }> }> {
    const query = `
      query GetVaultsByNetworkAndProtocolCount {
        vaults(where: { strategyNetwork: "${network}", protocolName: "${protocol}" }) {
          id
        }
      }
    `;
    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }

  async searchVaultsPaginatedWithNetworkAndProtocol(
    searchTerm: string,
    network: string,
    protocol: string,
    first: number = 10,
    skip: number = 0,
    orderBy: string = 'tvl',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<GetVaultsResponse> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let searchClause = '';
    if (isFullAddressSearch) {
      searchClause = `id: "${searchTerm.toLowerCase()}"`;
    } else if (isPartialAddressSearch) {
      searchClause = `id_contains: "${searchTerm.toLowerCase()}"`;
    } else {
      searchClause = `name_contains_nocase: "${searchTerm}"`;
    }

    const whereClause = `where: { ${searchClause}, strategyNetwork: "${network}", protocolName: "${protocol}" }`;

    const query = `
      query SearchVaultsPaginatedWithNetworkAndProtocol($first: Int!, $skip: Int!, $orderBy: String!, $orderDirection: String!) {
        vaults(
          ${whereClause}
          first: $first, 
          skip: $skip, 
          orderBy: $orderBy, 
          orderDirection: $orderDirection
        ) {
          id
          name
          symbol
          type
          description
          imgURL
          depositFeePaidFromGasTank
          asset
          assetSymbol
          assetDecimals
          assetImgURL
          assetPrice
          decimals
          strategy
          strategyNetwork
          strategyChainId
          protocolName
          protocolImgURL
          protocolDescription
          networkDescription
          rewardsContractAddress
          treasury
          perfFee
          createdAtBlock
          createdAtTimestamp
          tvl
          totalDeposited
          totalWithdrawn
          sharesSupply
          pricePerShare
          apy7d
          apy30d
          riskLevel
        }
      }
    `;

    const variables = { first, skip, orderBy, orderDirection };

    const result = this.client.request(query, variables) as Promise<GetVaultsResponse>;

    return result;
  }

  async getSearchVaultsWithNetworkAndProtocolCount(searchTerm: string, network: string, protocol: string): Promise<{ vaults: Array<{ id: string }> }> {
    const isFullAddressSearch = searchTerm.startsWith('0x') && searchTerm.length === 42;
    const isPartialAddressSearch = searchTerm.startsWith('0x') && searchTerm.length > 2 && searchTerm.length < 42;

    let searchClause = '';
    if (isFullAddressSearch) {
      searchClause = `id: "${searchTerm.toLowerCase()}"`;
    } else if (isPartialAddressSearch) {
      searchClause = `id_contains: "${searchTerm.toLowerCase()}"`;
    } else {
      searchClause = `name_contains_nocase: "${searchTerm}"`;
    }

    const whereClause = `where: { ${searchClause}, strategyNetwork: "${network}", protocolName: "${protocol}" }`;

    const query = `
      query GetSearchVaultsWithNetworkAndProtocolCount {
        vaults(${whereClause}) {
          id
        }
      }
    `;

    const result = this.client.request(query) as Promise<{ vaults: Array<{ id: string }> }>;

    return result;
  }
}

export const graphClient = new GraphClient(); 