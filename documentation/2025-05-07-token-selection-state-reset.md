# Feature & Bugfix: Enhanced Token Selection and State Reset

## Date: May 7, 2025

## Author: Rohit Kumar Suman

## Problems
1. Stablecoin vaults (e.g., USDT) defaulted to showing the chain's native token (e.g., BNB) instead of the correct stablecoin.
2. Token selection persisted across vaults, preventing automatic reset when navigating to a new vault.
3. Network changes did not trigger token re-evaluation, leading to mismatched or missing tokens on the new chain.

## Changes Made

### 1. `determineVaultTokenFromApprovedTokens` in `utils/utils.ts`
- Extract vault token base symbol and detect token type (native vs. stablecoin).
- Implement prioritized matching:
  1. Exact symbol match (prioritize non-native for stablecoins).
  2. Any stablecoin fallback for stablecoin vaults.
  3. Native token fallback for native vaults.
  4. Default to the first approved token if no match.
- Added detailed logging to trace selection logic.

### 2. `ChainTokenSelector.tsx`
- Introduced `lastVaultIdRef` and `lastActiveChainRef` to track vault and network changes.
- Added `useEffect` hooks to:
  - Reset token selection when the vault ID changes.
  - Re-evaluate and auto-select the closest token when the active chain changes.
- Enhanced `findClosestToken` logic to handle stablecoin vs. native vault tokens with symbol extraction.
- Improved initial mount behavior to auto-select only when no token is already selected.

### 3. `VaultHeader.tsx`
- Added `lastVaultIdRef` and `lastActiveChainRef` to detect vault and chain changes.
- Updated effect to re-determine `inputToken` on vault or network change:
  - Use user-selected token if available.
  - Fallback to vault's input token on ZetaChain.
  - Otherwise, call `determineVaultTokenFromApprovedTokens` for the active chain.
- Enhanced console logging to aid debugging of token selection paths.

## Benefits
- **Accurate Defaults**: Stablecoin vaults now correctly default to matching stablecoins; native vaults show the native token.
- **State Isolation**: Token selection resets when switching vaults, avoiding unintended cross-vault state.
- **Responsive Updates**: Network switching now triggers token re-evaluation, ensuring appropriate tokens are available on the new chain. 