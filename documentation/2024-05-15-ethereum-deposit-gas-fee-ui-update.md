# Ethereum Vault Deposit Gas Fee UI Enhancements

## Date: April 30, 2025
## Author: Rohit Kumar Suman

## Overview
In this update, we improved how deposit gas fees are handled and displayed for Ethereum vaults. Gas fees are now separated from slippage, explicitly shown in both ETH and USD, and accompanied by tooltips and a prominent banner to ensure transparency.

## New Features

- **Separate Gas Fee Display**: Gas fees are no longer lumped into slippage but shown as their own line item in the fee breakdown.
- **Dual-Format Fee**: Displays gas fee in both ETH and USD (e.g., `0.005 ETH (~$4.50)`).
- **Net Deposit Calculation**: Added a "Net Deposit to Vault" display with a tooltip showing the breakdown (`Input amount – Gas fee = Net deposit`).
- **Tooltips for Clarity**:
  - Gas fee tooltip explains: "This fee is required for processing your deposit transaction on the Ethereum network. It is deducted directly from your deposit amount and is not covered by Amana."
  - Net deposit tooltip shows calculation details: `Input amount ($X) - Gas fee ($Y) = Net deposit ($Z)`.  
- **Prominent Update Banner**: A banner at the top of the deposit page highlights that gas fees are deducted directly from the deposit and not covered by Amana.

## Changes

- Extended the `ConversionOutput` type in `VaultInputs.tsx` to include:
  - `gasFeeInVaultAsset`
  - `gasFeeInUSD`
  - `gasFeeInETH`
  - `netDepositToVaultUSD`
  - `inputAmountInUSDFormatted`
- Updated the `getDepositOutputAmount` function to:
  - Fetch and calculate gas fee in token units, USD, and ETH.
  - Compute the net deposit amount after gas deduction.
  - Exclude gas fee when calculating slippage.
- Added a new utility `convertUsdToEth` in `utils.ts`, leveraging live ETH price from the existing TokenPriceProvider hook.
- Removed the hard-coded `ETH_PRICE_USD` constant and now use `useTokenPriceBySymbol("ETH")` for real-time pricing.
- Refactored the slippage check logic (`checkSlippageExceedingLimit`) to ignore gas fees.
- Imported and used `getOnlyTokenSymbol` to display the base token symbol (e.g., `ETH`) for gas fees.

## Fixes

- Escaped apostrophes in JSX (`you&apos;ll`) to satisfy the linter.
- Corrected the import path for the tooltip component (`ResponsiveTooltip` → `@/components/common/Tooltip`).

## Resolved Bugs

- Incorrect representation of gas fees as slippage in the UI.
- No user warning when deposit amounts were too low to cover gas fees.
- Missing net deposit breakdown leading to user confusion about final vault deposit.

---
*End of Document* 