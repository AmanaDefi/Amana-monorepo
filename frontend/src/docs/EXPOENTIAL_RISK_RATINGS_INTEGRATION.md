# Exponential Risk Ratings Integration

This document describes the integration of Exponential.fi Risk Ratings API into the Amana DeFi application.

## Overview

The integration replaces mock risk ratings with real risk assessments from Exponential.fi, providing users with accurate risk information for DeFi vaults.

## Features

- **Real-time Risk Ratings**: Fetch risk ratings from Exponential.fi API
- **Batch Processing**: Efficiently process multiple vaults in batches
- **Caching**: 24-hour cache to minimize API calls
- **Error Handling**: Graceful fallback when API is unavailable
- **Configurable**: Easy to enable/disable features
- **Attribution**: Proper attribution to Exponential.fi with links

## Configuration

### Environment Variables

Add to your `.env.local` file:

```env
NEXT_PUBLIC_EXPONENTIAL_API_KEY=your_exponential_api_key_here
```

### Risk Rating Configuration

Edit `frontend/src/config/riskRatingConfig.ts` to control:

- Global enable/disable
- Protocol and asset risk display
- Cache duration
- Batch processing settings
- Feature flags

## API Integration

### Request Format

The integration maps vault data to Exponential API format:

```typescript
{
  token_address: vault.id,           // Vault contract address
  blockchain: mappedNetwork,         // e.g., "ethereum", "polygon"
  protocol: mappedProtocol,          // e.g., "aave", "compound"
  assets: [vault.inputToken.address] // Underlying asset addresses
}
```

### Response Mapping

Exponential responses are mapped to internal format:

```typescript
{
  poolRating: "A" | "B" | "C" | "D" | "F",
  poolRatingColor: "green" | "lime" | "yellow" | "red",
  poolRatingDescription: string,
  poolUrl?: string,
  chainRating: string,
  assetRating: string,
  protocolRating?: string,
  // ... additional fields
}
```

## Components

### useRiskRatings Hook

```typescript
const { riskRatings, isLoading, error, getRiskLevel } = useRiskRatings({
  vaults,
  enabled: true,
  showProtocolRisk: false,
  showAssetRisk: false,
});
```

### RiskRatingDisplay Component

```typescript
<RiskRatingDisplay
  riskRating={riskRating}
  isLoading={isLoading}
  showProtocolRisk={false}
  showAssetRisk={false}
  size="medium"
/>
```

## Usage Examples

### Basic Integration

```typescript
import { useRiskRatings } from '@/hooks/useRiskRatings';

const MyComponent = ({ vaults }) => {
  const { riskRatings, isLoading, getRiskLevel } = useRiskRatings({
    vaults,
    enabled: true,
  });

  return (
    <div>
      {vaults.map(vault => {
        const riskLevel = getRiskLevel(vault.id);
        return (
          <div key={vault.id}>
            Risk: {riskLevel ? `Level ${riskLevel}` : 'Loading...'}
          </div>
        );
      })}
    </div>
  );
};
```

### Advanced Display

```typescript
import { RiskRatingDisplay } from '@/components/RiskRatingDisplay';

const VaultCard = ({ vault, riskRating, isLoading }) => {
  return (
    <div>
      <RiskRatingDisplay
        riskRating={riskRating}
        isLoading={isLoading}
        showProtocolRisk={true}
        showAssetRisk={true}
        size="large"
      />
    </div>
  );
};
```

## Error Handling

The integration handles various error scenarios:

1. **API Unavailable**: Hides risk ratings completely
2. **Authentication Failed**: Logs error, hides ratings
3. **Rate Limited**: Implements exponential backoff
4. **Invalid Data**: Falls back to default values

## Caching Strategy

- **Duration**: 24 hours
- **Storage**: In-memory Map
- **Key**: Vault ID
- **Invalidation**: Manual clear or automatic expiration

## Rate Limiting

- **Batch Size**: 5 vaults per batch
- **Delay**: 1 second between batches
- **Retries**: 3 attempts with exponential backoff
- **Timeout**: 10 seconds per request

## Testing

### Development

1. Set up API key in environment
2. Enable risk ratings in config
3. Test with real vault data
4. Verify error handling

### Production

1. Monitor API usage
2. Check error rates
3. Verify cache performance
4. Test rate limiting behavior

## Troubleshooting

### Common Issues

1. **No Risk Ratings Displayed**
   - Check API key configuration
   - Verify vault data mapping
   - Check browser console for errors

2. **API Rate Limiting**
   - Reduce batch size
   - Increase delay between batches
   - Check API usage limits

3. **Caching Issues**
   - Clear cache manually
   - Check cache duration settings
   - Verify cache key generation

### Debug Mode

Enable debug logging by setting:

```typescript
// In exponentialApi.ts
console.log('API Request:', requestData);
console.log('API Response:', response);
```

## Future Enhancements

- [ ] Server-side caching
- [ ] Risk rating history
- [ ] Custom risk thresholds
- [ ] Risk comparison tools
- [ ] Risk alerts and notifications

## Support

For issues with the Exponential API integration:

1. Check the Exponential API documentation
2. Verify API key permissions
3. Review rate limiting settings
4. Contact Exponential support if needed
