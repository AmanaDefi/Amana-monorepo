# Amana Monorepo

Welcome to the **Amana Monorepo**. This repository contains all the core components of the Amana project, organized for streamlined collaboration and development. Amana aims to provide decentralized finance (DeFi) solutions, enabling users to invest in crypto yield-bearing vaults in a seamless and efficient way.

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


## Getting Started

To get started with the Amana Monorepo, follow these steps:

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **Hardhat** or **Foundry** (for smart contract development)

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

# Install shared-utils dependencies
cd ../contracts
yarn
```

### Environment Variables

Create a `.env` file from the provided `.env.example` file and add your Thirdweb client ID:

```bash
cp .env.example .env
```

Edit the `.env` file and add your Thirdweb client ID:

```bash
NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your-client-id-here
```

### Running the Application

#### Frontend
To start the frontend React application:

```bash
cd frontend
yarn dev
```


#### Smart Contracts
To compile and deploy the smart contracts:

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network <network-name>
```

## Contributing

We welcome contributions to the Amana project! To contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Create a Pull Request.

Please read our [Contribution Guidelines](docs/CONTRIBUTING.md) for more information. (Coming soon)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or feedback, feel free to open an issue or contact us at [jamieson.rich@gmail.com](mailto:jamieson.rich@gmail.com).

---

Thank you for your interest in Amana. Together, let's build the future of DeFi!
