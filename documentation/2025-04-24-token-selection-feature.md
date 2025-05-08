# Token Selection Feature Update

## Date: April 24, 2025 

## Author: Rohit Kumar Suman

## Overview
Implemented intelligent token selection in the ChainTokenSelector component to improve user experience when interacting with vaults. The feature automatically selects the most appropriate token on the user's current chain that matches the vault's token type.

## Problem Statement
Previously, when a user connected their wallet and visited a vault details page:
1. The "Select Token" text was shown even when appropriate tokens were available
2. If tokens were auto-selected, the system would default to the native token of the chain (e.g., ETH, BNB, POL)
3. Users had to manually select the appropriate equivalent token each time

## Solution
We've enhanced the ChainTokenSelector component to:

1. Automatically identify and select tokens on the user's current chain that match the vault's token type
2. Prioritize non-native tokens (like USDC, USDT) over native tokens when both are available
3. Show "Select Token" only when there's no appropriate match or the user hasn't connected their wallet

## Implementation Details

### Key Changes

1. Added `findClosestToken` function:
   - Extracts base symbol from vault token (e.g., "USDC" from "USDC.ETH")
   - Finds matching tokens on the user's current chain
   - Prioritizes non-native tokens over native tokens

2. Enhanced token auto-selection logic:
   - Auto-selects closest token on component mount
   - Replaces native token selection with more appropriate token when available
   - Only shows "Select Token" when no wallet is connected or no matching token exists

3. Updated the display logic:
   - Shows selected token when available
   - Shows closest matching token when available but none explicitly selected
   - Falls back to "Select Token" text only when necessary

## Example Use Cases

1. A user connected to BNB Chain views a USDC vault on BASE chain:
   - System automatically selects "USDC (BNB)" as the input token
   - No chain switching happens (user has full control)

2. A user connected to ETH Chain views a USDT vault on Polygon:
   - System automatically selects "USDT (ETH)" as the input token
   - If no USDT exists on ETH Chain, "Select Token" is shown

3. User without a connected wallet visits any vault:
   - "Select Token" is displayed until wallet connection

## Benefits

- Improved UX: Immediate selection of relevant tokens without manual searching
- Contextual relevance: Token selection based on vault's purpose
- User control: Automatic selection doesn't change chains or force transactions
- Clear fallbacks: Appropriate display when no matches are available 