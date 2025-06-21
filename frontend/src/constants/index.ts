import { VaultData, Token } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
const ethPrice = 3400; // await fetchEthPrice();
export const swapHelperLibEddy = "0x1968643f36ad81a2756Dba0C4Dfe948bBa957A72";

// Global Addresses
export const SYSTEM_CONTRACT_ADDRESS =
  "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
export const ZEVM_GATEWAY_ADDRESS_TESTNET =
  "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
export const EVM_GATEWAY_ADDRESS_TESTNET =
  "0x0c487a766110c85d301d96e33579c5b317fa4995";
export const ZEVM_GATEWAY_ADDRESS =
  "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
export const EVM_GATEWAY_ADDRESS = "0x48b9aacc350b20147001f88821d31731ba4c30ed";
export const SOLANA_GATEWAY_ADDRESS =
  "ZETAjseVjuFsxdRxo6MmTCvqFwb3ZHUx56Co3vCmGis";

export const PYTH_CONTRACT_ADDRESS_ZETACHAIN =
  "0x2880aB155794e7179c9eE2e38200202908C17B43";
export const PYTH_CONTRACT_ADDRESS_ETHEREUM =
  "0x4305FB66699C3B2702D4d05CF36551390A4c69C6";
export const PYTH_CONTRACT_ADDRESS_BASE =
  "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a";
export const PYTH_CONTRACT_ADDRESS_POLYGON =
  "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";
export const PYTH_CONTRACT_ADDRESS_ARBITRUM =
  "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";

// Mainnet Addresses

// ZetaChain Addresses
export const ZC_WZETA_ADDRESS = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

export const ZC_ETH_ETH_ADDRESS = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
export const ZC_USDC_ETH_ADDRESS = "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a";
export const ZC_USDT_ETH_ADDRESS = "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7";
export const ZC_DAI_ETH_ADDRESS = "0xcC683A782f4B30c138787CB5576a86AF66fdc31d";

export const ZC_ETH_BASE_ADDRESS = "0x1de70f3e971B62A0707dA18100392af14f7fB677";
export const ZC_USDC_BASE_ADDRESS =
  "0x96152E6180E085FA57c7708e18AF8F05e37B479D";

export const ZC_POL_POL_ADDRESS = "0xADF73ebA3Ebaa7254E859549A44c74eF7cff7501";
export const ZC_USDT_POL_ADDRESS = "0xdbfF6471a79E5374d771922F2194eccc42210B9F";
export const ZC_USDC_POL_ADDRESS = "0xfC9201f4116aE6b054722E10b98D904829b469c3";

export const ZC_SOL_SOL_ADDRESS = "0x4bC32034caCcc9B7e02536945eDbC286bACbA073";
export const ZC_USDC_SOL_ADDRESS = "0x8344d6f84d26f998fa070BbEA6D2E15E359e2641";
export const ZC_USDT_SOL_ADDRESS = "0xEe9CC614D03e7Dbe994b514079f4914a605B4719";

export const ZC_USDC_BSC_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0";
export const ZC_BNB_BSC_ADDRESS = "0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb";
export const ZC_USDT_BSC_ADDRESS = "0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F";

export const ZC_BTC_BTC_ADDRESS = "0x13A0c5930C028511Dc02665E7285134B6d11A5f4";

export const ZC_USDC_ARB_ADDRESS = "0x0327f0660525b15Cdb8f1f5FBF0dD7Cd5Ba182aD";
export const ZC_USDT_ARB_ADDRESS = "0x0ca762FA958194795320635c11fF0C45C6412958";
export const ZC_ETH_ARB_ADDRESS = "0xA614Aebf7924A3Eb4D066aDCA5595E4980407f1d";

export const ZC_USDT_AVAX_ADDRESS =
  "0x2Db395976CDb9eeFCc8920F4F2f0736f1D575794";
export const ZC_AVAX_AVAX_ADDRESS =
  "0xE8d7796535F1cd63F0fe8D631E68eACe6839869B";
export const ZC_USDC_AVAX_ADDRESS =
  "0xa52Ad01A1d62b408fFe06C2467439251da61E4a9";

export const ZC_EDDY_FOURPOOL_ADDRESS =
  "0x448028804461e8e5a8877c228F3adFd58c3Da6B6";
export const ZC_EDDY4P_ADDRESS = "0xf45DC12FDEcA77afF35602d7FBE3B97f7f3dCBB2";

// Base Chain Addresses
export const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const BASE_USDT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
export const BASE_AAVE_POOL_ADDRESS =
  "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
export const BASE_AAVE_RECEIPT_TOKEN_ADDRESS =
  "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB";
export const BASE_USDC_HOLDER_ADDRESS =
  "0xF977814e90dA44bFA03b6295A0616a897441aceC";
export const BASE_USDT_HOLDER_ADDRESS =
  "0x0d5CF4Ff52A658000979C7901100817BD6cb72c6";
export const BASE_MOONWELL_USDC_VAULT_ADDRESS =
  "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca";
export const BASE_COMPOUND_USDC_VAULT_ADDRESS =
  "0xb125E6687d4313864e53df431d5425969c15Eb2F";

// Ethereum Addresses
export const ETH_USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const ETH_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

// Polygon Addresses
export const POL_USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
export const POL_USDT_ADDRESS = "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D";
export const POL_WMATIC_ADDRESS = "0x0d500B1d8E8D11dA4f62B4a1F2e3876c4d3C5eA9";
export const POL_WETH_ADDRESS = "0x7ceB23fD6bC0e96cA880fA83A8B6b14610C8f3a6";

// Arbitrum Addresses
export const ARB_USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
export const ARB_USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
export const ARB_WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const ARB_CRV_ADDRESS = "0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978";

// Testnet Addresses

// Zetachain Testnet Addresses
export const ZC_TEST_GASTANK_ADDRESS =
  "0x3bbB4509B4ffbc7fF48E33D74Ce9e2f7fFb041B8";
export const ZC_TEST_UNISWAP_ROUTER_ADDRESS =
  "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe";

export const ZC_TEST_WZETA_ADDRESS =
  "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
export const ZC_TEST_ETH_BASESEPOLIA_ADDRESS =
  "0x236b0DE675cC8F46AE186897fCCeFe3370C9eDeD";
export const ZC_TEST_ETH_SEPOLIA_ADDRESS =
  "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0";
export const ZC_TEST_USDC_SEPOLIA_ADDRESS =
  "0xcC683A782f4B30c138787CB5576a86AF66fdc31d";
export const ZC_TEST_MATIC_AMOY_ADDRESS =
  "0x777915D031d1e8144c90D025C594b3b8Bf07a08d";
export const ZC_TEST_BNB_BSC_ADDRESS =
  "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
export const ZC_TEST_USDC_BSC_ADDRESS =
  "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7";
export const ZC_TEST_USDC_AMOY_ADDRESS =
  "0xe573a6e11f8506620F123DBF930222163D46BCB6";

// Base Sepolia Addresses
export const BASE_SEPOLIA_USDC_ADDRESS =
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const BASE_SEPOLIA_AAVE_POOL_ADDRESS =
  "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
export const BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS =
  "0xf53B60F4006cab2b3C4688ce41fD5362427A2A66";
export const BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS =
  "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f";

// Polygon Amoy Addresses
export const AMOY_WMATIC_ADDRESS = "0xd39986C4bc5D9Bc4A4e532e37dBC7ea4a2CcF1BB";

// BSC Testnet Addresses
export const BSC_TEST_USDC_ADDRESS =
  "0x64544969ed7EBf5f083679233325356EbE738930";

// Eth-Sepolia Addresses
export const ETH_SEP_USDC_ADDRESS =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export const tokens: Token[] = [
  {
    symbol: "ETH",
    decimals: 18,
    address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: ethPrice,
    balance: EMPTY_BALANCE,
    isNative: false,
  },
  {
    symbol: "sETH",
    decimals: 18,
    address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: ethPrice,
    balance: EMPTY_BALANCE,
    isNative: false,
  },
];

const MAINNET_VAULT_DATA: VaultData[] = [
  {
    id: "0x0F6514E3e4760eFc8f34fc67a05c4987367aF14e", // Base ZeroLend USDC Vault
    name: "USDC Lend Pool",
    type: "Lending Pool",
    des: "Depositing USDC into the Zerolend USDC lending pool allows users to earn yield by supplying liquidity to borrowers in a decentralized market. The strategy benefits from algorithmic interest rate optimization, ensuring competitive returns while maintaining access to liquidity. Users can withdraw funds at any time, subject to pool utilization. Risks include smart contract vulnerabilities, potential borrower defaults leading to bad debt, and governance changes that may impact interest rates or collateral parameters.",
    symbol: "aZeroLendUSDC",
    imgURL: "/base.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDC.BASE",
      decimals: 6,
      address: ZC_USDC_BASE_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    protocol: {
      name: "ZeroLend",
      strategyAddress: "0x70f92e46824b2FeaC3EE5f5877dDe3a3F6b17e7a",
      network: "Base",
      chainId: 8453,
      netdes:
        "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
      imgURL: "/ZeroLend.png",
      des: "Zerolend is a decentralized lending and borrowing protocol designed for efficient capital utilization and seamless DeFi integration. It enables users to supply assets, earn interest, and access liquidity with competitive rates and automated risk management. Built with a focus on security and scalability, Zerolend supports multiple assets and chains while leveraging algorithmic interest rate models. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing terms or collateral requirements.",
    },
  },
  // // {
  // //   id: "0x8960997eaBF32c3bE224Ca91d429b57825e1EA24", // Base ZeroLend USDC Vault
  // //   name: "Leveraged USDC Lend Pool",
  // //   des: "Depositing USDC into the Zerolend USDC lending pool allows users to earn yield by supplying liquidity to borrowers in a decentralized market. The strategy benefits from algorithmic interest rate optimization, ensuring competitive returns while maintaining access to liquidity. Users can withdraw funds at any time, subject to pool utilization. Risks include smart contract vulnerabilities, potential borrower defaults leading to bad debt, and governance changes that may impact interest rates or collateral parameters..",
  // //   symbol: "aZeroLendUSDC",
  // //   imgURL: "/base.png",
  // //   inputToken: {
  // //     symbol: "USDC.BASE",
  // //     decimals: 6,
  // //     address: ZC_USDC_BASE_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "ZeroLend",
  // //     strategyAddress: "0x674AE9280E4406B3cCd7345660815Ec356c87AF9",
  // //     network: "Base",
  // //     chainId: 8453,
  // //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  // //     imgURL: "/ZeroLend.png",
  // //     des: "Zerolend is a decentralized lending and borrowing protocol designed for efficient capital utilization and seamless DeFi integration. It enables users to supply assets, earn interest, and access liquidity with competitive rates and automated risk management. Built with a focus on security and scalability, Zerolend supports multiple assets and chains while leveraging algorithmic interest rate models. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing terms or collateral requirements."
  // //   },
  // // },
  {
    id: "0x5cD6e196CA1D85B8edFDf162d3A0C77268F42C69",
    name: "USDC Lend Pool",
    type: "Lending Pool",
    des: "Deploying USDC into the Fluid USDC Lend pool allows users to earn interest by supplying liquidity to borrowers. The strategy benefits from automated yield optimization and dynamic risk management while maintaining access to liquidity. Risks include smart contract vulnerabilities, borrower defaults leading to potential bad debt, and governance changes that may impact yield rates or collateral parameters.",
    symbol: "aFluidUSDC",
    imgURL: "/base.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDC.BASE",
      decimals: 6,
      address: ZC_USDC_BASE_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    protocol: {
      name: "Fluid",
      strategyAddress: "0x916e59336fD9EBd752630a80BeD39A0c9637471D",
      network: "Base",
      chainId: 8453,
      netdes:
        "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
      imgURL: "/fluid.png",
      des: "Fluid is a decentralized lending and borrowing protocol designed for efficient capital utilization and automated yield optimization. It enables users to supply assets, earn interest, and access liquidity while benefiting from dynamic risk management. Risks include smart contract vulnerabilities, liquidation risks, and potential governance changes affecting protocol parameters.",
    },
  },
  {
    id: "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
    name: "USDT Lend Pool",
    type: "Lending Pool",
    des: " Supplying USDT to a Compound lending pool allows users to earn interest by providing liquidity to borrowers. The pool utilizes an algorithmic interest rate model to optimize capital efficiency while enabling seamless borrowing. Risks include smart contract vulnerabilities, fluctuating interest rates, potential liquidity shortages, and governance decisions that may impact collateral requirements or yield dynamics.",
    symbol: "aPolUSDT",
    imgURL: "/polygon_logo.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDT.POL",
      decimals: 6,
      address: ZC_USDT_POL_ADDRESS,
      imgURL: "/tether.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    protocol: {
      name: "Compound",
      strategyAddress: "0x8A5B82e85eab876438e14264817d20669b2e3671",
      rewardsContractAddress: "0x45939657d1CA34A8FA39A924B71D28Fe8431e581",
      network: "Polygon",
      chainId: 137,
      netdes:
        "Polygon PoS is a Layer 2 scaling solution for Ethereum that enhances transaction speed and reduces costs while maintaining security and EVM compatibility. Built on a Proof-of-Stake consensus mechanism, it enables fast finality and efficient smart contract execution, making it an ideal platform for dApps, DeFi, and gaming applications while benefiting from Ethereum’s decentralized security and liquidity.",
      imgURL: "/compound.png",
      des: "Compound is a decentralized lending and borrowing protocol that enables users to supply assets and earn interest while allowing others to borrow against collateral. It features algorithmically adjusted interest rates based on supply and demand, ensuring efficient capital utilization. Users benefit from permissionless access and automated yield accrual. Risks include smart contract vulnerabilities, liquidation risks, and governance decisions that may impact protocol parameters.",
    },
  },

  {
    id: "0xe5fa0E4BA13D516908c5313b3375b7Ede24BFe7a", // Aave USDT on BNB
    name: "USDT Lend Pool",
    type: "Lending Pool",
    des: " Supplying USDT to an Aave lending pool enables users to earn interest while providing liquidity to borrowers. The pool features dynamic interest rates, overcollateralized loans, and risk management mechanisms such as liquidation thresholds and stable borrowing options. Risks include smart contract vulnerabilities, interest rate fluctuations, potential liquidation events, and governance updates that may affect collateral requirements or lending terms.",
    symbol: "aAaveUSDT",
    imgURL: "/bnb_logo.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDT.BNB",
      decimals: 18,
      address: ZC_USDT_BSC_ADDRESS,
      imgURL: "/tether.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x1aea20C27c3b0f34172aC416419994d39512887A",
      network: "BNB",
      chainId: 56,
      netdes:
        "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps. It offers high throughput but has a more centralized validator structure compared to some networks, impacting governance and security.",
      imgURL: "/aave.png",
      des: "Aave is a decentralized, non-custodial liquidity protocol that allows users to lend and borrow crypto assets while earning yield on supplied funds. It features overcollateralized loans, dynamic interest rates, and innovative mechanisms like flash loans and stable borrowing. The protocol is governed by AAVE token holders and supports multiple chains, ensuring scalability and flexibility. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing costs and collateral requirements.",
    },
  },

  // // {
  // //   id: "0x5Eb39f7c17643Ae6d41c96EFA995E46CdF362f5e", // Base ETH Vault
  // //   name: "AaveV3 ETH",
  // //   des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
  // //   symbol: "aAaveETH",
  // //   imgURL: "/base.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "ETH.BASE",
  // //     decimals: 18,
  // //     address: ZC_ETH_BASE_ADDRESS,
  // //     imgURL: "/ETH.png",
  // //     price: ethPrice,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Aave",
  // //     strategyAddress: "0x3D85ef74f5FA2c56b53CcC8c9a2a140363dE014E",
  // //     network: "Base",
  // //     chainId: 8453,
  // //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  // //     imgURL: "/aave.png",
  // //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  // //   },
  // // },
  // // {
  // //   id: "0x2B0FD687c0EBF26D4e4F67f9b9Ab96cC5Fe69193", // Polygon POL Vault
  // //   name: "AaveV3 POL",
  // //   des: " This vault invests POL into a simple strategy which deposits the funds as collateral into an Aave POL pool, which earns interest every block.",
  // //   symbol: "aAavePOL",
  // //   imgURL: "/polygon_logo.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "POL.POL",
  // //     decimals: 18,
  // //     address: ZC_POL_POL_ADDRESS,
  // //     imgURL: "/polygon_logo.png",
  // //     price: 0.5,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Aave",
  // //     strategyAddress: "0xC1F7903C20C4Da3cf4699950218069b56E52CFE6",
  // //     network: "Polygon",
  // //     chainId: 137,
  // //     netdes: "Polygon is a POS side chain to Ethereum.",
  // //     imgURL: "/aave.png",
  // //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  // //   },
  // // },
  // // {
  // //   id: "0x9E204c8109FC388DE5eA26d16d1c6cC209f4e731", // Euler USDC vault on Base
  // //   name: "Euler USDC",
  // //   des: " This vault invests USDC into a simple strategy which deposits the funds as collateral into a Euler USDC pool, which earns interest every block.",
  // //   symbol: "aEulerUSDC",
  // //   imgURL: "/base.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "USDC.BASE",
  // //     decimals: 6,
  // //     address: ZC_USDC_BASE_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Euler",
  // //     strategyAddress: "0x42d0906c80d1950E630dD70b9D710a32F81A5F76",
  // //     network: "Base",
  // //     chainId: 8453,
  // //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  // //     imgURL: "/euler.svg",
  // //     des: "Euler is one of the oldest and most established lending protocols in web3. It is highly trusted."
  // //   },
  // // },
  // // {
  // //   id: "0x25f43240450c43c58Cb7CDbB424C0c80001C72E3",
  // //   name: "Moonwell Flagship USDC",
  // //   des: " This vault invests USDC into a strategy which deposits the funds into the Moonwell Flagship USDC vault.",
  // //   symbol: "aMoonwellUSDC",
  // //   imgURL: "/base.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "USDC.BASE",
  // //     decimals: 6,
  // //     address: ZC_USDC_BASE_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Moonwell",
  // //     strategyAddress: "0x7287b68099308cEf2581BE1e24b4A7C9C9a226fC",
  // //     network: "Base",
  // //     chainId: 8453,
  // //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  // //     imgURL: "/Moonwell.jpg",
  // //     des: "Moonwell is a relatively new protocol."
  // //   },
  // // },
  // // {
  // //   id: "0xBc1BAF5a96E8302c5469B0D3A8D5AD3aAccCAE7b",
  // //   name: "Moonwell Eth",
  // //   des: " This vault invests ETH into a strategy which deposits the funds into the Moonwell Eth vault.",
  // //   symbol: "aMoonwellEth",
  // //   imgURL: "/base.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "ETH.BASE",
  // //     decimals: 18,
  // //     address: ZC_ETH_BASE_ADDRESS,
  // //     imgURL: "/ETH.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Moonwell",
  // //     strategyAddress: "0x405F526e5F05E7a41836Ba6B6EafFaaAB9454880",
  // //     network: "Base",
  // //     chainId: 8453,
  // //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  // //     imgURL: "/Moonwell.jpg",
  // //     des: "Moonwell is a relatively new protocol."
  // //   },
  // // },
  // // {
  // //   id: "0xc8b8fc1Cc87a6d412fFd91398EE9b5C80Ecf7881", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
  // //   name: "Mock USDC",
  // //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
  // //   symbol: "aMockUSDC",
  // //   imgURL: "/ZetaChain.jpeg",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "USDC.ETH",
  // //     decimals: 6,
  // //     address: ZC_USDC_ETH_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Mock",
  // //     strategyAddress: "0xe7b322b6445C81cD6da8e87D63731fB1cF5c9eEf",
  // //     network: "Zetachain",
  // //     chainId: 7000,
  // //     netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
  // //     imgURL: "/aave.png",
  // //     des: "This is a mock strategy for testing purposes."
  // //   },
  // // },
  // // {
  // //   id: "0x2951CeE73b27c2b1Ffd66A03b77eEdD79012d2BF",
  // //   name: "Eddy USDC",
  // //   symbol: "aEddyUSDC",
  // //   inputToken: {
  // //     symbol: "USDC",
  // //     decimals: 6,
  // //     address: ZC_USDC_ETH_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Eddy",
  // //     network: "Zetachain",
  // //     imgURL: "/compound.png",
  // //   },
  // // },
  // // {
  // //   id: "0xFAcD05d51ef312F3A23d5480376750c6f4c1c192", // Base Beefy USDC Vault
  // //   name: "Beefy Ionic USDC",
  // //   des: "This strategy deposits the USDC into Beefy, which in turn deposits it into Morpho and farms for more USDC. The earned USDC is then deposited back into the Morpho farm. The transaction cost required to do all this is socialized among the vault's users.",
  // //   symbol: "aBeefyUSDC",
  // //   imgURL: "/base.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "USDC.BASE",
  // //     decimals: 6,
  // //     address: ZC_USDC_BASE_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Beefy",
  // //     strategyAddress: "0xb7F4625Ce14B9edDBb215019B288B00eC85adE97",
  // //     network: "Base",
  // //     chainId: 8453,
  // //     netdes: "Base is a layer-2 network built on the OP stack by Coinbase, offering low-cost, scalable transactions while inheriting Ethereum’s security. It integrates with Coinbase products, providing an accessible gateway for users and developers.",
  // //     imgURL: "/beefy.png",
  // //     des: "Beefy Finance is a multi-chain yield optimizer that auto-compounds rewards from liquidity pools and staking. It maximizes returns through automated strategies, reducing gas costs and manual effort."
  // //   },
  // // },
  // // {
  // //   id: "0x85eD03044179c6b641e36F8fB1d4A62b4Cf4C975", // BSC Venus USDT Vault
  // //   name: "Venus USDT",
  // //   des: "This strategy deposits USDT into a Venus USDT pool as collateral to earn interest. It benefits from BSC’s low fees but carries risks such as interest rate changes, liquidation, and protocol security.",
  // //   symbol: "aVenusUSDT",
  // //   imgURL: "/bnb_logo.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "USDT.BSC",
  // //     decimals: 18,
  // //     address: ZC_USDT_BSC_ADDRESS,
  // //     imgURL: "/usdt.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Venus",
  // //     strategyAddress: "0x056A360Db4D8fd16e12D809D6A48F049E86Ae296",
  // //     network: "BSC",
  // //     chainId: 56,
  // //     netdes: "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps. It offers high throughput but has a more centralized validator structure compared to some networks, impacting governance and security.",
  // //     imgURL: "/Venus.png",
  // //     des: "Venus is a lending protocol on BSC where users supply assets to earn interest and borrow against collateral. It features VAI, a stablecoin minted via overcollateralized loans. Risks include liquidity fluctuations, governance centralization, and smart contract vulnerabilities."
  // //   },
  // // },
  // // {
  // //   id: "0xEEE1F48cB753B8507f7Bfd14850f2EA79A5c9128",
  // //   name: "yUSD/USDC Pool",
  // //   des: "This strategy deposits USDC into the Curve yUSD/USDC pool on Ethereum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
  // //   symbol: "aCurveUSDC",
  // //   imgURL: "/ETH.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "USDC.ETH",
  // //     decimals: 6,
  // //     address: ZC_USDC_ETH_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Curve",
  // //     strategyAddress: "0xf6CDBA75c81E1aF9a04fCA0f57A0e49b9B277Ba3",
  // //     rewardsContractAddress: "0x4F80f85FF3bf92643d8C0Afd5bC107051A661185",
  // //     network: "Ethereum",
  // //     chainId: 1,
  // //     netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
  // //     imgURL: "/curve.png",
  // //     des: "Curve is a decentralized exchange and liquidity protocol on Ethereum optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
  // //   },
  // // },
  // // {
  // //   id: "0x0190090f1C151655D340edb18953E92d8cA6E472",
  // //   name: "rswEth/ETH Pool",
  // //   des: "This strategy deposits ETH into the Curve uniETH/ETH pool on Ethereum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
  // //   symbol: "aCurveETH",
  // //   imgURL: "/ETH.png",
  // //   depositFeePaidFromGasTank: true,
  // //   inputToken: {
  // //     symbol: "ETH.ETH",
  // //     decimals: 18,
  // //     address: ZC_ETH_ETH_ADDRESS,
  // //     imgURL: "/ETH.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Curve",
  // //     strategyAddress: "0x3E876f6Bfd132E50612a1d2958c560BF1631Dd56",
  // //     rewardsContractAddress: "0x55e5adb2cb00bfdb085440ca6a5ec628705b2e7f",
  // //     network: "Ethereum",
  // //     chainId: 1,
  // //     netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
  // //     imgURL: "/curve.png",
  // //     des: "Curve is a decentralized exchange and liquidity protocol on Ethereum optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
  // //   },
  // // },
  {
    id: "0xF4FA4D8115e78ACf52308FDBad10A5f9042991DE",
    name: "msETH/WETH Pool",
    type: "Liquidity Pool",
    des: "This strategy deposits ETH into the Curve msETH/WETH pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV and CVX rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Since msETH and WETH are pegged to the same underlying asset (ETH), impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
    symbol: "aCurveETH",
    imgURL: "/ETH.png",
    depositFeePaidFromGasTank: false,
    inputToken: {
      symbol: "ETH.ETH",
      decimals: 18,
      address: ZC_ETH_ETH_ADDRESS,
      imgURL: "/ETH.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    protocol: {
      name: "Curve-Convex",
      strategyAddress: "0x43a2332ac629D11DAAf2B6E94d5A808950a3df75",
      rewardsContractAddress: "0x442E773FFB0043551417D5A37E10c17990fB075c",
      network: "Ethereum",
      chainId: 1,
      netdes:
        "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      imgURL: "/convex.png",
      des: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
    },
  },
  // {
  //   id: "0x0552D4C51491D9bFeD97eb795E101E90a5F16d44",
  //   name: "USDT/USDe Pool",
  //   type: "Liquidity Pool",
  //   des: "This strategy deposits USDT into the Curve USDT/USDe pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Because both eUSD and USDC are stablecoins, impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
  //   symbol: "aConvexUsdtEth",
  //   imgURL: "/ETH.png",
  //   depositFeePaidFromGasTank: false,
  //   inputToken: {
  //     symbol: "USDT.ETH",
  //     decimals: 6,
  //     address: ZC_USDT_ETH_ADDRESS,
  //     imgURL: "/USDT.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Curve-Convex",
  //     strategyAddress: "0x3B3949A8dC9B1bF6EDd3D01e1BAcd8971a408039",
  //     rewardsContractAddress: "0x60eF3c53c86E1eCEc76d900B6cf2f0B39ffD98B2",
  //     network: "Ethereum",
  //     chainId: 1,
  //     netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
  //     imgURL: "/curve.png",
  //     des: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy."
  //   },
  // },
  // // {
  // //   id: "0x5224a42F612064a4334b9A528C64D54eF593e3C1",
  // //   name: "eUSD/USDC Pool",
  // //   type: "Liquidity Pool",
  // //   des: "This strategy deposits USDC into the Curve eUSD/USDC pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Because both eUSD and USDC are stablecoins, impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
  // //   symbol: "aConvexUsdcEth",
  // //   imgURL: "/ETH.png",
  // //   depositFeePaidFromGasTank: false,
  // //   inputToken: {
  // //     symbol: "USDC.ETH",
  // //     decimals: 6,
  // //     address: ZC_USDC_ETH_ADDRESS,
  // //     imgURL: "/USDC.png",
  // //     price: 1,
  // //     balance: EMPTY_BALANCE,
  // //     isNative: false
  // //   },
  // //   protocol: {
  // //     name: "Curve-Convex",
  // //     strategyAddress: "0x9acBD1c2386cd6661429BD5d7C86667258553AFC",
  // //     rewardsContractAddress: "0xdD2642EBD57A6e8BF9644040Ef15A39Ad568feC9",
  // //     network: "Ethereum",
  // //     chainId: 1,
  // //     netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
  // //     imgURL: "/curve.png",
  // //     des: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy."
  // //   },
  // // },
  {
    id: "0x32fECdEf376E2aD74C53663BDE933116C09408f3", //"0x32fECdEf376E2aD74C53663BDE933116C09408f3",
    name: "eUSD/USDC Pool",
    type: "Liquidity Pool",
    des: "This strategy deposits USDC into the Curve eUSD/USDC pool on Arbitrum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Because both eUSD and USDC are stablecoins, impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
    symbol: "aConvexUsdcArb",
    imgURL: "/arbitrum-arb-logo.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDC.ARB",
      decimals: 6,
      address: ZC_USDC_ARB_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    },
    protocol: {
      name: "Curve-Convex",
      strategyAddress: "0xEF2D1463de249b1b74Ea60B73D05D25A0C8516A3", //"0x5b2102E9a61dFFcB47EF0D15d6c1D01ccA2A9695",
      rewardsContractAddress: "0xD4f9bCc2e0e920e23763FA8e37eCbC4135959dB4",
      network: "Arbitrum",
      chainId: 42161,
      netdes:
        "Arbitrum One is a Layer 2 scaling solution for Ethereum that offers faster and cheaper transactions while maintaining Ethereum’s security through rollup technology. It supports EVM-compatible smart contracts and dApps, making it easy for developers to migrate or build. While it significantly reduces gas costs and improves throughput, occasional delays can occur during periods of network congestion or when bridging assets to and from Ethereum.",
      imgURL: "/convex.png",
      des: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
    },
  },
  {
    id: "0xe488d52601772bc327048E61F86Ee40df75b7a4F",
    name: "yUSD/USDC Pool",
    type: "Liquidity Pool",
    des: "This strategy deposits USDC into the Balancer yUSD/USDC pool on Base, earning yield from trading fees and protocol incentives. The resulting LP tokens are staked in Balancer’s LiquidityGauge to earn axlOP rewards, which are harvested and reinvested to compound returns. Because both yUSD and USDC are stablecoins, the risk of impermanent loss is minimal. Returns depend on trading activity in the pool and the axlOP incentive program, which is subject to change. As more capital enters the pool, APY may decrease.",
    symbol: "aBalancerUsdcBase",
    imgURL: "/base.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDC.BASE",
      decimals: 6,
      address: ZC_USDC_BASE_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Balancer",
      strategyAddress: "0xE588Ed2AC6A3D0A1A4a5833fBb4b4A026834Da57",
      rewardsContractAddress: "0x50355F3Bb70317E518905664CE09333FA8b90645",
      network: "Base",
      chainId: 8453,
      netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
      imgURL: "/balancer.png",
      des: "Balancer is a decentralized exchange and automated portfolio manager that enables customizable liquidity pools. By providing liquidity to pools like yUSD/USDC on Base, users earn trading fees and can stake their LP tokens in Balancer Gauges to receive protocol rewards such as axlOP. Balancer’s design supports efficient swaps and dynamic fee structures, making it a flexible and rewarding platform for DeFi yield strategies."
    },
  },
];

const TESTNET_VAULT_DATA: VaultData[] = [
  {
    id: "0x130ab2E8B959788c1035Ed38b9ec69E7D7d3384D", // Base Sepolia ETH Vault
    name: "AaveV3 ETH",
    type: "Lending Pool",

    des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
    symbol: "aAaveETH",
    imgURL: "/base.png",
    depositFeePaidFromGasTank: true,

    inputToken: {
      symbol: "ETH",
      decimals: 18,
      address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      imgURL: "/ETH.png",
      price: ethPrice,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x6e16D120f8207b4f376A4aDA0CD499757BB7129E",
      chainId: 84532,
      network: "Base Sepolia",
      netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
      imgURL: "/aave.png",
      des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
    },
  },
  // {
  //   id: "0xFAcD05d51ef312F3A23d5480376750c6f4c1c192", // Aave strategy on Eth Sepolia
  //   name: "AaveV3 ETH",
  //   des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
  //   symbol: "aAaveETH",
  //   imgURL: "/Ethsepolia.png",
  //   inputToken: {
  //     symbol: "sETH",
  //     decimals: 18,
  //     address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
  //     imgURL: "/ETH.png",
  //     price: ethPrice,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Aave",
  //     strategyAddress: "0x1aea20C27c3b0f34172aC416419994d39512887A",
  //     chainId: 11155111,
  //     network: "Eth Sepolia",
  //     netdes: "Eth Sepolia is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //     imgURL: "/aave.png",
  //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //   },
  // },

  // {
  //   id: "0xf18635c0e127Ac010dd484ba2EA123D8bc58a7E7", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
  //   name: "Mock USDC",
  //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
  //   symbol: "aMockUSDC",
  //   imgURL: "/ZetaChain.jpeg",
  //   inputToken: {
  //     symbol: "USDC.SEPOLIA",
  //     decimals: 6,
  //     address: ZC_TEST_USDC_SEPOLIA_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     strategyAddress: "0x1d0dBa968A26c1D8834B600EDAF9182E0A71FFe4",
  //     network: "Zetachain Athens",
  //     chainId: 7001,
  //     netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
  //     imgURL: "/aave.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },
  // {
  //   id: "0x7a351114F9C2637da09f177b62A3f8736dfAa130", // Polygon Amoy POL Vault (POL is new name for MATIC)
  //   name: "Mock POL",
  //   des: " This vault invests POL (MATIC) into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
  //   symbol: "aMockPOL",
  //   imgURL: "/polygon_logo.png",
  //   inputToken: {
  //     symbol: "MATIC.AMOY",
  //     decimals: 18,
  //     address: ZC_TEST_MATIC_AMOY_ADDRESS,
  //     imgURL: "/polygon_logo.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     strategyAddress: "0x8AD0bD606B1820bb2a4e569EFC48501c5e0735E6",
  //     chainId: 80002,
  //     network: "Polygon Amoy",
  //     netdes: "Polygon is an Ethereum POS side-chain, that has been around for a while.",
  //     imgURL: "/polygon_logo.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },
  // {
  //   id: "0xc01f344A7eAd2D06A196D1b2aC93be78A16bD876", // BSC USDC Vault
  //   name: "Mock USDC",
  //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
  //   symbol: "aMockUSDC",
  //   imgURL: "/bscnet.jpg",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 18,
  //     address: ZC_TEST_USDC_BSC_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     strategyAddress: "0x99aDf091C5d6ad042F763018C3e43D622a22Cc24",
  //     chainId: 97,
  //     network: "BSC Testnet",
  //     netdes: "BSC testnet is the testnet for BNB Smart Chain - owned by Binance.",
  //     imgURL: "/bnb_logo.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },
];

// Export the appropriate vault data based on DEPLOY_ENV
export const VAULT_DATA =
  deployEnv === "testnet" ? TESTNET_VAULT_DATA : MAINNET_VAULT_DATA;

export const USER_SETTINGS_LOCAL_STORAGE_KEY = "user_settings";

export const ONE_MINUTE = 60 * 1000;

export const RECEIPT_LOCAL_STORAGE_KEY = 'receipt_local_storage_key'


export const ZERO_ACCOUNT = {
  address: "0x0000000000000000000000000000000000000000",
  sendTransaction: async () => {
    throw new Error("sendTransaction not implemented for ZERO_ACCOUNT");
  },
  signMessage: async () => {
    throw new Error("signMessage not implemented for ZERO_ACCOUNT");
  },
  signTypedData: async () => {
    throw new Error("signTypedData not implemented for ZERO_ACCOUNT");
  },
};

export const EXCLUDED_VAULTS = ['0x0552d4c51491d9bfed97eb795e101e90a5f16d44'];