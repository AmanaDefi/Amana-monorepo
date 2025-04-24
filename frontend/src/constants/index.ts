import { VaultData, Token } from "../types/types";
import { ZC_USDC_ARB_ADDRESS, ZC_ETH_ETH_ADDRESS, ZC_USDT_POL_ADDRESS, ZC_USDT_BSC_ADDRESS, ZC_TEST_USDC_SEPOLIA_ADDRESS, ZC_POL_POL_ADDRESS, ZC_USDC_ETH_ADDRESS, ZC_USDC_BASE_ADDRESS, ZC_TEST_ETH_BASESEPOLIA_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, ZC_ETH_BASE_ADDRESS, ZC_TEST_MATIC_AMOY_ADDRESS, ZC_TEST_USDC_BSC_ADDRESS } from "../../../constants";
import { EMPTY_BALANCE } from "@/utils/helpers";

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
const ethPrice = 3400 // await fetchEthPrice();
export const swapHelperLibEddy = "0x1968643f36ad81a2756Dba0C4Dfe948bBa957A72";

export const tokens: Token[] = [
  {
    symbol: "ETH",
    decimals: 18,
    address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: ethPrice,
    balance: EMPTY_BALANCE,
    isNative: false
  },
  {
    symbol: "sETH",
    decimals: 18,
    address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
    imgURL: "/ETH.png",
    price: ethPrice,
    balance: EMPTY_BALANCE,
    isNative: false
  },
]

const MAINNET_VAULT_DATA: VaultData[] = [
  {
    id: "0x0F6514E3e4760eFc8f34fc67a05c4987367aF14e", // Base ZeroLend USDC Vault
    name: "USDC Lend Pool",
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
      isNative: false
    },
    protocol: {
      name: "ZeroLend",
      strategyAddress: "0xC967154127af55cecC47328B06385EFd8f8C427E",
      network: "Base",
      chainId: 8453,
      netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
      imgURL: "/ZeroLend.png",
      des: "Zerolend is a decentralized lending and borrowing protocol designed for efficient capital utilization and seamless DeFi integration. It enables users to supply assets, earn interest, and access liquidity with competitive rates and automated risk management. Built with a focus on security and scalability, Zerolend supports multiple assets and chains while leveraging algorithmic interest rate models. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing terms or collateral requirements."
    },
  },
  // {
  //   id: "0x8960997eaBF32c3bE224Ca91d429b57825e1EA24", // Base ZeroLend USDC Vault
  //   name: "Leveraged USDC Lend Pool",
  //   des: "Depositing USDC into the Zerolend USDC lending pool allows users to earn yield by supplying liquidity to borrowers in a decentralized market. The strategy benefits from algorithmic interest rate optimization, ensuring competitive returns while maintaining access to liquidity. Users can withdraw funds at any time, subject to pool utilization. Risks include smart contract vulnerabilities, potential borrower defaults leading to bad debt, and governance changes that may impact interest rates or collateral parameters..",
  //   symbol: "aZeroLendUSDC",
  //   imgURL: "/base.png",
  //   inputToken: {
  //     symbol: "USDC.BASE",
  //     decimals: 6,
  //     address: ZC_USDC_BASE_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "ZeroLend",
  //     strategyAddress: "0x674AE9280E4406B3cCd7345660815Ec356c87AF9",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  //     imgURL: "/ZeroLend.png",
  //     des: "Zerolend is a decentralized lending and borrowing protocol designed for efficient capital utilization and seamless DeFi integration. It enables users to supply assets, earn interest, and access liquidity with competitive rates and automated risk management. Built with a focus on security and scalability, Zerolend supports multiple assets and chains while leveraging algorithmic interest rate models. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing terms or collateral requirements."
  //   },
  // },
  {
    id: "0x5cD6e196CA1D85B8edFDf162d3A0C77268F42C69",
    name: "USDC Lend Pool",
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
      isNative: false
    },
    protocol: {
      name: "Fluid",
      strategyAddress: "0x5D4a0eF44758c9ab0571b67927ED0B849bbB12D0",
      network: "Base",
      chainId: 8453,
      netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
      imgURL: "/fluid.png",
      des: "Fluid is a decentralized lending and borrowing protocol designed for efficient capital utilization and automated yield optimization. It enables users to supply assets, earn interest, and access liquidity while benefiting from dynamic risk management. Risks include smart contract vulnerabilities, liquidation risks, and potential governance changes affecting protocol parameters."
    },
  },
  {
    id: "0x622E956626Cc6aBa655E3d92a3629b04cB038E80",
    name: "USDT Lend Pool",
    des: " Supplying USDT to a Compound lending pool allows users to earn interest by providing liquidity to borrowers. The pool utilizes an algorithmic interest rate model to optimize capital efficiency while enabling seamless borrowing. Risks include smart contract vulnerabilities, fluctuating interest rates, potential liquidity shortages, and governance decisions that may impact collateral requirements or yield dynamics.",
    symbol: "aPolUSDT",
    imgURL: "/polygon_logo.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDT.POL",
      decimals: 6,
      address: ZC_USDT_POL_ADDRESS,
      imgURL: "/usdt.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Compound",
      strategyAddress: "0x5E1613bB9d1A8838eD72BE8471326B4C05102757",
      rewardsContractAddress: "0x45939657d1CA34A8FA39A924B71D28Fe8431e581",
      network: "Polygon",
      chainId: 137,
      netdes: "Polygon PoS is a Layer 2 scaling solution for Ethereum that enhances transaction speed and reduces costs while maintaining security and EVM compatibility. Built on a Proof-of-Stake consensus mechanism, it enables fast finality and efficient smart contract execution, making it an ideal platform for dApps, DeFi, and gaming applications while benefiting from Ethereum’s decentralized security and liquidity.",
      imgURL: "/compound.png",
      des: "Compound is a decentralized lending and borrowing protocol that enables users to supply assets and earn interest while allowing others to borrow against collateral. It features algorithmically adjusted interest rates based on supply and demand, ensuring efficient capital utilization. Users benefit from permissionless access and automated yield accrual. Risks include smart contract vulnerabilities, liquidation risks, and governance decisions that may impact protocol parameters."
    },
  },

  {
    id: "0xe5fa0E4BA13D516908c5313b3375b7Ede24BFe7a", // Aave USDT on BNB
    name: "USDT Lend Pool",
    des: " Supplying USDT to an Aave lending pool enables users to earn interest while providing liquidity to borrowers. The pool features dynamic interest rates, overcollateralized loans, and risk management mechanisms such as liquidation thresholds and stable borrowing options. Risks include smart contract vulnerabilities, interest rate fluctuations, potential liquidation events, and governance updates that may affect collateral requirements or lending terms.",
    symbol: "aAaveUSDT",
    imgURL: "/bnb_logo.png",
    depositFeePaidFromGasTank: true,
    inputToken: {
      symbol: "USDT.BNB",
      decimals: 18,
      address: ZC_USDT_BSC_ADDRESS,
      imgURL: "/usdt.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Aave",
      strategyAddress: "0x21e92Bc73c0215Dbb695fba5654C2331044DbBD7",
      network: "BNB",
      chainId: 56,
      netdes: "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps. It offers high throughput but has a more centralized validator structure compared to some networks, impacting governance and security.",
      imgURL: "/aave.png",
      des: "Aave is a decentralized, non-custodial liquidity protocol that allows users to lend and borrow crypto assets while earning yield on supplied funds. It features overcollateralized loans, dynamic interest rates, and innovative mechanisms like flash loans and stable borrowing. The protocol is governed by AAVE token holders and supports multiple chains, ensuring scalability and flexibility. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing costs and collateral requirements."
    },
  },

  // {
  //   id: "0x5Eb39f7c17643Ae6d41c96EFA995E46CdF362f5e", // Base ETH Vault
  //   name: "AaveV3 ETH",
  //   des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
  //   symbol: "aAaveETH",
  //   imgURL: "/base.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "ETH.BASE",
  //     decimals: 18,
  //     address: ZC_ETH_BASE_ADDRESS,
  //     imgURL: "/ETH.png",
  //     price: ethPrice,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Aave",
  //     strategyAddress: "0x3D85ef74f5FA2c56b53CcC8c9a2a140363dE014E",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  //     imgURL: "/aave.png",
  //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //   },
  // },
  // {
  //   id: "0x2B0FD687c0EBF26D4e4F67f9b9Ab96cC5Fe69193", // Polygon POL Vault
  //   name: "AaveV3 POL",
  //   des: " This vault invests POL into a simple strategy which deposits the funds as collateral into an Aave POL pool, which earns interest every block.",
  //   symbol: "aAavePOL",
  //   imgURL: "/polygon_logo.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "POL.POL",
  //     decimals: 18,
  //     address: ZC_POL_POL_ADDRESS,
  //     imgURL: "/polygon_logo.png",
  //     price: 0.5,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Aave",
  //     strategyAddress: "0xC1F7903C20C4Da3cf4699950218069b56E52CFE6",
  //     network: "Polygon",
  //     chainId: 137,
  //     netdes: "Polygon is a POS side chain to Ethereum.",
  //     imgURL: "/aave.png",
  //     des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //   },
  // },
  // {
  //   id: "0x9E204c8109FC388DE5eA26d16d1c6cC209f4e731", // Euler USDC vault on Base
  //   name: "Euler USDC",
  //   des: " This vault invests USDC into a simple strategy which deposits the funds as collateral into a Euler USDC pool, which earns interest every block.",
  //   symbol: "aEulerUSDC",
  //   imgURL: "/base.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "USDC.BASE",
  //     decimals: 6,
  //     address: ZC_USDC_BASE_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Euler",
  //     strategyAddress: "0x42d0906c80d1950E630dD70b9D710a32F81A5F76",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  //     imgURL: "/euler.svg",
  //     des: "Euler is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //   },
  // },
  // {
  //   id: "0x25f43240450c43c58Cb7CDbB424C0c80001C72E3",
  //   name: "Moonwell Flagship USDC",
  //   des: " This vault invests USDC into a strategy which deposits the funds into the Moonwell Flagship USDC vault.",
  //   symbol: "aMoonwellUSDC",
  //   imgURL: "/base.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "USDC.BASE",
  //     decimals: 6,
  //     address: ZC_USDC_BASE_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Moonwell",
  //     strategyAddress: "0x7287b68099308cEf2581BE1e24b4A7C9C9a226fC",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  //     imgURL: "/Moonwell.jpg",
  //     des: "Moonwell is a relatively new protocol."
  //   },
  // },
  // {
  //   id: "0xBc1BAF5a96E8302c5469B0D3A8D5AD3aAccCAE7b",
  //   name: "Moonwell Eth",
  //   des: " This vault invests ETH into a strategy which deposits the funds into the Moonwell Eth vault.",
  //   symbol: "aMoonwellEth",
  //   imgURL: "/base.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "ETH.BASE",
  //     decimals: 18,
  //     address: ZC_ETH_BASE_ADDRESS,
  //     imgURL: "/ETH.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Moonwell",
  //     strategyAddress: "0x405F526e5F05E7a41836Ba6B6EafFaaAB9454880",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  //     imgURL: "/Moonwell.jpg",
  //     des: "Moonwell is a relatively new protocol."
  //   },
  // },
  // {
  //   id: "0xc8b8fc1Cc87a6d412fFd91398EE9b5C80Ecf7881", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
  //   name: "Mock USDC",
  //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
  //   symbol: "aMockUSDC",
  //   imgURL: "/ZetaChain.jpeg",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "USDC.ETH",
  //     decimals: 6,
  //     address: ZC_USDC_ETH_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Mock",
  //     strategyAddress: "0xe7b322b6445C81cD6da8e87D63731fB1cF5c9eEf",
  //     network: "Zetachain",
  //     chainId: 7000,
  //     netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
  //     imgURL: "/aave.png",
  //     des: "This is a mock strategy for testing purposes."
  //   },
  // },
  // {
  //   id: "0x2951CeE73b27c2b1Ffd66A03b77eEdD79012d2BF",
  //   name: "Eddy USDC",
  //   symbol: "aEddyUSDC",
  //   inputToken: {
  //     symbol: "USDC",
  //     decimals: 6,
  //     address: ZC_USDC_ETH_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Eddy",
  //     network: "Zetachain",
  //     imgURL: "/compound.png",
  //   },
  // },
  // {
  //   id: "0xFAcD05d51ef312F3A23d5480376750c6f4c1c192", // Base Beefy USDC Vault
  //   name: "Beefy Ionic USDC",
  //   des: "This strategy deposits the USDC into Beefy, which in turn deposits it into Morpho and farms for more USDC. The earned USDC is then deposited back into the Morpho farm. The transaction cost required to do all this is socialized among the vault's users.",
  //   symbol: "aBeefyUSDC",
  //   imgURL: "/base.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "USDC.BASE",
  //     decimals: 6,
  //     address: ZC_USDC_BASE_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Beefy",
  //     strategyAddress: "0xb7F4625Ce14B9edDBb215019B288B00eC85adE97",
  //     network: "Base",
  //     chainId: 8453,
  //     netdes: "Base is a layer-2 network built on the OP stack by Coinbase, offering low-cost, scalable transactions while inheriting Ethereum’s security. It integrates with Coinbase products, providing an accessible gateway for users and developers.",
  //     imgURL: "/beefy.png",
  //     des: "Beefy Finance is a multi-chain yield optimizer that auto-compounds rewards from liquidity pools and staking. It maximizes returns through automated strategies, reducing gas costs and manual effort."
  //   },
  // },
  // {
  //   id: "0x85eD03044179c6b641e36F8fB1d4A62b4Cf4C975", // BSC Venus USDT Vault
  //   name: "Venus USDT",
  //   des: "This strategy deposits USDT into a Venus USDT pool as collateral to earn interest. It benefits from BSC’s low fees but carries risks such as interest rate changes, liquidation, and protocol security.",
  //   symbol: "aVenusUSDT",
  //   imgURL: "/bnb_logo.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "USDT.BSC",
  //     decimals: 18,
  //     address: ZC_USDT_BSC_ADDRESS,
  //     imgURL: "/usdt.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Venus",
  //     strategyAddress: "0x056A360Db4D8fd16e12D809D6A48F049E86Ae296",
  //     network: "BSC",
  //     chainId: 56,
  //     netdes: "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps. It offers high throughput but has a more centralized validator structure compared to some networks, impacting governance and security.",
  //     imgURL: "/Venus.png",
  //     des: "Venus is a lending protocol on BSC where users supply assets to earn interest and borrow against collateral. It features VAI, a stablecoin minted via overcollateralized loans. Risks include liquidity fluctuations, governance centralization, and smart contract vulnerabilities."
  //   },
  // },
  // {
  //   id: "0xEEE1F48cB753B8507f7Bfd14850f2EA79A5c9128",
  //   name: "yUSD/USDC Pool",
  //   des: "This strategy deposits USDC into the Curve yUSD/USDC pool on Ethereum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
  //   symbol: "aCurveUSDC",
  //   imgURL: "/ETH.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "USDC.ETH",
  //     decimals: 6,
  //     address: ZC_USDC_ETH_ADDRESS,
  //     imgURL: "/USDC.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Curve",
  //     strategyAddress: "0xf6CDBA75c81E1aF9a04fCA0f57A0e49b9B277Ba3",
  //     rewardsContractAddress: "0x4F80f85FF3bf92643d8C0Afd5bC107051A661185",
  //     network: "Ethereum",
  //     chainId: 1,
  //     netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
  //     imgURL: "/curve.png",
  //     des: "Curve is a decentralized exchange and liquidity protocol on Ethereum optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
  //   },
  // },
  // {
  //   id: "0x0190090f1C151655D340edb18953E92d8cA6E472",
  //   name: "rswEth/ETH Pool",
  //   des: "This strategy deposits ETH into the Curve uniETH/ETH pool on Ethereum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
  //   symbol: "aCurveETH",
  //   imgURL: "/ETH.png",
  //   depositFeePaidFromGasTank: true,
  //   inputToken: {
  //     symbol: "ETH.ETH",
  //     decimals: 18,
  //     address: ZC_ETH_ETH_ADDRESS,
  //     imgURL: "/ETH.png",
  //     price: 1,
  //     balance: EMPTY_BALANCE,
  //     isNative: false
  //   },
  //   protocol: {
  //     name: "Curve",
  //     strategyAddress: "0x3E876f6Bfd132E50612a1d2958c560BF1631Dd56",
  //     rewardsContractAddress: "0x55e5adb2cb00bfdb085440ca6a5ec628705b2e7f",
  //     network: "Ethereum",
  //     chainId: 1,
  //     netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
  //     imgURL: "/curve.png",
  //     des: "Curve is a decentralized exchange and liquidity protocol on Ethereum optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
  //   },
  // },
  {
    id: "0xF4FA4D8115e78ACf52308FDBad10A5f9042991DE",
    name: "msETH/WETH Pool",
    des: "This strategy deposits ETH into the Curve msETH/WETH pool on Ethereum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
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
      isNative: false
    },
    protocol: {
      name: "Curve",
      strategyAddress: "0x6faC704cdfF7D3AbE3a6671FAe7f6Ade296c516b",
      rewardsContractAddress: "0x442E773FFB0043551417D5A37E10c17990fB075c",
      network: "Ethereum",
      chainId: 1,
      netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      imgURL: "/curve.png",
      des: "Curve is a decentralized exchange and liquidity protocol on Ethereum optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
    },
  },
  {
    id: "0x5224a42F612064a4334b9A528C64D54eF593e3C1",
    name: "eUSD/USDC Pool",
    des: "This strategy deposits USDC into the Curve eUSD/USDC pool on Ethereum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
    symbol: "aConvexUsdcEth",
    imgURL: "/ETH.png",
    depositFeePaidFromGasTank: false,
    inputToken: {
      symbol: "USDC.ETH",
      decimals: 6,
      address: ZC_USDC_ETH_ADDRESS,
      imgURL: "/USDC.png",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    },
    protocol: {
      name: "Curve",
      strategyAddress: "0x9acBD1c2386cd6661429BD5d7C86667258553AFC",
      rewardsContractAddress: "0xdD2642EBD57A6e8BF9644040Ef15A39Ad568feC9",
      network: "Ethereum",
      chainId: 1,
      netdes: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      imgURL: "/curve.png",
      des: "Curve is a decentralized exchange and liquidity protocol on Ethereum optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
    },
  },
  {
    id: "0xAf89d0c83C5abF11bb4f26E8B86c3773f352CDC9",
    name: "eUSD/USDC Pool",
    des: "This strategy deposits USDC into the Curve eUSD/USDC pool on Arbitrum to earn trading fees and yield. It benefits from Curve’s efficient stablecoin swaps and deep liquidity but carries risks such as interest rate fluctuations, potential impermanent loss, and protocol security vulnerabilities.",
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
      isNative: false
    },
    protocol: {
      name: "Curve",
      strategyAddress: "0x1EbA5A0bEd1C82E031dF76101dbA146632b44972",
      rewardsContractAddress: "0xD4f9bCc2e0e920e23763FA8e37eCbC4135959dB4",
      network: "Arbitrum",
      chainId: 42161,
      netdes: "TBC",
      imgURL: "/curve.png",
      des: "Curve is a decentralized exchange and liquidity protocol optimized for stablecoin and pegged asset swaps. Users provide liquidity to earn fees and rewards, benefiting from low slippage and efficient trading. Risks include smart contract vulnerabilities, impermanent loss, and potential governance changes affecting liquidity incentives."
    },
  },
];

const TESTNET_VAULT_DATA: VaultData[] = [
  //   {
  //     id: "0x237B655eB18823C78042Da4CB366BA8093efDe04", // Base Sepolia ETH Vault
  //     name: "AaveV3 ETH",
  //     des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
  //     symbol: "aAaveETH",
  //     imgURL: "/base.png",
  //     inputToken: {
  //       symbol: "ETH",
  //       decimals: 18,
  //       address: ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  //       imgURL: "/ETH.png",
  //       price: ethPrice,
  //       balance: EMPTY_BALANCE,
  //       isNative: false
  //     },
  //     protocol: {
  //       name: "Aave",
  //       strategyAddress: "0x48326BdEa7CAF701cEee64f08faE899e90c110A1",
  //       chainId: 84532,
  //       network: "Base Sepolia",
  //       netdes: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum’s decentralized security.",
  //       imgURL: "/aave.png",
  //       des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //     },
  //   },
  //   {
  //     id: "0xFAcD05d51ef312F3A23d5480376750c6f4c1c192", // Aave strategy on Eth Sepolia
  //     name: "AaveV3 ETH",
  //     des: " This vault invests ETH into a simple strategy which deposits the funds as collateral into an Aave ETH pool, which earns interest every block.",
  //     symbol: "aAaveETH",
  //     imgURL: "/Ethsepolia.png",
  //     inputToken: {
  //       symbol: "sETH",
  //       decimals: 18,
  //       address: ZC_TEST_ETH_SEPOLIA_ADDRESS,
  //       imgURL: "/ETH.png",
  //       price: ethPrice,
  //       balance: EMPTY_BALANCE,
  //       isNative: false
  //     },
  //     protocol: {
  //       name: "Aave",
  //       strategyAddress: "0x1aea20C27c3b0f34172aC416419994d39512887A",
  //       chainId: 11155111,
  //       network: "Eth Sepolia",
  //       netdes: "Eth Sepolia is a relatively new chain, backed by Coinbase and built on the OP stack.",
  //       imgURL: "/aave.png",
  //       des: "Aave is one of the oldest and most established lending protocols in web3. It is highly trusted."
  //     },
  //   },

  //   {
  //     id: "0xf18635c0e127Ac010dd484ba2EA123D8bc58a7E7", // Amana USDC Vault on Zetachain testnet, linked to Mock strategy on Zetachain testnet
  //     name: "Mock USDC",
  //     des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into mock 4626 pool.",
  //     symbol: "aMockUSDC",
  //     imgURL: "/ZetaChain.jpeg",
  //     inputToken: {
  //       symbol: "USDC.SEPOLIA",
  //       decimals: 6,
  //       address: ZC_TEST_USDC_SEPOLIA_ADDRESS,
  //       imgURL: "/USDC.png",
  //       price: 1,
  //       balance: EMPTY_BALANCE,
  //       isNative: false
  //     },
  //     protocol: {
  //       name: "Mock",
  //       strategyAddress: "0x1d0dBa968A26c1D8834B600EDAF9182E0A71FFe4",
  //       network: "Zetachain Athens",
  //       chainId: 7001,
  //       netdes: "Zetachain is a rocking new L1 that enables omnichain functionality.",
  //       imgURL: "/aave.png",
  //       des: "This is a mock strategy for testing purposes."
  //     },
  //   },
  //   // {
  //   //   id: "0x7a351114F9C2637da09f177b62A3f8736dfAa130", // Polygon Amoy POL Vault (POL is new name for MATIC)
  //   //   name: "Mock POL",
  //   //   des: " This vault invests POL (MATIC) into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
  //   //   symbol: "aMockPOL",
  //   //   imgURL: "/polygon_logo.png",
  //   //   inputToken: {
  //   //     symbol: "MATIC.AMOY",
  //   //     decimals: 18,
  //   //     address: ZC_TEST_MATIC_AMOY_ADDRESS,
  //   //     imgURL: "/polygon_logo.png",
  //   //     price: 1,
  //   //     balance: EMPTY_BALANCE,
  //   //     isNative: false
  //   //   },
  //   //   protocol: {
  //   //     name: "Mock",
  //   //     strategyAddress: "0x8AD0bD606B1820bb2a4e569EFC48501c5e0735E6",
  //   //     chainId: 80002,
  //   //     network: "Polygon Amoy",
  //   //     netdes: "Polygon is an Ethereum POS side-chain, that has been around for a while.",
  //   //     imgURL: "/polygon_logo.png",
  //   //     des: "This is a mock strategy for testing purposes."
  //   //   },
  //   // },
  //   // {
  //   //   id: "0xc01f344A7eAd2D06A196D1b2aC93be78A16bD876", // BSC USDC Vault
  //   //   name: "Mock USDC",
  //   //   des: " This vault invests USDC into a mock strategy which deposits the funds as collateral into a mock 4626 pool.",
  //   //   symbol: "aMockUSDC",
  //   //   imgURL: "/bscnet.jpg",
  //   //   inputToken: {
  //   //     symbol: "USDC",
  //   //     decimals: 18,
  //   //     address: ZC_TEST_USDC_BSC_ADDRESS,
  //   //     imgURL: "/USDC.png",
  //   //     price: 1,
  //   //     balance: EMPTY_BALANCE,
  //   //     isNative: false
  //   //   },
  //   //   protocol: {
  //   //     name: "Mock",
  //   //     strategyAddress: "0x99aDf091C5d6ad042F763018C3e43D622a22Cc24",
  //   //     chainId: 97,
  //   //     network: "BSC Testnet",
  //   //     netdes: "BSC testnet is the testnet for BNB Smart Chain - owned by Binance.",
  //   //     imgURL: "/bnb_logo.png",
  //   //     des: "This is a mock strategy for testing purposes."
  //   //   },
  //   // },
];

// Export the appropriate vault data based on DEPLOY_ENV
export const VAULT_DATA = deployEnv === "testnet" ? TESTNET_VAULT_DATA : MAINNET_VAULT_DATA;

export const USER_SETTINGS_LOCAL_STORAGE_KEY = 'user_settings';
