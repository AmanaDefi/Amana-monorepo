/**
 * Prediction utilities for APY forecasting using historical data
 */

export interface PredictionResult {
  predictedAPY: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastUpdated: Date;
}

/**
 * Calculates Exponential Moving Average (EMA) for APY prediction
 * @param historicalAPY - Array of historical APY values (most recent last)
 * @param period - Number of periods for EMA calculation (default: 12 for 30-day prediction)
 * @param smoothingFactor - Smoothing factor between 0 and 1 (default: 0.15)
 * @returns Predicted APY value
 */
export function calculateEMA(
  historicalAPY: number[],
  period: number = 12,
  smoothingFactor: number = 0.15
): number {
  if (historicalAPY.length === 0) {
    return 0;
  }

  if (historicalAPY.length === 1) {
    return historicalAPY[0];
  }

  // Use the first value as the initial EMA
  let ema = historicalAPY[0];

  // Calculate EMA for the remaining values
  for (let i = 1; i < historicalAPY.length; i++) {
    ema = (historicalAPY[i] * smoothingFactor) + (ema * (1 - smoothingFactor));
  }

  return ema;
}

/**
 * Calculates prediction confidence based on data quality and volatility
 * @param historicalAPY - Array of historical APY values
 * @returns Confidence score between 0 and 1
 */
export function calculateConfidence(historicalAPY: number[]): number {
  if (historicalAPY.length < 7) {
    return 0.3; // Low confidence for insufficient data
  }

  if (historicalAPY.length < 14) {
    return 0.6; // Medium confidence for moderate data
  }

  // Calculate volatility (standard deviation)
  const mean = historicalAPY.reduce((sum, apy) => sum + apy, 0) / historicalAPY.length;
  const variance = historicalAPY.reduce((sum, apy) => sum + Math.pow(apy - mean, 2), 0) / historicalAPY.length;
  const volatility = Math.sqrt(variance);

  // Higher volatility = lower confidence
  const volatilityScore = Math.max(0, 1 - (volatility / mean));
  
  // More data points = higher confidence
  const dataScore = Math.min(1, historicalAPY.length / 30);
  
  return (volatilityScore * 0.7) + (dataScore * 0.3);
}

/**
 * Determines trend direction based on recent APY values
 * @param historicalAPY - Array of historical APY values (most recent last)
 * @param lookbackPeriod - Number of recent values to consider (default: 7)
 * @returns Trend direction
 */
export function calculateTrend(
  historicalAPY: number[],
  lookbackPeriod: number = 7
): 'increasing' | 'decreasing' | 'stable' {
  if (historicalAPY.length < lookbackPeriod) {
    return 'stable';
  }

  const recentValues = historicalAPY.slice(-lookbackPeriod);
  const firstHalf = recentValues.slice(0, Math.floor(lookbackPeriod / 2));
  const secondHalf = recentValues.slice(Math.floor(lookbackPeriod / 2));

  const firstHalfAvg = firstHalf.reduce((sum, apy) => sum + apy, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, apy) => sum + apy, 0) / secondHalf.length;

  const change = secondHalfAvg - firstHalfAvg;
  const threshold = firstHalfAvg * 0.05; // 5% threshold for trend detection

  if (change > threshold) {
    return 'increasing';
  } else if (change < -threshold) {
    return 'decreasing';
  } else {
    return 'stable';
  }
}

/**
 * Main function to generate 30-day APY prediction using EMA
 * @param historicalAPY - Array of historical APY values (most recent last)
 * @returns Prediction result with APY, confidence, and trend
 */
export function predict30DayAPY(historicalAPY: number[]): PredictionResult {
  if (!historicalAPY || historicalAPY.length === 0) {
    return {
      predictedAPY: 0,
      confidence: 0,
      trend: 'stable',
      lastUpdated: new Date()
    };
  }

  // Filter out invalid values
  const validAPY = historicalAPY.filter(apy => 
    typeof apy === 'number' && 
    !isNaN(apy) && 
    isFinite(apy) && 
    apy >= 0
  );

  if (validAPY.length === 0) {
    return {
      predictedAPY: 0,
      confidence: 0,
      trend: 'stable',
      lastUpdated: new Date()
    };
  }

  // Calculate EMA prediction
  const predictedAPY = calculateEMA(validAPY);
  
  // Calculate confidence
  const confidence = calculateConfidence(validAPY);
  
  // Calculate trend
  const trend = calculateTrend(validAPY);

  return {
    predictedAPY,
    confidence,
    trend,
    lastUpdated: new Date()
  };
}

/**
 * Formats prediction result for display
 * @param prediction - Prediction result
 * @returns Formatted string for display
 */
export function formatPrediction(prediction: PredictionResult): string {
  if (prediction.confidence < 0.3) {
    return 'N/A';
  }

  return `${(prediction.predictedAPY * 100).toFixed(2)}%`;
}

/**
 * Gets color class for prediction display based on trend
 * @param prediction - Prediction result
 * @returns CSS class for color styling
 */
export function getPredictionColorClass(prediction: PredictionResult): string {
  if (prediction.confidence < 0.3) {
    return 'text-gray-400';
  }

  switch (prediction.trend) {
    case 'increasing':
      return 'text-[#05D47F]';
    case 'decreasing':
      return 'text-[#FF1E1E]';
    default:
      return 'text-white';
  }
} 