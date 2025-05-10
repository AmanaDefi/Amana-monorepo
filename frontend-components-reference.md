# Frontend Components Reference

## 1. Token Selection Related

### ChainTokenSelector.tsx
- Dropdown UI for token selection across different chains
- Key functionality:
  - Auto-selection of tokens based on vault compatibility
  - Chain switching integration
  - Search filtering for tokens
  - Finding closest matching tokens when vault/chain changes
  - Expandable chain sections with token lists
  - Token display with icons and balances

### Utils.ts (Token Selection Functions)
- `determineVaultTokenFromApprovedTokens(chainId, vaultToken)`: Finds compatible tokens across chains
- `isZetachain(chainId)`: Checks if current chain is ZetaChain (7000 or 7001)
- `getOnlyTokenSymbol(symbol)`: Extracts base token symbol from formatted tokens

## 2. Vault Interaction Components

### VaultInputs.tsx
- Main form component for deposit/withdraw actions
- Key functionality:
  - Tab selector for deposit/withdraw modes
  - Token amount input with validation
  - Output amount calculation with slippage
  - Max button for using full balance
  - Gas fee calculation and display for Ethereum vaults
  - Performance fee information
  - Slippage warnings and settings
  - Token conversion between chains
  - URL parameter tracking for tab state

### InteractionContainer (interact.tsx)
- Transaction execution component
- Key functionality:
  - Step-by-step transaction process
  - Transaction status feedback
  - Cross-chain transaction tracking
  - Transaction completion handling
  - Gas fee checking (for deposits too small to cover gas)
  - Approval transactions for ERC20 tokens
  - Hook into wallet providers for transaction signing

### InputTokenWithError.tsx
- Token input field with error handling
- Key functionality:
  - Balance display
  - USD value conversion
  - MAX button
  - Token selector integration
  - Error message display
  - Loading states for output calculations
  - Gas fee tooltips
  - Slippage settings access

## 3. Container Components

### VaultsDetailContainer.tsx
- Container for individual vault detail page
- Key functionality:
  - Loads vault data based on URL params
  - Manages transaction state
  - Coordinates between header and input components
  - Handles token selection propagation
  - Tab parameter handling for deposit/withdraw state
  - Explorer links for transactions

### VaultsContainer.tsx
- Container for vault listing/grid view
- Key functionality:
  - Fetches APY and balance data
  - Manages loading states
  - Provides data to VaultsGrid component

### VaultHeader.tsx
- Header component for vault detail page
- Key functionality:
  - Displays vault protocol, network, and token info
  - Shows TVL, user deposits, and APY 
  - Displays user wallet balance for selected token
  - Updates values when transactions complete

## 4. Utility Functions

### utils.ts (General Utilities)
- Token price fetching: `fetchTokenPrices(priceIds)`
- Formatting functions:
  - `formatCurrency(amount)`: Formats numbers as USD
  - `formatBalance(balance)`: Formats token balances
  - `formatTokenBalance(balance, symbol)`: Formats with different decimal places based on token type
  - `shortAddressForm(address)`: Truncates addresses for display
- Settings management:
  - `getStoredSettings()`: Gets user settings from localStorage
  - `getCurrentSlippage()`: Gets user's slippage setting
- Transaction helpers:
  - `selectActions(action, vaultData, activeChain, walletAddress, inputBalance, inputToken)`: Determines transaction steps
  - `getVaultErrorMessage(value, inputValue, steps)`: Validation error messages
- Chain/token helpers:
  - `isEthereumAddress(address)`: Validates ETH addresses
  - `isSolanaAddress(address)`: Validates Solana addresses
  - `convertUsdToEth(usdAmount, ethPriceUsd)`: Converts USD to ETH value

## 5. VaultInputs Core Logic

### Deposit/Withdraw Flow
- Tab selection handling via URL parameters
- Input validation with balance checking
- Token selection with chain compatibility
- Output amount calculation with API calls:
  - `getDepositOutputAmount()`: Calculates shares received and fees
  - `getWithdrawOutputAmount()`: Calculates assets received from shares
- Gas fee handling:
  - Ethereum vaults: Gas deducted from deposit
  - ZetaChain vaults: Gas covered by protocol
- Slippage calculation and warning display
- Steps selection using `selectActions()` utility

### Cross-Chain Transaction Logic
- ZRC20 token handling for cross-chain deposits/withdrawals
- Token conversion via AMM swaps when input ≠ vault token
- Performance fee calculation and display
- Transaction step tracking (approvals, deposits, confirmations) 