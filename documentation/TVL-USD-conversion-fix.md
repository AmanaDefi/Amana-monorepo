# TVL Display Fix: Converting Native Tokens to USD

## Issue Summary

The TVL (Total Value Locked) display in the application was inconsistent:
- **Stablecoin vaults** (like USDC, USDT) showed TVL correctly in USD with K/M/B suffixes
- **Native token vaults** (like ETH) showed TVL in native token terms (e.g., 0.83 ETH) without USD conversion

## Root Cause Analysis

1. **API Data Format**: The `fetchTotalAssets()` function returns `total_assets` from the backend API in **native token terms**
2. **Direct Display**: The frontend was displaying this value directly using `formatNumberWithSuffix()` without considering token type
3. **Missing Price Conversion**: Native tokens (like ETH) needed to be multiplied by their USD price to show equivalent USD value

## Solution Implemented

### 1. Added Helper Functions in `VaultsGrid.tsx`

```typescript
// Helper function to check if a token is a stablecoin
const isStablecoin = (symbol: string): boolean => {
  const baseSymbol = symbol.split('.')[0].toUpperCase();
  return ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX', 'LUSD'].includes(baseSymbol);
};

// Helper function to format TVL in USD terms with proper K/M/B suffix
const formatTVLInUSD = (totalAssets: string | number, inputTokenSymbol: string, tokenPrice: number = 0): string => {
  const totalAssetsNumber = Number(totalAssets || 0);
  
  if (totalAssetsNumber === 0) {
    return "0";
  }
  
  // Check if the token is a stablecoin
  if (isStablecoin(inputTokenSymbol)) {
    // For stablecoins, the value is already in USD terms
    return formatNumberWithSuffix(totalAssetsNumber);
  } else {
    // For native tokens (like ETH), convert to USD using token price
    const usdValue = totalAssetsNumber * tokenPrice;
    return formatNumberWithSuffix(usdValue);
  }
};
```

### 2. Integrated Token Price Fetching

- Added hooks to fetch token prices: `useTokenPriceBySymbol("ETH")`, `useTokenPriceBySymbol("WETH")`, etc.
- Created a `getTokenPrice()` function that returns appropriate prices based on token type
- For stablecoins, it returns 1 (as they're pegged to USD)
- For native tokens, it returns the current market price

### 3. Updated TVL Display

**Before:**
```typescript
{formatNumberWithSuffix(Number(totalAssets?.totalAssets || 0))}
```

**After:**
```typescript
{formatTVLInUSD(Number(vaultTotalAssetsData?.totalAssets || 0), vault.inputToken.symbol, getTokenPrice(vault.inputToken.symbol))}
```

## Results

Now all vaults display TVL consistently:
- **Stablecoin vaults**: Continue to work as before (e.g., "64.20K" for USDC)
- **Native token vaults**: Now show USD equivalent (e.g., "2.61K" instead of "0.83" for ETH worth ~$3,145)
- **All vaults**: Use proper K/M/B formatting for readability

## Token Types Handled

### Stablecoins (show value as-is, already in USD)
- USDT, USDC, DAI, BUSD, TUSD, USDP, FRAX, LUSD

### Native Tokens (convert to USD using market price)
- ETH, WETH, msETH, and other non-stablecoin tokens

## Benefits

1. **Consistency**: All TVL values now display in USD terms
2. **Clarity**: Users can easily compare vault sizes across different token types
3. **Existing Logic Preserved**: Stablecoin handling continues to work perfectly
4. **Scalable**: Easy to add support for new token types

## Files Modified

- `frontend/src/components/VaultsGrid.tsx` - Main TVL display logic
- Added helper functions for stablecoin detection and USD conversion
- Integrated token price fetching for accurate conversions 