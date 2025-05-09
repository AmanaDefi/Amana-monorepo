# Refactor: Token Prioritization in Token Selector & VaultHeader

## Author: Rohit Kumar Suman
## Date: May 9, 2025

## Problem
- Hardcoded suffix fallback caused incorrect default token selection in Token Selector & VaultHeader.

## Changes Introduced
1. **Token Prioritization Logic** (`frontend/src/utils/utils.ts`)
   - Replaced hardcoded fallback list with dynamic prioritization: connected chain suffix > vault original suffix > alphabetical order.
2. **ChainTokenSelector Component** (`frontend/src/components/input/ChainTokenSelector.tsx`)
   - Updated `findClosestToken()` to apply the new dynamic prioritization logic for stablecoins on ZetaChain and general cases.
3. **VaultHeader Component** (`frontend/src/components/VaultHeader.tsx`)
   - Revised initial token selection `useEffect` to leverage the updated prioritization helper and removed outdated fallback order.

## Affected Files
- `frontend/src/utils/utils.ts`
- `frontend/src/components/input/ChainTokenSelector.tsx`
- `frontend/src/components/VaultHeader.tsx`

---
*End of changelog for token selection refactor.* 