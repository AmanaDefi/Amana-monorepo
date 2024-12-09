
# Amana DeFi Smart Contracts

This repository contains the smart contracts that power the Amana DeFi platform. These contracts are designed to manage cross-chain investments, rewards distribution, and efficient handling of vault assets in a decentralized manner.

## Getting Started

### Prerequisites

Before you start, ensure you have the following installed:

- Node.js and Yarn
- Hardhat for testing and deployment
- A connected wallet for testing on testnets

### Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd amana-contracts
yarn install
```

### Compilation

To compile the contracts, run:

```bash
yarn hardhat compile
```

### Deployment

To deploy the contracts, use:

```bash
yarn hardhat run scripts/deploy.js --network <network-name>
```

Replace `<network-name>` with the desired network (e.g., `sepolia`, `mainnet`, etc.).

## Project Structure

### Contracts

### 1. **AmanaConnectedChainVault**

#### Description:
The **AmanaConnectedChainVault** handles deposits, withdrawals, and performance fees for strategies deployed on connected chains. It supports cross-chain communication to interact with strategies.

#### Key Functions:
- **`setStrategy(address _strategyAddress, uint32 _strategyChainId)`**: Updates the strategy and chain ID for the vault.
- **`_deposit(address caller, address receiver, uint256 assets, uint256 shares)`**: Handles user deposits into the vault and initiates cross-chain investments.
- **`_withdraw(address caller, address receiver, address user, uint256 assets, uint256 shares)`**: Manages withdrawals, applies performance fees, and retrieves funds from the connected chain strategy.
- **`_applyFee(address user, uint256 assets)`**: Calculates the performance fee for withdrawals.
- **`_processBufferedConfirmations()`**: Processes pending confirmations received from connected chain strategies.

#### State Variables:
- **`strategyAddress`**: The address of the strategy contract.
- **`strategyChainId`**: The chain ID where the strategy is deployed.
- **`perfFee`**: The performance fee applied to profits.
- **`totalPrincipal`**: The total principal managed by the vault.
- **`userPrincipal`**: Mapping of user addresses to their respective principal amounts.
- **`crossChainTxId`**: Counter for cross-chain transaction IDs.

---

### 2. **AmanaZetachainVault**

#### Description:
The **AmanaZetachainVault** manages deposits and withdrawals for strategies deployed directly on ZetaChain. It leverages ZetaChain's native interoperability for seamless strategy interactions.

#### Key Functions:
- **`setStrategy(address _strategyAddress)`**: Updates the strategy contract for the vault.
- **`_deposit(address caller, address receiver, uint256 assets, uint256 shares)`**: Handles user deposits into the vault and invests directly into the strategy on ZetaChain.
- **`_withdraw(address caller, address receiver, address user, uint256 assets, uint256 shares)`**: Manages user withdrawals, calculates performance fees, and interacts with the strategy on ZetaChain.
- **`_applyFee(address user, uint256 assets)`**: Computes the performance fee for withdrawals.
- **`_divestZetachainStrategy(uint256 assets, uint256 feeToWithdraw, address user, uint256 shares)`**: Retrieves funds from the ZetaChain strategy.
- **`_returnFundsToUser(uint256 amount, uint32 userChainId, address userAddress, address withdrawZRC20)`**: Transfers funds back to the user, handling cross-chain scenarios if necessary.

#### State Variables:
- **`strategyAddress`**: The address of the strategy contract.
- **`perfFee`**: The performance fee applied to profits.
- **`totalPrincipal`**: The total principal managed by the vault.
- **`userPrincipal`**: Mapping of user addresses to their respective principal amounts.

#### 3. **BaseSepAaveEthStrategy.sol**

- **Description**: Implements a strategy for depositing ETH into Aave's lending pool on Sepolia.
- **Key Functions**:
  - `_invest`: Deposits ETH into Aave.
  - `_divest`: Withdraws ETH from Aave.
- **State Variables**:
  - `aavePool`: The Aave lending pool instance.
  - `receiptToken`: ERC4626 receipt token for Aave investments.

#### 4. **Mock4626ZetachainStrategy.sol**

- **Description**: A mock strategy for testing ERC4626 vaults on ZetaChain.
- **Key Functions**:
  - `invest`: Simulates deposits into a 4626-compatible vault.
  - `withdraw`: Simulates withdrawals from the vault.
- **State Variables**:
  - `receiptToken`: ERC4626 receipt token instance.

### 5. **GasTank**

#### Description:
The **GasTank** contract manages gas fees required for cross-chain transactions. It ensures that sufficient gas is available to execute operations on the target chain.

#### Key Functions:
- **`getGas(address token, uint256 amount)`**: Allocates gas tokens for cross-chain operations.
- **`returnGas(address token, uint256 amount)`**: Returns unused gas tokens to the sender.

#### State Variables:
- **`gasBalances`**: Tracks gas token balances for each user.

---

### 6. **Treasury**

#### Description:
The **Treasury** contract collects performance fees from the vaults and manages these funds on behalf of the protocol.

#### Key Functions:
- **`depositFees(uint256 amount)`**: Deposits collected fees into the treasury.
- **`withdrawFees(address recipient, uint256 amount)`**: Allows authorized withdrawals of treasury funds.

#### State Variables:
- **`totalFees`**: Tracks the total fees collected by the treasury.

---

### 7. **SwapHelperLib**

#### Description:
The **SwapHelperLib** is a library providing utility functions for token swaps using decentralized exchanges (e.g., Uniswap V2). It supports efficient and secure swaps.

#### Key Functions:
- **`swapExactTokensForTokens(address router, address factory, address tokenIn, uint256 amountIn, address tokenOut, uint256 amountOutMin, address to, uint256 deadline)`**: Executes a token swap with exact input.
- **`getAmountsOut(address router, uint256 amountIn, address[] memory path)`**: Calculates the output amount for a given input amount and token swap path.


### Testing

Run tests with:

```bash
yarn hardhat test
```

### Linting

Check your code style and formatting with:

```bash
yarn lint
```

### Documentation

Read the full documentation for smart contract design and interaction [here](docs/).

## Contributing

We welcome contributions to improve the Amana DeFi smart contracts. Please fork the repository and create a pull request with your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
