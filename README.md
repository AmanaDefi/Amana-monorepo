
# Amana Monorepo

Welcome to the **Amana Monorepo**. This repository contains all the core components of the Amana project, organized for streamlined collaboration and development. Amana aims to provide decentralized finance (DeFi) solutions, enabling users to invest in crypto yield-bearing vaults in a seamless and efficient way.

---

## Project Overview

### Purpose

The **Amana** platform provides users with a robust, decentralized system to optimize their investments through yield-bearing crypto vaults. The project leverages cutting-edge blockchain interoperability to enable cross-chain operations, ensuring accessibility and scalability.

### Features

- **Yield Vaults**: Supports depositing assets into vaults with yield strategies across chains.
- **Cross-Chain Operations**: Seamlessly deposit and withdraw across multiple connected chains and ZetaChain.
- **Performance Fees**: Deducts fees only on profits to ensure alignment with user interests.
- **Gas Management**: Automated handling of gas for cross-chain operations.
- **Transparent Treasury**: Efficient collection and distribution of protocol fees.
- **Dynamic Swapping**: Token swaps through decentralized exchanges to optimize user returns.

### Business Logic

- **AmanaConnectedChainVault**: Manages investments for strategies on connected chains by integrating gas management and token swaps.
- **AmanaZetachainVault**: Operates yield strategies directly on ZetaChain for seamless native-chain interoperability.
- **Treasury**: Collects protocol fees for sustainability and operational support.
- **GasTank**: Ensures smooth execution of cross-chain transactions by handling gas allocations.
- **SwapHelperLib**: Provides utilities for token swaps, supporting multi-token operations.

### Use Cases

1. **Investor**: 
   - Deposit crypto assets into a vault to earn yield.
   - Withdraw assets and accrued returns seamlessly across chains.
   
2. **Protocol Manager**:
   - Configure vault strategies and update them dynamically.
   - Collect performance fees transparently in the treasury.

3. **Cross-Chain User**:
   - Deposit assets on one chain and withdraw them on another using connected chain functionality.

---

## Roles and Authorizations

### User Roles

1. **Investor**:
   - Access vaults for deposits and withdrawals.
   - Claim rewards from yield strategies.
   - No special permissions required.

2. **Protocol Manager**:
   - Configure and update vault strategies.
   - Set performance fees and treasury addresses.
   - Requires owner authorization.

3. **Smart Contract**:
   - Facilitates operations such as investing, swapping, and transferring funds.
   - Operates with restricted permissions to ensure secure fund handling.

### Access Control

- **OnlyOwner**: Used for administrative functions such as setting strategies, treasury, or gas tank addresses.
- **OnlyGateway**: Ensures that certain functions can only be triggered by the designated gateway for secure cross-chain operations.
- **Revertable**: Provides fail-safe mechanisms for handling transaction errors and reverting funds.

---

## Repository Structure

The Amana Monorepo is organized into the following core components:

```
amana-monorepo/
├── frontend/           # Frontend React application
└── contracts/          # Smart contracts for interacting with the blockchain
```

### Components Overview

- **Frontend**: Contains the React-based web application that serves as the user interface for interacting with Amana vaults.
- **Contracts**: Solidity-based smart contracts for managing yield vaults and token transactions on the blockchain.

---

## Getting Started

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **Hardhat** or **Foundry** (for smart contract development)
- **Next.js**
- **Thirdweb** (for frontend)

### Cloning the Repository

To clone the repository, run:

```bash
git clone https://github.com/AmanaDefi/Amana-monorepo.git
cd amana-monorepo
```

### Installation

Navigate to the relevant directory and install the required dependencies:

```bash
# Install frontend dependencies
cd frontend
yarn

# Install contract dependencies
cd ../contracts
yarn
```

---

### Environment Variables

#### Frontend Environment Variables

Create a `.env` file from the provided `.env.example` file in the `frontend` directory and add your Thirdweb client ID and an RPC node URL for Base:

```bash
cd frontend
cp .env.example .env
```

Edit the `.env` file and add your Thirdweb client ID and RPC node URL:

```bash
NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE=rpc-url-here
```

#### Contracts Environment Variables

Create a `.env` file from the provided `.env.example` file in the `contracts` directory and add the required keys:

```bash
cd ../contracts
cp .env.example .env
```

Edit the `.env` file and add the following keys:

```bash
PRIVATE_KEY=your-private-key-here
ARBISCAN_API_KEY=your-key-here
ALCHEMY_API_KEY=your-key-here
BASESCAN_API_KEY=your-key-here
```

---

## Running the Application

### Frontend

To start the frontend React application:

```bash
cd frontend
yarn dev
```

### Smart Contracts

To compile and deploy the smart contracts:

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network <network-name>
```

---

## Contribution Guidelines

We welcome contributions to the Amana project! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Create a Pull Request.

Please read our [Contribution Guidelines](docs/CONTRIBUTING.md) for more information. (Coming soon)

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Contact

For any questions or feedback, feel free to open an issue or contact us at [jamieson.rich@gmail.com](mailto:jamieson.rich@gmail.com).

---

Thank you for your interest in Amana. Together, let's build the future of DeFi!
