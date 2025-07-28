import { 
  calculateEMA, 
  calculateConfidence, 
  calculateTrend, 
  predict30DayAPY,
  formatPrediction,
  getPredictionColorClass 
} from '../prediction';

describe('Prediction Utilities', () => {
  describe('calculateEMA', () => {
    it('should return 0 for empty array', () => {
      expect(calculateEMA([])).toBe(0);
    });

    it('should return the value for single element', () => {
      expect(calculateEMA([0.05])).toBe(0.05);
    });

    it('should calculate EMA correctly for multiple values', () => {
      const historicalAPY = [0.04, 0.05, 0.06, 0.04, 0.07];
      const ema = calculateEMA(historicalAPY);
      
      // EMA should be a weighted average, not just the last value
      expect(ema).toBeGreaterThan(0);
      expect(ema).toBeLessThan(0.1);
      expect(typeof ema).toBe('number');
    });

    it('should handle different smoothing factors', () => {
      const historicalAPY = [0.04, 0.05, 0.06];
      const ema1 = calculateEMA(historicalAPY, 12, 0.1);
      const ema2 = calculateEMA(historicalAPY, 12, 0.3);
      
      expect(ema1).not.toBe(ema2);
    });
  });

  describe('calculateConfidence', () => {
    it('should return low confidence for insufficient data', () => {
      expect(calculateConfidence([0.05, 0.06])).toBe(0.3);
    });

    it('should return medium confidence for moderate data', () => {
      const moderateData = Array.from({ length: 10 }, (_, i) => 0.05 + (i * 0.001));
      expect(calculateConfidence(moderateData)).toBe(0.6);
    });

    it('should return higher confidence for more data points', () => {
      const moreData = Array.from({ length: 20 }, (_, i) => 0.05 + (i * 0.001));
      const confidence = calculateConfidence(moreData);
      expect(confidence).toBeGreaterThan(0.6);
    });

    it('should handle stable vs volatile data', () => {
      const stableData = Array.from({ length: 15 }, () => 0.05);
      const volatileData = [0.02, 0.08, 0.03, 0.07, 0.04, 0.06, 0.05, 0.09, 0.01, 0.08, 0.03, 0.07, 0.04, 0.06, 0.05];
      
      const stableConfidence = calculateConfidence(stableData);
      const volatileConfidence = calculateConfidence(volatileData);
      
      expect(stableConfidence).toBeGreaterThan(volatileConfidence);
    });
  });

  describe('calculateTrend', () => {
    it('should return stable for insufficient data', () => {
      expect(calculateTrend([0.05, 0.06])).toBe('stable');
    });

    it('should detect increasing trend', () => {
      const increasingData = [0.04, 0.05, 0.06, 0.07, 0.08, 0.09, 0.10];
      expect(calculateTrend(increasingData)).toBe('increasing');
    });

    it('should detect decreasing trend', () => {
      const decreasingData = [0.10, 0.09, 0.08, 0.07, 0.06, 0.05, 0.04];
      expect(calculateTrend(decreasingData)).toBe('decreasing');
    });

    it('should detect stable trend', () => {
      const stableData = [0.05, 0.051, 0.049, 0.052, 0.048, 0.053, 0.047];
      expect(calculateTrend(stableData)).toBe('stable');
    });
  });

  describe('predict30DayAPY', () => {
    it('should handle empty input', () => {
      const result = predict30DayAPY([]);
      expect(result.predictedAPY).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.trend).toBe('stable');
    });

    it('should handle null input', () => {
      const result = predict30DayAPY(null as any);
      expect(result.predictedAPY).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.trend).toBe('stable');
    });

    it('should filter out invalid values', () => {
      const invalidData = [0.05, NaN, Infinity, -0.01, 0.06, null as any, undefined as any];
      const result = predict30DayAPY(invalidData);
      
      expect(result.predictedAPY).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should generate complete prediction result', () => {
      const historicalAPY = [0.04, 0.05, 0.06, 0.04, 0.07, 0.05, 0.06, 0.08, 0.05, 0.07];
      const result = predict30DayAPY(historicalAPY);
      
      expect(result).toHaveProperty('predictedAPY');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('lastUpdated');
      
      expect(typeof result.predictedAPY).toBe('number');
      expect(typeof result.confidence).toBe('number');
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('formatPrediction', () => {
    it('should return N/A for low confidence', () => {
      const lowConfidencePrediction = {
        predictedAPY: 0.05,
        confidence: 0.2,
        trend: 'stable' as const,
        lastUpdated: new Date()
      };
      expect(formatPrediction(lowConfidencePrediction)).toBe('N/A');
    });

    it('should format high confidence prediction', () => {
      const highConfidencePrediction = {
        predictedAPY: 0.0523,
        confidence: 0.8,
        trend: 'increasing' as const,
        lastUpdated: new Date()
      };
      expect(formatPrediction(highConfidencePrediction)).toBe('5.23%');
    });
  });

  describe('getPredictionColorClass', () => {
    it('should return gray for low confidence', () => {
      const lowConfidencePrediction = {
        predictedAPY: 0.05,
        confidence: 0.2,
        trend: 'stable' as const,
        lastUpdated: new Date()
      };
      expect(getPredictionColorClass(lowConfidencePrediction)).toBe('text-gray-400');
    });

    it('should return green for increasing trend', () => {
      const increasingPrediction = {
        predictedAPY: 0.05,
        confidence: 0.8,
        trend: 'increasing' as const,
        lastUpdated: new Date()
      };
      expect(getPredictionColorClass(increasingPrediction)).toBe('text-[#05D47F]');
    });

    it('should return red for decreasing trend', () => {
      const decreasingPrediction = {
        predictedAPY: 0.05,
        confidence: 0.8,
        trend: 'decreasing' as const,
        lastUpdated: new Date()
      };
      expect(getPredictionColorClass(decreasingPrediction)).toBe('text-[#FF1E1E]');
    });

    it('should return white for stable trend', () => {
      const stablePrediction = {
        predictedAPY: 0.05,
        confidence: 0.8,
        trend: 'stable' as const,
        lastUpdated: new Date()
      };
      expect(getPredictionColorClass(stablePrediction)).toBe('text-white');
    });
  });
}); 