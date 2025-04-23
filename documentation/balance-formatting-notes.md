# Feature & Bugfix: Conditional Token Balance Formatting and Shared Token Selection State

## Overview

This document summarizes the fixes and new features applied in this session to:
1. Propagate user-selected tokens into the "Your Wallet" and "Deposits" sections.
2. Introduce conditional precision formatting for token balances (stablecoins vs. native tokens).

## Problems Addressed

- **Wrong Wallet Balance Token**: "Your Wallet" stat always showed the native chain token balance (e.g. ETH) even after selecting a specific ERC‑20 token (e.g. USDC).
- **Inconsistent Decimal Precision**: All token balances were formatted with 4 decimal places, leading to unnecessary decimals for stablecoins.
- **Scattered Formatting Logic**: Balance formatting was duplicated across multiple components, making maintenance difficult.

## Changes Made

### 1. Shared Selected Token State
- **`VaultsDetailContainer.tsx`**
  - Added `selectedToken` state and `onTokenSelect` callback.
  - Passed `selectedToken` prop into `<VaultHeader />`.
- **`VaultInputs.tsx`**
  - Extended props with `onTokenSelect?: (token: Token) => void`.
  - Called `onTokenSelect` whenever a deposit/withdraw token is selected.

### 2. Centralized Balance Formatting
- **`utils/utils.ts`**
  - Added `formatTokenBalance(balance: string | number, symbol: string): string`:
    - 2 decimal places for stablecoins (`USDC`, `USDT`, `DAI`, `BUSD`).
    - 4 decimal places for all other tokens.

### 3. Component Updates
- **`VaultHeader.tsx`**
  - Imported `formatTokenBalance` from utils.
  - Used it to display:
    - "Your Wallet" balance.
    - "Deposits" stat.
- **`InputTokenWithError.tsx`**
  - Used `formatTokenBalance` to render the selected token balance in the input box.
- **`VaultInputs.tsx`**
  - Applied `formatTokenBalance` to format:
    - Swap output amounts (withdraw/deposit calculations).
    - Shares returned from `getSharesFromDeposit`.
- **`VaultsGrid.tsx`**
  - Imported `formatTokenBalance` from utils.
  - Used it to format "Your Deposits:" on each vault card.

## Explanation

- **State Management**: By lifting the `selectedToken` state into the parent container (`VaultsDetailContainer`) and propagating it into `<VaultHeader />`, we ensure that the wallet balance stat always uses the same token the user selected.
- **Precision Control**: Stablecoins typically do not require micro-units beyond cents, so showing 2 decimal places offers a cleaner UI. Native tokens and volatile assets retain 4 decimal places to capture finer granularity.
- **Maintainability**: Centralizing the formatting logic in `utils.ts` avoids duplication and makes future updates (e.g., adding more token exceptions) easier.

---
*End of balance-formatting-notes.md* 