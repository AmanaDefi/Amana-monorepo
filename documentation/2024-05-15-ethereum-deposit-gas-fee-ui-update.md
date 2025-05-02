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
- Hide slippage display when the estimated slippage value exceeds 100%.
- Update output error logic to show zero output and suppress the "Swap route not found" warning when a deposit amount is too low to cover the gas fee.
- Correct the performance fee tooltip button ID (`performance-fee-info`) to match the tooltip target for proper hover functionality.
- Add a React effect in `VaultInputs.tsx` to reset input state and action steps after a transaction completes or fails, enabling users to retry (e.g., after a failed withdrawal) without needing a page refresh.
- Clamp any negative output or net deposit values to zero to avoid displaying negative amounts in the UI.
- Introduced a collapsible accordion for the Information section on the vault detail page, enabling users to expand or collapse descriptions of the vault, protocol, network, and addresses.

## Fixes

- Escaped apostrophes in JSX (`you&apos;ll`) to satisfy the linter.
- Corrected the import path for the tooltip component (`ResponsiveTooltip` → `@/components/common/Tooltip`).

## Resolved Bugs

- Incorrect representation of gas fees as slippage in the UI.
- No user warning when deposit amounts were too low to cover gas fees.
- Missing net deposit breakdown leading to user confusion about final vault deposit.
- Withdrawal form now properly resets after a failed transaction (e.g., out-of-gas), and the withdraw button reappears without requiring a page refresh.
- Fixed negative output and net deposit values by clamping them to zero when calculations underflow.
- Improved information section UX by making the detailed descriptions collapsible, preventing overly long static text sections.

---
*End of Document* 