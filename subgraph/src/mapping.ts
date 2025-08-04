// @ts-nocheck
// NOTE: The following imports are generated at build time by `graph codegen`
// eslint-disable-next-line import/no-unresolved
import { VaultInitialized, StrategyUpdated, Deposited, Withdrawn } from "../generated/ZeroLendUSDC_Vault/AmanaVault";
// eslint-disable-next-line import/no-unresolved
import { AmanaVault } from "../generated/ZeroLendUSDC_Vault/AmanaVault";
// eslint-disable-next-line import/no-unresolved
import { Vault, UserPosition, Deposit, Withdrawal } from "../generated/schema";
import { VaultDayData, UserPositionDayData } from "../generated/schema";
import { BigInt, BigDecimal, Bytes, Address } from "@graphprotocol/graph-ts";

// Helper function to normalize addresses (preserves original case)
export function normalizeAddress(address: Address): string {
  return address.toHexString();
}

// Helper function to normalize bytes (user addresses, preserves original case)
export function normalizeBytes(bytes: Bytes): string {
  return bytes.toHexString();
}

// Vault metadata mapping
function getVaultMetadata(vaultAddress: string): VaultMetadata {
  let addr = vaultAddress.toLowerCase(); // normalize for comparison

  // ZeroLend USDC Vault -> Base
  if (addr == "0x0f6514e3e4760efc8f34fc67a05c4987367af14e") {
    return {
      type: "Lending Pool",
      name: "USDC",
      description: "Depositing USDC into the Zerolend USDC lending pool allows users to earn yield by supplying liquidity to borrowers in a decentralized market. The strategy benefits from algorithmic interest rate optimization, ensuring competitive returns while maintaining access to liquidity. Users can withdraw funds at any time, subject to pool utilization. Risks include smart contract vulnerabilities, potential borrower defaults leading to bad debt, and governance changes that may impact interest rates or collateral parameters.",
      imgURL: "/base.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDC.BASE",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Base",
      strategyChainId: 8453,
      protocolName: "ZeroLend",
      protocolImgURL: "/ZeroLend.png",
      protocolDescription: "Zerolend is a decentralized lending and borrowing protocol designed for efficient capital utilization and seamless DeFi integration. It enables users to supply assets, earn interest, and access liquidity with competitive rates and automated risk management. Built with a focus on security and scalability, Zerolend supports multiple assets and chains while leveraging algorithmic interest rate models. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing terms or collateral requirements.",
      networkDescription: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum's decentralized security.",
      riskLevel: 2,
      rewardsContractAddress: null,
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "Zerolend USDC",
      outputTokenImage: "/ZeroLend.png",
    };
  }

  // Fluid USDC Vault -> Base  
  if (addr == "0x5cd6e196ca1d85b8edfdf162d3a0c77268f42c69") {
    return {
      type: "Lending Pool",
      name: "USDC",
      description: "Deploying USDC into the Fluid USDC Lend pool allows users to earn interest by supplying liquidity to borrowers. The strategy benefits from automated yield optimization and dynamic risk management while maintaining access to liquidity. Risks include smart contract vulnerabilities, borrower defaults leading to potential bad debt, and governance changes that may impact yield rates or collateral parameters.",
      imgURL: "/base.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDC.BASE",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Base",
      strategyChainId: 8453,
      protocolName: "Fluid",
      protocolImgURL: "/fluid.png",
      protocolDescription: "Fluid is a decentralized lending and borrowing protocol designed for efficient capital utilization and automated yield optimization. It enables users to supply assets, earn interest, and access liquidity while benefiting from dynamic risk management. Risks include smart contract vulnerabilities, liquidation risks, and potential governance changes affecting protocol parameters.",
      networkDescription: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum's decentralized security.",
      riskLevel: 2,
      rewardsContractAddress: null,
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "Fluid USD Coin",
      outputTokenImage: "/fluid.png",
    };
  }

  // Compound USDT Vault -> Polygon
  if (addr == "0x622e956626cc6aba655e3d92a3629b04cb038e80") {
    return {
      type: "Lending Pool",
      name: "USDT",
      description: " Supplying USDT to a Compound lending pool allows users to earn interest by providing liquidity to borrowers. The pool utilizes an algorithmic interest rate model to optimize capital efficiency while enabling seamless borrowing. Risks include smart contract vulnerabilities, fluctuating interest rates, potential liquidity shortages, and governance decisions that may impact collateral requirements or yield dynamics.",
      imgURL: "/polygon_logo.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDT.POL",
      assetDecimals: 6,
      assetImgURL: "/usdt.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Polygon",
      strategyChainId: 137,
      protocolName: "Compound",
      protocolImgURL: "/compound.png",
      protocolDescription: "Compound is a decentralized lending and borrowing protocol that enables users to supply assets and earn interest while allowing others to borrow against collateral. It features algorithmically adjusted interest rates based on supply and demand, ensuring efficient capital utilization. Users benefit from permissionless access and automated yield accrual. Risks include smart contract vulnerabilities, liquidation risks, and governance decisions that may impact protocol parameters.",
      networkDescription: "Polygon PoS is a Layer 2 scaling solution for Ethereum that enhances transaction speed and reduces costs while maintaining security and EVM compatibility. Built on a Proof-of-Stake consensus mechanism, it enables fast finality and efficient smart contract execution, making it an ideal platform for dApps, DeFi, and gaming applications while benefiting from Ethereum's decentralized security and liquidity.",
      riskLevel: 2,
      rewardsContractAddress: "0x45939657d1CA34A8FA39A924B71D28Fe8431e581",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "cPolUSDT",
      outputTokenImage: "/compound.png",
    };
  }

  // Aave USDT Vault -> BNB
  if (addr == "0xe5fa0e4ba13d516908c5313b3375b7ede24bfe7a") {
    return {
      type: "Lending Pool",
      name: "USDT",
      description: " Supplying USDT to an Aave lending pool enables users to earn interest while providing liquidity to borrowers. The pool features dynamic interest rates, overcollateralized loans, and risk management mechanisms such as liquidation thresholds and stable borrowing options. Risks include smart contract vulnerabilities, interest rate fluctuations, potential liquidation events, and governance updates that may affect collateral requirements or lending terms.",
      imgURL: "/bnb_logo.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDT.BNB",
      assetDecimals: 18,
      assetImgURL: "/usdt.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "BNB",
      strategyChainId: 56,
      protocolName: "Aave",
      protocolImgURL: "/aave.png",
      protocolDescription: "Aave is a decentralized, non-custodial liquidity protocol that allows users to lend and borrow crypto assets while earning yield on supplied funds. It features overcollateralized loans, dynamic interest rates, and innovative mechanisms like flash loans and stable borrowing. The protocol is governed by AAVE token holders and supports multiple chains, ensuring scalability and flexibility. Risks include smart contract vulnerabilities, liquidation risks, and governance changes that may impact borrowing costs and collateral requirements.",
      networkDescription: "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps. It offers high throughput but has a more centralized validator structure compared to some networks, impacting governance and security.",
      riskLevel: 2,
      rewardsContractAddress: null,
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "aBnbUSDT",
      outputTokenImage: "/aave.png",
    };
  }

  // Curve Convex ETH Vault -> Ethereum
  if (addr == "0xf4fa4d8115e78acf52308fdbad10a5f9042991de") {
    return {
      type: "Liquidity Pool",
      name: "msETH/WETH",
      description: "This strategy deposits ETH into the Curve msETH/WETH pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV and CVX rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Since msETH and WETH are pegged to the same underlying asset (ETH), impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
      imgURL: "/ETH.png",
      depositFeePaidFromGasTank: false,
      assetSymbol: "ETH.ETH",
      assetDecimals: 18,
      assetImgURL: "/ETH.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Ethereum",
      strategyChainId: 1,
      protocolName: "Curve-Convex",
      protocolImgURL: "/convex.png",
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      riskLevel: 3,
      rewardsContractAddress: "0x442E773FFB0043551417D5A37E10c17990fB075c",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "cvx-msETH/WETH",
      outputTokenImage: "/convex.png",
    };
  }

  // Curve Convex USDT Vault -> Ethereum
  if (addr == "0x0552d4c51491d9bfed97eb795e101e90a5f16d44") {
    return {
      type: "Liquidity Pool",
      name: "USDT/USDe",
      description: "This strategy deposits USDT into the Curve USDT/USDe pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Because both eUSD and USDC are stablecoins, impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
      imgURL: "/ETH.png",
      depositFeePaidFromGasTank: false,
      assetSymbol: "USDT.ETH",
      assetDecimals: 6,
      assetImgURL: "/usdt.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Ethereum",
      strategyChainId: 1,
      protocolName: "Curve-Convex",
      protocolImgURL: "/curve.png",
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      riskLevel: 3,
      rewardsContractAddress: "0x60eF3c53c86E1eCEc76d900B6cf2f0B39ffD98B2",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "cvx-USDT/USDe",
      outputTokenImage: "/convex.png",
    };
  }

  // Curve Convex USDC Vault -> Arbitrum
  if (addr == "0x32fecdef376e2ad74c53663bde933116c09408f3") {
    return {
      type: "Liquidity Pool",
      name: "eUSD/USDC",
      description: "This strategy deposits USDC into the Curve eUSD/USDC pool on Arbitrum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Because both eUSD and USDC are stablecoins, impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
      imgURL: "/arbitrum-arb-logo.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDC.ARB",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Arbitrum",
      strategyChainId: 42161,
      protocolName: "Curve-Convex",
      protocolImgURL: "/convex.png",
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
      networkDescription: "Arbitrum One is a Layer 2 scaling solution for Ethereum that offers faster and cheaper transactions while maintaining Ethereum's security through rollup technology. It supports EVM-compatible smart contracts and dApps, making it easy for developers to migrate or build. While it significantly reduces gas costs and improves throughput, occasional delays can occur during periods of network congestion or when bridging assets to and from Ethereum.",
      riskLevel: 3,
      rewardsContractAddress: "0xD4f9bCc2e0e920e23763FA8e37eCbC4135959dB4",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "cvx-eUSD/USDC",
      outputTokenImage: "/convex.png",
    };
  }

  // Balancer USDC Vault -> Base
  if (addr == "0x8b934de59fde50a91daa7e788389f8fcad35a14f") {
    return {
      type: "Liquidity Pool",
      name: "yUSD/USDC",
      description: "This strategy deposits USDC into the Balancer yUSD/USDC pool on Base, earning yield from trading fees and protocol incentives. The resulting LP tokens are staked in Balancer's LiquidityGauge to earn axlOP rewards, which are harvested and reinvested to compound returns. Because both yUSD and USDC are stablecoins, the risk of impermanent loss is minimal. Returns depend on trading activity in the pool and the axlOP incentive program, which is subject to change. As more capital enters the pool, APY may decrease.",
      imgURL: "/base.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDC.BASE",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Base",
      strategyChainId: 8453,
      protocolName: "Balancer",
      protocolImgURL: "/balancer.png",
      protocolDescription: "Balancer is a decentralized exchange and automated portfolio manager that enables customizable liquidity pools. By providing liquidity to pools like yUSD/USDC on Base, users earn trading fees and can stake their LP tokens in Balancer Gauges to receive protocol rewards such as axlOP. Balancer's design supports efficient swaps and dynamic fee structures, making it a flexible and rewarding platform for DeFi yield strategies.",
      networkDescription: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility. Built on Optimistic Rollup technology, it reduces gas fees and increases transaction throughput, making it an efficient platform for deploying dApps while benefiting from Ethereum's decentralized security.",
      riskLevel: 3,
      rewardsContractAddress: "0x50355F3Bb70317E518905664CE09333FA8b90645",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "vyUSD",
      outputTokenImage: "/vyUSD.png",
    };
  }

  // YieldFi vyUSD Vault -> Ethereum
  if (addr == "0xcf18fc631e05ba7dcbcadcd212176c381256faa8") {
    return {
      type: "Yield-Bearing Stablecoin",
      name: "vyUSD",
      description: "This strategy deposits USDC into the vyUSD vault on Ethereum, a yield-optimized vault built on top of yUSD. vyUSD amplifies returns through automated DeFi strategies such as stablecoin LP positions and leverage looping. Yield is generated from protocol-driven strategies and auto-compounded within the vault. Because the underlying assets are stablecoins, risk from impermanent loss is minimal. APY is variable and influenced by vault utilization, market conditions, and strategy performance within the YieldFi protocol.",
      imgURL: "/ETH.png",
      depositFeePaidFromGasTank: false,
      assetSymbol: "USDC.ETH",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Ethereum",
      strategyChainId: 1,
      protocolName: "YieldFi",
      protocolImgURL: "/yieldfi.png",
      protocolDescription: "YieldFi is a yield automation protocol designed to simplify and maximize returns on stablecoin deposits. Users deposit stable assets like USDC or YUSD, which YieldFi routes through optimized on-chain strategies to generate yield. The protocol automatically aggregates and compounds rewards, offering a seamless experience for earning stable, passive income in DeFi.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      riskLevel: 3,
      rewardsContractAddress: null,
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "vyUSD",
      outputTokenImage: "/vyUSD.png",
    };
  }

  // Aegis YUSD Vault -> BNB
  if (addr == "0x4cb4dfc521a5c44817a1fda79fb7eafaf6f1952e") {
    return {
      type: "Yield-Bearing Stablecoin",
      name: "YUSD",
      description: "This strategy swaps USDT for YUSD, a Bitcoin-backed stablecoin that passively earns yield through delta-neutral hedging and BTC-collateralized positions. Users benefit from stable, crypto-native returns without the need to stake or lock funds. Holding YUSD also earns Aegis points, offering additional rewards.",
      imgURL: "/bnb_logo.png",
      depositFeePaidFromGasTank: true,
      assetSymbol: "USDT.BSC",
      assetDecimals: 18,
      assetImgURL: "/usdt.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "BNB",
      strategyChainId: 56,
      protocolName: "Aegis",
      protocolImgURL: "/aegis.jpeg",
      protocolDescription: "Aegis is a yield protocol that issues YUSD, a Bitcoin-backed stablecoin designed to generate stable returns through delta-neutral strategies. Users can mint or swap into YUSD to earn passive yield without staking. The protocol emphasizes transparency and capital efficiency. Risks include market volatility, BTC price movements, and smart contract vulnerabilities.",
      networkDescription: "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps. It offers high throughput but has a more centralized validator structure compared to some networks, impacting governance and security.",
      riskLevel: 3,
      rewardsContractAddress: null,
      protocolPoints: 5,
      protocolPointsDescription: "Aegis Points",
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "YUSD",
      outputTokenImage: "/aegis.jpeg",
    };
  }

  // Curve Convex cbBTC Vault -> Ethereum
  if (addr == "0x5e3adc840b55fe0b99c0418ac69113e1f0296992") {
    return {
      type: "Liquidity Pool",
      name: "tacBTC/cbBTC/FBTC",
      description: "This strategy deposits cbBTC into the Curve tacBTC/cbBTC/FBTC pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV and CVX rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Since tacBTC, cbBTC, and FBTC are all pegged to the same underlying asset (BTC), impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
      imgURL: "/ETH.png",
      depositFeePaidFromGasTank: false,
      assetSymbol: "CBBTC.ETH",
      assetDecimals: 8,
      assetImgURL: "/cbbtc.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Ethereum",
      strategyChainId: 1,
      protocolName: "Curve-Convex",
      protocolImgURL: "/convex.png",
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      riskLevel: 3,
      rewardsContractAddress: "0xca55D40f6703a5FcC46d8277D1D78751acCe9305",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "cvx-tacBTC/cbBTC/FBTC",
      outputTokenImage: "/convex.png",
    };
  }

  // Curve Convex USDf Vault -> Ethereum
  if (addr == "0xe501cbd03fa739273f49a8b54dd49de1248101f6") {
    return {
      type: "Liquidity Pool",
      name: "USDC/USDf",
      description: "This strategy deposits USDC into the Curve USDC/USDf pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV and CVX rewards. It earns trading fees from Curve and enhances yield through Convex staking rewards. Since USDC and USDf are both pegged to the US dollar, impermanent loss is minimal to negligible. Fees vary with trading volume, and reward rates are subject to change at the discretion of the underlying protocols. APY decreases as total TVL in the pool increases.",
      imgURL: "/ETH.png",
      depositFeePaidFromGasTank: false,
      assetSymbol: "USDC.ETH",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Ethereum",
      strategyChainId: 1,
      protocolName: "Curve-Convex",
      protocolImgURL: "/convex.png",
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps, offering low slippage and deep liquidity. Users earn trading fees by providing liquidity to its pools. Convex Finance is a yield optimization protocol built on top of Curve that enables liquidity providers to boost their CRV rewards without locking CRV themselves by staking their Curve LP tokens through Convex. In return, users earn additional CVX incentives alongside boosted CRV emissions. When combined, Curve and Convex allow users to earn both trading fees and stacked protocol rewards on their stablecoin liquidity, making it a powerful DeFi yield strategy.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      riskLevel: 3,
      rewardsContractAddress: "0x4A87e4219f10510b0943DCD0cD0247868Ec59E85",
      protocolPoints: 0,
      protocolPointsDescription: null,
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "cvx-USDC/USDf",
      outputTokenImage: "/convex.png",
    };
  }

  // Noon Capital sUSN Vault -> Ethereum
  if (addr == "0x8426929d568b1cbc281f5787556f84c5b101399d") {
    return {
      type: "Yield-Bearing Stablecoin",
      name: "sUSN",
      description: "This strategy swaps USDC for sUSN, the staked version of USN — a crypto-native stablecoin issued by Noon Capital. sUSN is yield-bearing by design, with returns generated through delta-neutral strategies like funding rate arbitrage and collateralized lending. As sUSN appreciates in value over time, users earn passive, compounding yield without needing to claim or stake manually.",
      imgURL: "/ETH.png",
      depositFeePaidFromGasTank: false,
      assetSymbol: "USDC.ETH",
      assetDecimals: 6,
      assetImgURL: "/USDC.png",
      assetPrice: BigDecimal.fromString("1.0"),
      strategyNetwork: "Ethereum",
      strategyChainId: 1,
      protocolName: "Noon Capital",
      protocolImgURL: "/noon_capital.svg",
      protocolDescription: "Noon Capital is the protocol behind USN and sUSN — stablecoins designed to generate consistent, crypto-native returns. While USN offers a liquid, dollar-pegged asset, sUSN is its yield-bearing counterpart, earning passive income through delta-neutral strategies like funding rate arbitrage and overcollateralized lending. Users can mint or swap into sUSN to earn without staking or lockups. The protocol emphasizes transparency, capital efficiency, and seamless DeFi integration. Risks include funding rate shifts, collateral volatility, and smart contract exposure.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps. It offers strong network security and robust decentralization but comes with higher gas fees and lower transaction throughput compared to some alternative chains.",
      riskLevel: 3,
      rewardsContractAddress: null,
      protocolPoints: 10,
      protocolPointsDescription: "Noon Points",
      cooldownPeriod: 0,
      minDeposit: 1,
      maxWithdraw: 1000000,
      outputTokenSymbol: "sUSN",
      outputTokenImage: "/sUSN.png",
    };
  }

  // Default fallback
  return {
    type: "Unknown",
    name: "Unknown Vault",
    description: "Unknown vault",
    imgURL: "/default.png",
    depositFeePaidFromGasTank: false,
    assetSymbol: "UNKNOWN",
    assetDecimals: 18,
    assetImgURL: "/default.png",
    assetPrice: BigDecimal.fromString("1.0"),
    strategyNetwork: "Unknown",
    strategyChainId: 0,
    protocolName: "Unknown",
    protocolImgURL: "/default.png",
    protocolDescription: "Unknown protocol",
    networkDescription: "Unknown network",
    riskLevel: 1,
    rewardsContractAddress: null,
    protocolPoints: 0,
    protocolPointsDescription: null,
    cooldownPeriod: 0,
    minDeposit: 1,
    maxWithdraw: 1000000,
    outputTokenSymbol: "Unknown Token",
    outputTokenImage: "/default.png",
  };
}

class VaultMetadata {
  type: string;
  name: string;
  description: string;
  imgURL: string;
  depositFeePaidFromGasTank: boolean;
  assetSymbol: string;
  assetDecimals: i32;
  assetImgURL: string;
  assetPrice: BigDecimal;
  strategyNetwork: string;
  strategyChainId: i32;
  protocolName: string;
  protocolImgURL: string;
  protocolDescription: string;
  networkDescription: string;
  riskLevel: i32;
  rewardsContractAddress: string | null;
  protocolPoints: i32;
  protocolPointsDescription: string | null;
  cooldownPeriod: i32;
  minDeposit: i32;
  maxWithdraw: i32;
  outputTokenSymbol: string;
  outputTokenImage: string;
}

// Legacy function for backward compatibility
function getStrategyNetwork(vaultAddress: string): string {
  return getVaultMetadata(vaultAddress).strategyNetwork;
}

// Function to update user balance from contract
function updateUserBalance(vaultAddress: Address, userAddress: Bytes, userPosition: UserPosition): void {
  let contract = AmanaVault.bind(vaultAddress);

  // Get current shares balance from contract
  let sharesCall = contract.try_balanceOf(Address.fromBytes(userAddress));
  if (!sharesCall.reverted) {
    userPosition.sharesBalance = sharesCall.value;

    // Convert shares to assets
    let assetsCall = contract.try_convertToAssets(sharesCall.value);
    if (!assetsCall.reverted) {
      userPosition.assetsBalance = assetsCall.value;
    } else {
      // Fallback: set assets balance to zero if conversion fails
      userPosition.assetsBalance = BigInt.zero();
    }
  } else {
    // If balanceOf call fails, keep existing values or set to zero
    userPosition.sharesBalance = BigInt.zero();
    userPosition.assetsBalance = BigInt.zero();
  }
}

// Helper function to calculate normalized TVL
function calculateNormalizedTVL(tvl: BigInt, decimals: i32): BigDecimal {
  if (tvl.equals(BigInt.zero())) {
    return BigDecimal.zero();
  }

  // Convert tvl to BigDecimal and divide by 10^decimals
  let tvlDecimal = tvl.toBigDecimal();
  let divisor = BigDecimal.fromString("1");

  // Calculate 10^decimals
  for (let i = 0; i < decimals; i++) {
    divisor = divisor.times(BigDecimal.fromString("10"));
  }

  return tvlDecimal.div(divisor);
}

// Function to update vault totals from contract
function updateVaultTotals(vaultAddress: Address, vault: Vault): void {
  let contract = AmanaVault.bind(vaultAddress);

  // Update total supply
  let totalSupplyCall = contract.try_totalSupply();
  if (!totalSupplyCall.reverted) {
    vault.sharesSupply = totalSupplyCall.value;
  }

  // Update total assets (TVL)
  let totalAssetsCall = contract.try_totalAssets();
  if (!totalAssetsCall.reverted) {
    vault.tvl = totalAssetsCall.value;
    // Calculate normalized TVL using asset decimals
    vault.normalizedTVL = calculateNormalizedTVL(vault.tvl, vault.assetDecimals);
  }

  // Update price per share
  vault.pricePerShare = calculatePricePerShare(vaultAddress.toHex());
}

export function handleVaultInitialized(event: VaultInitialized): void {
  let vaultId = normalizeAddress(event.address);
  let entity = Vault.load(vaultId);
  if (entity == null) {
    entity = new Vault(vaultId);
  }

  // Get vault metadata
  let metadata = getVaultMetadata(vaultId);

  // Basic fields from event
  entity.decimals = event.params.decimals
  entity.perfFee = event.params.perfFee;
  entity.createdAtBlock = event.block.number;
  entity.createdAtTimestamp = event.block.timestamp;

  // Set metadata fields
  entity.type = metadata.type;
  entity.name = metadata.name;
  entity.description = metadata.description;
  entity.imgURL = metadata.imgURL;
  entity.depositFeePaidFromGasTank = metadata.depositFeePaidFromGasTank;
  entity.assetSymbol = metadata.assetSymbol;
  entity.assetDecimals = metadata.assetDecimals;
  entity.assetImgURL = metadata.assetImgURL;
  entity.assetPrice = metadata.assetPrice;
  entity.strategyNetwork = metadata.strategyNetwork;
  entity.strategyChainId = metadata.strategyChainId;
  entity.protocolName = metadata.protocolName;
  entity.protocolImgURL = metadata.protocolImgURL;
  entity.protocolDescription = metadata.protocolDescription;
  entity.networkDescription = metadata.networkDescription;
  entity.riskLevel = metadata.riskLevel;
  entity.protocolPoints = metadata.protocolPoints;
  entity.protocolPointsDescription = metadata.protocolPointsDescription;
  entity.cooldownPeriod = metadata.cooldownPeriod;
  entity.minDeposit = metadata.minDeposit;
  entity.maxWithdraw = metadata.maxWithdraw;
  entity.outputTokenSymbol = metadata.outputTokenSymbol;
  entity.outputTokenImage = metadata.outputTokenImage;

  // Set rewards contract address if provided
  if (metadata.rewardsContractAddress != null) {
    let rewardsAddress = metadata.rewardsContractAddress as string;
    entity.rewardsContractAddress = Bytes.fromHexString(rewardsAddress);
  } else {
    entity.rewardsContractAddress = null;
  }

  // Bind contract to access view functions
  let vaultContract = AmanaVault.bind(event.address);
  let symbolCall = vaultContract.try_symbol();
  if (!symbolCall.reverted) {
    entity.symbol = symbolCall.value;
  }
  let assetCall = vaultContract.try_asset();
  if (!assetCall.reverted) {
    entity.asset = assetCall.value;
  }
  let strategyCall = vaultContract.try_strategyAddress();
  if (!strategyCall.reverted) {
    entity.strategy = strategyCall.value;
  }
  let treasuryCall = vaultContract.try_treasury();
  if (!treasuryCall.reverted) {
    entity.treasury = treasuryCall.value;
  }

  // Initialize default values
  entity.sharesSupply = BigInt.zero();
  entity.tvl = BigInt.zero();
  entity.normalizedTVL = BigDecimal.zero();
  entity.totalDeposited = BigInt.zero();
  entity.totalWithdrawn = BigInt.zero();
  entity.pricePerShare = BigDecimal.zero();
  entity.apy7d = BigDecimal.zero();
  entity.apy30d = BigDecimal.zero();

  entity.save();
}

export function handleStrategyUpdated(event: StrategyUpdated): void {
  let vaultId = normalizeAddress(event.address);
  let entity = Vault.load(vaultId);

  // If vault entity doesn't exist, create it (since VaultInitialized might not be emitted)
  if (entity == null) {
    entity = new Vault(vaultId);

    // Get vault metadata
    let metadata = getVaultMetadata(vaultId);

    // Set creation info
    entity.createdAtBlock = event.block.number;
    entity.createdAtTimestamp = event.block.timestamp;

    // Set metadata fields
    entity.type = metadata.type;
    entity.name = metadata.name;
    entity.description = metadata.description;
    entity.imgURL = metadata.imgURL;
    entity.depositFeePaidFromGasTank = metadata.depositFeePaidFromGasTank;
    entity.assetSymbol = metadata.assetSymbol;
    entity.assetDecimals = metadata.assetDecimals;
    entity.assetImgURL = metadata.assetImgURL;
    entity.assetPrice = metadata.assetPrice;
    entity.strategyNetwork = metadata.strategyNetwork;
    entity.strategyChainId = metadata.strategyChainId;
    entity.protocolName = metadata.protocolName;
    entity.protocolImgURL = metadata.protocolImgURL;
    entity.protocolDescription = metadata.protocolDescription;
    entity.networkDescription = metadata.networkDescription;
    entity.riskLevel = metadata.riskLevel;
    entity.protocolPoints = metadata.protocolPoints;
    entity.protocolPointsDescription = metadata.protocolPointsDescription;
    entity.cooldownPeriod = metadata.cooldownPeriod;
    entity.minDeposit = metadata.minDeposit;
    entity.maxWithdraw = metadata.maxWithdraw;
    entity.outputTokenSymbol = metadata.outputTokenSymbol;
    entity.outputTokenImage = metadata.outputTokenImage;

    // Set rewards contract address if provided
    if (metadata.rewardsContractAddress != null) {
      let rewardsAddress = metadata.rewardsContractAddress as string;
      entity.rewardsContractAddress = Bytes.fromHexString(rewardsAddress);
    } else {
      entity.rewardsContractAddress = null;
    }

    // Bind contract to access view functions
    let vaultContract = AmanaVault.bind(event.address);
    let symbolCall = vaultContract.try_symbol();
    if (!symbolCall.reverted) {
      entity.symbol = symbolCall.value;
    } else {
      entity.symbol = "UNKNOWN";
    }

    let assetCall = vaultContract.try_asset();
    if (!assetCall.reverted) {
      entity.asset = assetCall.value;
    } else {
      entity.asset = event.address; // Fallback to vault address
    }

    let treasuryCall = vaultContract.try_treasury();
    if (!treasuryCall.reverted) {
      entity.treasury = treasuryCall.value;
    }

    // Try to get decimals from contract (fallback to metadata if not available)
    let decimalsCall = vaultContract.try_decimals();
    if (!decimalsCall.reverted) {
      entity.decimals = decimalsCall.value;
    } else {
      entity.decimals = metadata.assetDecimals; // Use metadata decimals
    }

    // Set default perfFee (we can't get this from StrategyUpdated event)
    entity.perfFee = BigInt.zero();

    // Initialize values from contract if possible
    let totalSupplyCall = vaultContract.try_totalSupply();
    if (!totalSupplyCall.reverted) {
      entity.sharesSupply = totalSupplyCall.value;
    } else {
      entity.sharesSupply = BigInt.zero();
    }

    let totalAssetsCall = vaultContract.try_totalAssets();
    if (!totalAssetsCall.reverted) {
      entity.tvl = totalAssetsCall.value;
      entity.normalizedTVL = calculateNormalizedTVL(entity.tvl, entity.assetDecimals);
    } else {
      entity.tvl = BigInt.zero();
      entity.normalizedTVL = BigDecimal.zero();
    }

    // Initialize other default values
    entity.totalDeposited = BigInt.zero();
    entity.totalWithdrawn = BigInt.zero();
    entity.pricePerShare = calculatePricePerShare(vaultId);
    entity.apy7d = BigDecimal.zero();
    entity.apy30d = BigDecimal.zero();
  }

  // Update strategy address
  entity.strategy = event.params.newStrategyAddress;
  entity.save();
}

function getOrCreateUserPosition(vaultId: string, userAddress: Bytes): UserPosition {
  let id = vaultId + "-" + normalizeBytes(userAddress);
  let userPosition = UserPosition.load(id);

  if (userPosition == null) {
    userPosition = new UserPosition(id);
    userPosition.vault = vaultId;
    userPosition.user = userAddress;
    userPosition.sharesBalance = BigInt.zero();
    userPosition.assetsBalance = BigInt.zero();
    userPosition.totalDeposited = BigInt.zero();
    userPosition.totalWithdrawn = BigInt.zero();
    userPosition.totalSharesReceived = BigInt.zero();
    userPosition.totalSharesRedeemed = BigInt.zero();
    userPosition.firstDepositAt = BigInt.zero();
    userPosition.lastInteractionAt = BigInt.zero();
    userPosition.depositCount = 0;
    userPosition.withdrawalCount = 0;
  }

  return userPosition;
}

function getOrCreateVaultDayData(vaultId: string, timestamp: BigInt): VaultDayData {
  let day = timestamp.toI32() / 86400;
  let id = vaultId + "-" + day.toString();
  let dayData = VaultDayData.load(id);
  if (dayData == null) {
    dayData = new VaultDayData(id);
    dayData.vault = vaultId;
    dayData.date = day;
    dayData.sharesSupply = BigInt.zero();
    dayData.tvl = BigInt.zero();
    dayData.normalizedTVL = BigDecimal.zero();
    dayData.dailyDeposit = BigInt.zero();
    dayData.dailyWithdraw = BigInt.zero();
    dayData.pricePerShare = BigDecimal.zero();
    dayData.uniqueDepositors = 0;
    dayData.uniqueWithdrawers = 0;
    dayData.depositCount = 0;
    dayData.withdrawalCount = 0;
  }
  return dayData;
}

function getOrCreateUserPositionDayData(userPositionId: string, timestamp: BigInt): UserPositionDayData {
  let day = timestamp.toI32() / 86400;
  let id = userPositionId + "-" + day.toString();
  let dayData = UserPositionDayData.load(id);
  if (dayData == null) {
    dayData = new UserPositionDayData(id);
    dayData.userPosition = userPositionId;
    dayData.date = day;
    dayData.sharesBalance = BigInt.zero();
    dayData.assetsBalance = BigInt.zero();
    dayData.dailyDeposited = BigInt.zero();
    dayData.dailyWithdrawn = BigInt.zero();
    dayData.pricePerShare = BigDecimal.zero();
  }
  return dayData;
}

function calculatePricePerShare(vaultAddress: string): BigDecimal {
  // vaultAddress is already normalized (lowercase)
  let contract = AmanaVault.bind(Address.fromString(vaultAddress));
  let tvlCall = contract.try_totalAssets();
  let totalSupplyCall = contract.try_totalSupply();

  if (!tvlCall.reverted && !totalSupplyCall.reverted &&
    !totalSupplyCall.value.isZero() && !tvlCall.value.isZero()) {
    return tvlCall.value.toBigDecimal().div(totalSupplyCall.value.toBigDecimal());
  }

  // Return 1.0 as default price per share if calculation fails
  return BigDecimal.fromString("1.0");
}

export function handleDeposited(event: Deposited): void {
  let vaultId = normalizeAddress(event.address);
  let vault = Vault.load(vaultId);
  if (vault == null) {
    // Not initialized yet – should not happen
    return;
  }

  // Update vault totals
  vault.totalDeposited = (vault.totalDeposited || BigInt.zero()).plus(event.params.amount);

  // Update vault totals from contract (more reliable)
  updateVaultTotals(event.address, vault);
  vault.save();

  // Create or update user position
  let userPosition = getOrCreateUserPosition(vaultId, event.params.user);
  userPosition.totalDeposited = userPosition.totalDeposited.plus(event.params.amount);
  userPosition.totalSharesReceived = userPosition.totalSharesReceived.plus(event.params.shares);
  userPosition.lastInteractionAt = event.block.timestamp;
  userPosition.depositCount = userPosition.depositCount + 1;

  // Set first deposit timestamp if this is the first deposit
  if (userPosition.firstDepositAt.isZero()) {
    userPosition.firstDepositAt = event.block.timestamp;
  }

  // Update user balance from contract (more reliable than manual calculation)
  updateUserBalance(event.address, event.params.user, userPosition);

  userPosition.save();

  // Create deposit record
  let depositId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let deposit = new Deposit(depositId);
  deposit.vault = vaultId;
  deposit.user = event.params.user;
  deposit.amount = event.params.amount;
  deposit.shares = event.params.shares;
  deposit.vaultNonce = event.params.vaultNonce;
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.pricePerShare = vault.pricePerShare;
  deposit.save();

  // Update daily aggregation
  let dayData = getOrCreateVaultDayData(vaultId, event.block.timestamp);
  dayData.dailyDeposit = dayData.dailyDeposit.plus(event.params.amount);
  dayData.sharesSupply = vault.sharesSupply;
  dayData.tvl = vault.tvl;
  dayData.normalizedTVL = vault.normalizedTVL;
  dayData.pricePerShare = vault.pricePerShare;
  dayData.depositCount = dayData.depositCount + 1;
  dayData.save();

  // Update user position day data
  let userPositionDayData = getOrCreateUserPositionDayData(userPosition.id, event.block.timestamp);
  userPositionDayData.dailyDeposited = userPositionDayData.dailyDeposited.plus(event.params.amount);
  userPositionDayData.sharesBalance = userPosition.sharesBalance;
  userPositionDayData.assetsBalance = userPosition.assetsBalance;
  userPositionDayData.pricePerShare = vault.pricePerShare;
  userPositionDayData.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let vaultId = normalizeAddress(event.address);
  let vault = Vault.load(vaultId);
  if (vault == null) {
    return;
  }

  // Update vault totals
  vault.totalWithdrawn = (vault.totalWithdrawn || BigInt.zero()).plus(event.params.amount);

  // Update vault totals from contract (more reliable)
  updateVaultTotals(event.address, vault);
  vault.save();

  // Update user position
  let userPosition = getOrCreateUserPosition(vaultId, event.params.user);
  userPosition.totalWithdrawn = userPosition.totalWithdrawn.plus(event.params.amount);
  userPosition.totalSharesRedeemed = userPosition.totalSharesRedeemed.plus(event.params.shares);
  userPosition.lastInteractionAt = event.block.timestamp;
  userPosition.withdrawalCount = userPosition.withdrawalCount + 1;

  // Update user balance from contract (more reliable than manual calculation)
  updateUserBalance(event.address, event.params.user, userPosition);

  userPosition.save();

  // Create withdrawal record
  let withdrawalId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.vault = vaultId;
  withdrawal.user = event.params.user;
  withdrawal.amount = event.params.amount;
  withdrawal.shares = event.params.shares;
  withdrawal.vaultNonce = event.params.vaultNonce;
  withdrawal.blockNumber = event.block.number;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.pricePerShare = vault.pricePerShare;
  withdrawal.save();

  // Update daily aggregation
  let dayData = getOrCreateVaultDayData(vaultId, event.block.timestamp);
  dayData.dailyWithdraw = dayData.dailyWithdraw.plus(event.params.amount);
  dayData.sharesSupply = vault.sharesSupply;
  dayData.tvl = vault.tvl;
  dayData.normalizedTVL = vault.normalizedTVL;
  dayData.pricePerShare = vault.pricePerShare;
  dayData.withdrawalCount = dayData.withdrawalCount + 1;
  dayData.save();

  // Update user position day data
  let userPositionDayData = getOrCreateUserPositionDayData(userPosition.id, event.block.timestamp);
  userPositionDayData.dailyWithdrawn = userPositionDayData.dailyWithdrawn.plus(event.params.amount);
  userPositionDayData.sharesBalance = userPosition.sharesBalance;
  userPositionDayData.assetsBalance = userPosition.assetsBalance;
  userPositionDayData.pricePerShare = vault.pricePerShare;
  userPositionDayData.save();
}

export function handleDepositedLegacy(event: Deposited): void {
  let vaultId = normalizeAddress(event.address);
  let vault = Vault.load(vaultId);
  if (vault == null) {
    // Not initialized yet – should not happen
    return;
  }

  // Update vault totals
  vault.totalDeposited = (vault.totalDeposited || BigInt.zero()).plus(event.params.amount);

  // Update vault totals from contract (more reliable)
  updateVaultTotals(event.address, vault);
  vault.save();

  // Create or update user position
  let userPosition = getOrCreateUserPosition(vaultId, event.params.user);
  userPosition.totalDeposited = userPosition.totalDeposited.plus(event.params.amount);
  userPosition.totalSharesReceived = userPosition.totalSharesReceived.plus(event.params.shares);
  userPosition.lastInteractionAt = event.block.timestamp;
  userPosition.depositCount = userPosition.depositCount + 1;

  // Set first deposit timestamp if this is the first deposit
  if (userPosition.firstDepositAt.isZero()) {
    userPosition.firstDepositAt = event.block.timestamp;
  }

  // Update user balance from contract (more reliable than manual calculation)
  updateUserBalance(event.address, event.params.user, userPosition);

  userPosition.save();

  // Create deposit record - for legacy events, vaultNonce = 0
  let depositId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let deposit = new Deposit(depositId);
  deposit.vault = vaultId;
  deposit.user = event.params.user;
  deposit.amount = event.params.amount;
  deposit.shares = event.params.shares;
  deposit.vaultNonce = BigInt.fromI32(0); // Legacy events don't have vaultNonce
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.pricePerShare = vault.pricePerShare;
  deposit.save();

  // Update daily aggregation
  let dayData = getOrCreateVaultDayData(vaultId, event.block.timestamp);
  dayData.dailyDeposit = dayData.dailyDeposit.plus(event.params.amount);
  dayData.sharesSupply = vault.sharesSupply;
  dayData.tvl = vault.tvl;
  dayData.normalizedTVL = vault.normalizedTVL;
  dayData.pricePerShare = vault.pricePerShare;
  dayData.depositCount = dayData.depositCount + 1;
  dayData.save();

  // Update user position day data
  let userPositionDayData = getOrCreateUserPositionDayData(userPosition.id, event.block.timestamp);
  userPositionDayData.dailyDeposited = userPositionDayData.dailyDeposited.plus(event.params.amount);
  userPositionDayData.sharesBalance = userPosition.sharesBalance;
  userPositionDayData.assetsBalance = userPosition.assetsBalance;
  userPositionDayData.pricePerShare = vault.pricePerShare;
  userPositionDayData.save();
}

export function handleWithdrawnLegacy(event: Withdrawn): void {
  let vaultId = normalizeAddress(event.address);
  let vault = Vault.load(vaultId);
  if (vault == null) {
    return;
  }

  // Update vault totals
  vault.totalWithdrawn = (vault.totalWithdrawn || BigInt.zero()).plus(event.params.amount);

  // Update vault totals from contract (more reliable)
  updateVaultTotals(event.address, vault);
  vault.save();

  // Update user position
  let userPosition = getOrCreateUserPosition(vaultId, event.params.user);
  userPosition.totalWithdrawn = userPosition.totalWithdrawn.plus(event.params.amount);
  userPosition.totalSharesRedeemed = userPosition.totalSharesRedeemed.plus(event.params.shares);
  userPosition.lastInteractionAt = event.block.timestamp;
  userPosition.withdrawalCount = userPosition.withdrawalCount + 1;

  // Update user balance from contract (more reliable than manual calculation)
  updateUserBalance(event.address, event.params.user, userPosition);

  userPosition.save();

  // Create withdrawal record - for legacy events, vaultNonce = 0
  let withdrawalId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.vault = vaultId;
  withdrawal.user = event.params.user;
  withdrawal.amount = event.params.amount;
  withdrawal.shares = event.params.shares;
  withdrawal.vaultNonce = BigInt.fromI32(0); // Legacy events don't have vaultNonce
  withdrawal.blockNumber = event.block.number;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.pricePerShare = vault.pricePerShare;
  withdrawal.save();

  // Update daily aggregation
  let dayData = getOrCreateVaultDayData(vaultId, event.block.timestamp);
  dayData.dailyWithdraw = dayData.dailyWithdraw.plus(event.params.amount);
  dayData.sharesSupply = vault.sharesSupply;
  dayData.tvl = vault.tvl;
  dayData.normalizedTVL = vault.normalizedTVL;
  dayData.pricePerShare = vault.pricePerShare;
  dayData.withdrawalCount = dayData.withdrawalCount + 1;
  dayData.save();

  // Update user position day data
  let userPositionDayData = getOrCreateUserPositionDayData(userPosition.id, event.block.timestamp);
  userPositionDayData.dailyWithdrawn = userPositionDayData.dailyWithdrawn.plus(event.params.amount);
  userPositionDayData.sharesBalance = userPosition.sharesBalance;
  userPositionDayData.assetsBalance = userPosition.assetsBalance;
  userPositionDayData.pricePerShare = vault.pricePerShare;
  userPositionDayData.save();
} 