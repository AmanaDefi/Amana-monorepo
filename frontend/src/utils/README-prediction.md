# APY Prediction Implementation

This implementation provides a 30-day APY prediction system using Exponential Moving Average (EMA) algorithm for vaults with historical APY data from DefiLlama and Noon Capital.

## Overview

The prediction system consists of three main components:

1. **Prediction Utilities** (`utils/prediction.ts`) - Core EMA algorithm and helper functions
2. **Prediction Hook** (`hooks/usePrediction.ts`) - React hook for managing prediction state
3. **VaultCard Integration** - UI integration in the vault card component

## Algorithm Details

### Exponential Moving Average (EMA)

The EMA algorithm is used to predict future APY values based on historical data. It applies more weight to recent data points while still considering older data.

**Formula:**
```
EMA = (Current Value × Smoothing Factor) + (Previous EMA × (1 - Smoothing Factor))
```

**Parameters:**
- **Smoothing Factor**: 0.15 (15% weight to current value, 85% to previous EMA)
- **Period**: 12 (optimized for 30-day predictions)
- **Initial EMA**: First historical value

### Confidence Calculation

Confidence is calculated based on:
1. **Data Quantity**: More data points = higher confidence
2. **Volatility**: Lower volatility = higher confidence
3. **Data Quality**: Valid, non-negative values

**Confidence Levels:**
- < 7 data points: 30% confidence
- 7-14 data points: 60% confidence
- > 14 data points: 70-100% confidence (based on volatility)

### Trend Detection

Trend is determined by comparing recent APY values:
- **Increasing**: Recent values > 5% higher than earlier values
- **Decreasing**: Recent values > 5% lower than earlier values
- **Stable**: Change within ±5% threshold

## Display Logic

### Text Colors
- **Green** (`#05D47F`): APY increasing OR stable (positive/neutral)
- **White**: APY decreasing (negative)
- **Gray** (`text-gray-400`): Low confidence (< 30%)

### Arrow Indicators
- **Green Arrow** (`#05D47F`): APY increasing (pointing up)
- **Orange Arrow** (`#FFA500`): APY stable (pointing right, rotated 90°)
- **Red Arrow** (`#FF1E1E`): APY decreasing (pointing down, rotated 180°)
- **No Arrow**: Low confidence or no prediction available

## Usage

### Basic Usage in Components

```typescript
import { usePrediction } from '@/hooks/usePrediction';
import { formatPrediction, getPredictionColorClass, getPredictionArrow } from '@/utils/prediction';

function VaultCard({ vaultId, historicalAPY }) {
  const { prediction, isLoading, hasData } = usePrediction({
    vaultId,
    historicalAPY
  });

  if (isLoading) return <div>Loading prediction...</div>;
  
  if (!hasData) return <div>No prediction data available</div>;

  const displayText = formatPrediction(prediction);
  const colorClass = getPredictionColorClass(prediction);
  const arrow = getPredictionArrow(prediction);

  return (
    <div className="flex justify-between">
      <span className={colorClass}>{displayText}</span>
      {arrow.isDefined && (
        <div className={classNames({
          "rotate-180": arrow.shouldRotate,
          "rotate-90": arrow.shouldRotateRight,
        })}>
          <DynamicArrowIcon color={arrow.color} />
        </div>
      )}
    </div>
  );
}
```

### Direct Utility Usage

```typescript
import { predict30DayAPY } from '@/utils/prediction';

const historicalAPY = [0.04, 0.05, 0.06, 0.04, 0.07, 0.05, 0.06];
const prediction = predict30DayAPY(historicalAPY);

console.log(`Predicted APY: ${(prediction.predictedAPY * 100).toFixed(2)}%`);
console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
console.log(`Trend: ${prediction.trend}`);
```

## Supported Vaults

The prediction system works for vaults that have historical APY data available:

### DefiLlama Vaults
Vaults mapped in `constants/defillamaPoolMapping.ts`:
- YieldFi Eth vyUSD
- Fluid Base USDC
- Compound Pol USDT
- Aave BNB USDT
- Convex Eth mSETH/WETH
- Aegis YUSD
- Convex tacBTC/cbBTC/FBTC
- Convex USDC/USDf

### Noon Capital Vaults
- Noon Capital vault (special handling)

## Performance Optimizations

1. **Caching**: Predictions are cached for 5 minutes to avoid redundant calculations
2. **Memoization**: React hooks use memoization to prevent unnecessary re-renders
3. **Lazy Loading**: Predictions are only calculated when needed
4. **Error Handling**: Graceful fallbacks for missing or invalid data

## Testing

Run the test suite to verify the implementation:

```bash
npm test -- utils/__tests__/prediction.test.ts
```

Tests cover:
- EMA calculation accuracy
- Confidence scoring
- Trend detection
- Color and arrow display logic
- Edge cases and error handling
- Formatting functions

## Future Enhancements

Potential improvements for the prediction system:

1. **Multiple Algorithms**: Add support for other prediction methods (ARIMA, LSTM)
2. **Market Conditions**: Incorporate market volatility and external factors
3. **Confidence Intervals**: Provide range predictions instead of single values
4. **Backtesting**: Validate predictions against historical accuracy
5. **Real-time Updates**: Implement WebSocket updates for live predictions

## Configuration

Key configuration options in `utils/prediction.ts`:

```typescript
// EMA parameters
const DEFAULT_PERIOD = 12;
const DEFAULT_SMOOTHING_FACTOR = 0.15;

// Confidence thresholds
const MIN_DATA_POINTS_LOW = 7;
const MIN_DATA_POINTS_MEDIUM = 14;
const CONFIDENCE_LOW = 0.3;
const CONFIDENCE_MEDIUM = 0.6;

// Trend detection
const TREND_THRESHOLD = 0.05; // 5%

// Display colors
const COLOR_INCREASING = '#05D47F'; // Green
const COLOR_STABLE = '#05D47F';     // Green (same as increasing)
const COLOR_DECREASING = '#FF1E1E'; // Red
const COLOR_ARROW_STABLE = '#FFA500'; // Orange
```

## Error Handling

The system handles various error scenarios:

- **No Data**: Returns "N/A" with low confidence
- **Invalid Data**: Filters out NaN, Infinity, negative values
- **API Failures**: Graceful fallback to cached data or "N/A"
- **Network Issues**: Loading states and retry mechanisms 