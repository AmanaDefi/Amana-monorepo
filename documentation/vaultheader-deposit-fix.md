# Bugfix: VaultHeader Deposit Display Always Zero

## Author: Rohit Kumar Suman

## Date: April 26, 2025

## Problem

In the `VaultHeader` component, the "Deposits" value and its USD secondary value were always showing `0`, even when the user had a non-zero vault balance. The root cause was that `fetchUserVaultBalance` returned a plain string, but the component only handled `Balance` objects with a `formatted` field.

## Changes Made

### 1. Prop type update in `VaultHeader.tsx`
- Changed the `userVaultBalance` prop type from `Balance` to `Balance | string` to accept both formats.

### 2. Enhanced balance handling logic
- Added a `useEffect` branch to detect when `userVaultBalance` is a string:
  ```tsx
  if (typeof userVaultBalance === 'string') {
    setDepositAmount(userVaultBalance);
  } else if (typeof userVaultBalance === 'object') {
    // use formatted or value
  }
  ```
- This ensures string returns from the fetch hook are correctly applied.

### 3. Parsing and cleanup
- Used `parseFloat(depositAmount) || 0` to reliably convert the deposit string to a number for USD calculations.
- Removed obsolete console logs for `depositAmount` and `depositAmountNumber` to clean up the code.

These changes allow the deposit section to accurately reflect the user's vault balance in both token and USD formats. 