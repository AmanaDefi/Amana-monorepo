# Bugfix: VaultHeader Deposit Display Always Zero

## Author: Rohit Kumar Suman

## Date: April 26, 2025

## Problem

Previously, the `VaultHeader` component relied on a prop (`userVaultBalance`) that could arrive in mixed or conflicting formats (a `Balance` object vs. a plain string). This led to type mismatches and caused the displayed Deposits to remain zero, since the component only handled one format reliably.

## Changes Made

### 1. Removed legacy `userVaultBalance` prop dependency
- Dropped the dual-format handling and the conditional `useEffect` that parsed `userVaultBalance` into state.
- Instead, rely exclusively on an on-chain call to fetch the user's vault balance.

### 2. Introduced direct on-chain fetch via `fetchUserVaultBalance`
- Added a new `useEffect` in `VaultHeader.tsx` to call:
  ```ts
  const balance = await fetchUserVaultBalance(
    walletAddress as Address,
    vaultData.id as Address
  );
  setDepositAmount(balance);
  ```
- This ensures a single, consistent string result that represents the user's vault deposit.

### 3. Simplified state and calculations
- Replaced the previous `depositAmount` logic with a single string state.
- Parsed `depositAmount` via `parseFloat(depositAmount) || 0` for USD value calculations:
  ```ts
  const depositValueUSD = formatCurrency(
    parseFloat(depositAmount) * vaultTokenPrice
  );
  ```

### 4. Updated JSX display
- Render the deposit value in USD directly using the new `depositValueUSD`:
  ```tsx
  <p className="text-white text-xl font-bold">${depositValueUSD}</p>
  ```

## Impact
- The Deposits section in the header now accurately reflects the on-chain vault balance, without risk of type conflicts.
- All legacy code paths for `userVaultBalance` have been removed, simplifying the component and eliminating redundant console logs. 