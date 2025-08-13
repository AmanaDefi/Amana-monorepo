// Exponential Risk Ratings API Types

export interface ExponentialRiskRequest {
  token_address: string;
  blockchain: string;
  protocol?: string;
  tvl?: string;
  assets?: string[];
}

export interface ExponentialRiskResponse {
  data: {
    pool_rating?: string;
    pool_rating_color?: string;
    pool_rating_description?: string;
    pool_url?: string;
    chain?: {
      rating?: string;
      rating_color?: string;
      underlying?: Array<{
        name?: string;
        rating?: string;
        rating_color?: string;
        url?: string | null;
      }>;
    };
  };
  assets?: {
    rating?: string;
    rating_color?: string;
    underlying?: Array<{
      name?: string;
      rating?: string;
      rating_color?: string;
      url?: string;
    }>;
  };
  protocols?: {
    rating?: string;
    rating_color?: string;
    underlying?: Array<{
      name?: string;
      rating?: string;
      rating_color?: string;
      url?: string;
    }>;
  };
}

export interface ExponentialRiskRating {
  poolRating?: string;
  poolRatingColor?: string;
  poolRatingDescription?: string;
  poolUrl?: string;
  chainRating?: string;
  chainRatingColor?: string;
  assetRating?: string;
  assetRatingColor?: string;
  protocolRating?: string;
  protocolRatingColor?: string;
  protocolUrl?: string;
  assetUrl?: string;
}

// Risk level mapping from Exponential to your current A/B/C format
export const EXPONENTIAL_TO_RISK_LEVEL: Record<string, number> = {
  'A': 1,
  'B': 2,
  'C': 3,
  'D': 3,
  'F': 3,
  'Best': 1,
  'Good': 2,
  'Average': 3,
  'Watch Out': 3,
};

// Blockchain name mapping
export const BLOCKCHAIN_MAPPING: Record<string, string> = {
  'Base': 'base', 
  'Ethereum': 'ethereum',
  'Polygon': 'polygon',
  'BSC': 'bsc',
  'Arbitrum': 'arbitrum',
  'Avalanche': 'avalanche',
  'ZetaChain': 'zetachain',
};

// Protocol name mapping
export const PROTOCOL_MAPPING: Record<string, string> = {
  'Aave': 'aave',
  'Compound': 'compound',
  'Euler': 'euler',
  'Venus': 'venus',
  'Fluid': 'fluid',
  'ZeroLend': 'zerolend',
  'Aegis': 'aegis',
  'Curve': 'curve',
  'Convex': 'convex',
  'Balancer': 'balancer',
  'YieldFi': 'yieldfi',
  'NoonCapitals': 'nooncapitals',
};
