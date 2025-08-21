// Exponential Risk Ratings API Types

export interface ExponentialRiskRequest {
  token_address: string;
  blockchain: string;
  protocol: string;
}

export interface ExponentialRiskResponse {
  data?: {
    pool_rating?: string;
    pool_rating_color?: string;
    pool_rating_description?: string;
    pool_url?: string;
  };
}

export interface ExponentialRiskRating {
  poolRating?: string;
  poolRatingColor?: string;
  poolRatingDescription?: string;
  poolUrl?: string;
}
