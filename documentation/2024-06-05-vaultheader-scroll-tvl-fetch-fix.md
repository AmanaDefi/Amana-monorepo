# VaultHeader Tab Scrolling and TVL Fetch Bugfix

## Date: May 2, 2025
## Author: Rohit Kumar Suman

## Overview

This update addresses two related issues in the `VaultHeader` component:
1. The page would automatically scroll to the top when switching between Deposit and Withdraw tabs, disrupting the user's reading position.
2. The Total Value Locked (TVL) metric could remain in a perpetual loading state when relying on the parent component's props, leading to an unresponsive UI.

## Problems

1. **Lost Scrolling Position on Tab Change**  
   Clicking the Deposit/Withdraw tabs reset the page scroll, forcing users back to the top of the vault details.

2. **Infinite TVL Loading State**  
   The component depended on `vaultTotalAsset` props for TVL, which sometimes arrived undefined or empty on slow network conditions. The existing retry logic in props-based hooks did not trigger reliably, leaving the TVL display stuck on a loading indicator.

## Changes Made

### 1. Preserve Scroll Position on Tab Switch
- Modified `handleTabChange` in `VaultInputs.tsx` to:
  - Store `window.scrollY` before navigation.
  - Use `router.push(url, { scroll: false })` to prevent Next.js from resetting scroll.
  - After state updates, restore the saved scroll position via `window.scrollTo(0, savedPosition)`.

### 2. Direct API Fetch for TVL
- Removed dependency on `vaultTotalAsset` props for TVL display in `VaultHeader.tsx`.
- Added a `useEffect` to call `ApiService().api.getVaultData(vaultData.id)` directly:
  ```ts
  const data = await new ApiService().api.getVaultData(vaultData.id);
  if (data.total_assets) setTvlValue(data.total_assets);
  ```
- Implemented retry logic on empty or failed responses with a 3-second delay.
- Introduced local state (`tvlValue`, `isTvlLoading`) to manage loading and error states robustly.

### 3. Simplify TVL Formatting
- Unified formatting via:
  ```ts
  const formattedTVL = isTvlLoading ? 'Loading...' : `$${formatCurrency(Number(tvlValue || vaultTotalAsset?.totalAssets || '0'))}`;
  ```

## Impact

- **Enhanced UX**: Tab switching no longer disrupts scroll position, allowing users to stay focused on the section they were viewing.
- **Reliable TVL Display**: TVL is fetched directly with retry logic, eliminating the infinite loading problem and ensuring accurate data render.
- **Cleaner Code**: Decoupled TVL from parent props, making `VaultHeader` more self-sufficient and reducing inter-component coupling.

*End of Document* 