# Enhancement: Ethereum Vault Deposit Fee and Slippage Fee Separation + UI Improvements

## Author: Rohit Kumar Suman
## Date: May 8, 2025

## Problem
- The deposit form displayed combined gas and slippage fees, leading to confusion and discrepancy with wallet confirmations.
- Lack of clear breakdown between network gas cost and slippage cost.
- Negative balances and excessive slippage values were shown in edge cases.

## Changes Introduced
1. **Utility & Type Updates**
   - Added `convertUsdToEth` in `frontend/src/utils` to convert USD amounts to ETH using the current `ethPriceUsd`.
   - Updated the `ConversionOutput` type to include:
     - `gasFeeInETH` (string)
     - `gasFeeInUSDAmount` (string)
     - `slippageFeeInUSDAmount` (string)
     - `slippageFeeInETH` (string)
2. **Enhanced Fee Calculation** (`frontend/src/utils/vaultUtils.ts`)
   - Modified `getDepositOutputAmount` to calculate and return gas and slippage fees separately.
   - Added detailed console logs for breakdown in both ETH and USD:
     ```ts
     console.log("==== FEE BREAKDOWN ====");
     console.log("Gas Fee (ETH):", gasFeeETH);
     console.log("Gas Fee (USD):", gasFeeUSD);
     console.log("Slippage Fee (USD):", slippageFeeUSD.toFixed(5));
     console.log("Slippage Fee (ETH):", slippageFeeETH.toFixed(5));
     console.log("=======================" );
     ```
3. **UI Component Updates** (`frontend/src/components/VaultInputs.tsx`)
   - Clamped negative token balances to zero to prevent misleading display.
   - Displayed the gas fee banner only for Ethereum vaults (`depositFeePaidFromGasTank === true`).
   - Showed the estimated slippage fee message only when slippage < 100%; hid it entirely when ≥ 100%.
   - Updated slippage tooltip text and styling for better UX.

## Benefits
- Clear separation of network cost vs. price impact for end-users.
- Improved UI transparency with conditional displays and tooltips.
- Prevents negative or misleading fee values.
- Simplifies debugging with comprehensive console logs.
- Ensures maintainability and extensibility for future features. 