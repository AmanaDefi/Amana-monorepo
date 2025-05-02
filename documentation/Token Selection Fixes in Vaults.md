# Token Selection Fixes in Vaults

## Date: May 2, 2025
## Author: Rohit Kumar Suman

## Overview
This update resolves token selection and wallet balance issues in the `ChainTokenSelector` and `VaultHeader` components. Users experienced incorrect default tokens and stale wallet balances when navigating vaults or switching networks.

## Problems
1. **ChainTokenSelector Default & Network Updates**
   - Defaulted to the chain's native token when arriving on vault details pages.
   - Did not auto-update the selected token when the active chain changed.

2. **VaultHeader Wallet Balance & Token Sync**
   - "Your Wallet" section did not refresh when users switched networks.
   - The token selector reset to the native token instead of preserving the correct user-selected token.

## Changes Made

### 1. ChainTokenSelector Component
**File:** `frontend/src/components/input/ChainTokenSelector.tsx`

#### Fix Description
- Added a `useEffect` that listens for changes in `activeChain.id` and `walletAddress`.
- On network change, calls `findClosestToken()` to pick the most appropriate token for the new chain.
- Falls back to matching the previous `selectedToken` symbol if no close match is found.

#### Code Snippet
```ts
useEffect(() => {
  if (activeChain && lastActiveChainRef.current !== activeChain.id && walletAddress) {
    console.log(`Network changed from ${lastActiveChainRef.current} to ${activeChain.id}`);
    const closestToken = findClosestToken();

    if (closestToken) {
      const chain = SUPPORTED_CHAINS.find(c => c.id === activeChain.id) || activeChain;
      onSelectToken(closestToken, chain);
    } else if (selectedToken) {
      const currentTokens = APPROVED_TOKENS[activeChain.id] || [];
      const baseSymbol = selectedToken.symbol.split(' ')[0];
      const match = currentTokens.find(t => t.symbol.split(' ')[0] === baseSymbol);
      if (match) onSelectToken(match, chain);
    }

    lastActiveChainRef.current = activeChain.id;
  } else if (activeChain && lastActiveChainRef.current === null) {
    // Initial chain setup
    lastActiveChainRef.current = activeChain.id;
  }
}, [activeChain?.id, walletAddress, findClosestToken, onSelectToken, selectedToken]);
```

### 2. VaultHeader Component
**File:** `frontend/src/components/VaultHeader.tsx`

#### Fix Description
- Updated the token selection `useEffect` to re-run when `selectedToken` or `activeChain` changes.
- Prioritizes `selectedToken` over vault token on ZetaChain, then uses `determineVaultTokenFromApprovedTokens` for other chains.
- Added a `useEffect` to refresh the wallet token balance when `activeChain.id` or `inputToken.address` changes.

#### Code Snippets
```ts
useEffect(() => {
  if (selectedToken) {
    setInputToken(selectedToken);
  } else if ([7000, 7001].includes(activeChain.id)) {
    setInputToken(vaultData.inputToken);
  } else {
    const determined = determineVaultTokenFromApprovedTokens(
      activeChain.id,
      vaultData.inputToken
    );
    setInputToken(determined);
  }
  lastVaultIdRef.current = vaultData.id;
}, [activeChain, vaultData.id, vaultData.inputToken, selectedToken]);

useEffect(() => {
  if (inputToken && activeChain) {
    console.log("VaultHeader: Refreshing balance for", inputToken.symbol);
    fetchBalance();
  }
}, [activeChain?.id, inputToken?.address, fetchBalance]);
```

## Impact
- Ensures correct token auto-selection on vault entry and network switch.
- Keeps the "Your Wallet" balance synchronized with the active network and user-selected token.
- Improves user trust by consistently displaying accurate token information.