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

// Helper function to normalize addresses
export function normalizeAddress(address: Address): string {
  return address.toHex();
}

// Helper function to normalize bytes (user addresses)
export function normalizeBytes(bytes: Bytes): string {
  return bytes.toHex();
}

// Vault metadata mapping
function getVaultMetadata(vaultAddress: string): VaultMetadata {
  let addr = vaultAddress
  
  // ZeroLend USDC Vault -> Base
  if (addr == "0x0F6514E3e4760eFc8f34fc67a05c4987367aF14e") {
    return {
      type: "Lending Pool",
      description: "Depositing USDC into the Zerolend USDC lending pool allows users to earn yield by supplying liquidity to borrowers in a decentralized market.",
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
      protocolDescription: "Zerolend is a decentralized lending and borrowing protocol designed for efficient capital utilization and seamless DeFi integration.",
      networkDescription: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility.",
      riskLevel: 2
    };
  }
  
  // Fluid USDC Vault -> Base  
  if (addr == "0x5cD6e196CA1D85B8edFDf162d3A0C77268F42C69") {
    return {
      type: "Lending Pool",
      description: "Deploying USDC into the Fluid USDC Lend pool allows users to earn interest by supplying liquidity to borrowers.",
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
      protocolDescription: "Fluid is a decentralized lending and borrowing protocol designed for efficient capital utilization and automated yield optimization.",
      networkDescription: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility.",
      riskLevel: 2
    };
  }
  
  // Compound USDT Vault -> Polygon
  if (addr == "0x622E956626Cc6aBa655E3d92a3629b04cB038E80") {
    return {
      type: "Lending Pool",
      description: "Supplying USDT to a Compound lending pool allows users to earn interest by providing liquidity to borrowers.",
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
      protocolDescription: "Compound is a decentralized lending and borrowing protocol that enables users to supply assets and earn interest while allowing others to borrow against collateral.",
      networkDescription: "Polygon PoS is a Layer 2 scaling solution for Ethereum that enhances transaction speed and reduces costs while maintaining security and EVM compatibility.",
      riskLevel: 2
    };
  }
  
  // Aave USDT Vault -> BNB
  if (addr == "0xe5fa0E4BA13D516908c5313b3375b7Ede24BFe7a") {
    return {
      type: "Lending Pool",
      description: "Supplying USDT to an Aave lending pool enables users to earn interest while providing liquidity to borrowers.",
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
      protocolDescription: "Aave is a decentralized, non-custodial liquidity protocol that allows users to lend and borrow crypto assets while earning yield on supplied funds.",
      networkDescription: "BNB Smart Chain (BSC) is a fast, low-cost blockchain supporting smart contracts and EVM-compatible dApps.",
      riskLevel: 2
    };
  }
  
  // Curve Convex ETH Vault -> Ethereum
  if (addr == "0xF4FA4D8115e78ACf52308FDBad10A5f9042991DE") {
    return {
      type: "Liquidity Pool",
      description: "This strategy deposits ETH into the Curve msETH/WETH pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV and CVX rewards.",
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
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps. Convex Finance is a yield optimization protocol built on top of Curve.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps.",
      riskLevel: 3
    };
  }
  
  // Curve Convex USDT Vault -> Ethereum
  if (addr == "0x0552D4C51491D9bFeD97eb795E101E90a5F16d44") {
    return {
      type: "Liquidity Pool",
      description: "This strategy deposits USDT into the Curve USDT/USDe pool on Ethereum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards.",
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
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps. Convex Finance is a yield optimization protocol built on top of Curve.",
      networkDescription: "Ethereum Mainnet is a decentralized, secure blockchain that supports smart contracts and EVM-compatible dApps.",
      riskLevel: 3
    };
  }
  
  // Curve Convex USDC Vault -> Arbitrum
  if (addr == "0xAbE7a5C760B030421B5C9815fE91f9Ba68058769") {
    return {
      type: "Liquidity Pool",
      description: "This strategy deposits USDC into the Curve eUSD/USDC pool on Arbitrum, then deposits the resulting Curve LP tokens into Convex to maximize CRV rewards.",
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
      protocolDescription: "Curve is a decentralized exchange optimized for efficient stablecoin and like-asset swaps. Convex Finance is a yield optimization protocol built on top of Curve.",
      networkDescription: "Arbitrum One is a Layer 2 scaling solution for Ethereum that offers faster and cheaper transactions while maintaining Ethereum's security through rollup technology.",
      riskLevel: 3
    };
  }
  
  // Balancer USDC Vault -> Base
  if (addr == "0x8b934de59fDE50a91DAa7E788389f8fCAD35A14F") {
    return {
      type: "Liquidity Pool",
      description: "This strategy deposits USDC into the Balancer yUSD/USDC pool on Base, earning yield from trading fees and protocol incentives.",
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
      protocolDescription: "Balancer is a decentralized exchange and automated portfolio manager that enables customizable liquidity pools.",
      networkDescription: "Base is an Ethereum Layer 2 scaling solution designed for fast, low-cost transactions while maintaining security and EVM compatibility.",
      riskLevel: 3
    };
  }
  
  // Default fallback
  return {
    type: "Unknown",
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
    riskLevel: 1
  };
}

class VaultMetadata {
  type: string;
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

  // Bind contract to access view functions
  let vaultContract = AmanaVault.bind(event.address);
  let nameCall = vaultContract.try_name();
  if (!nameCall.reverted) {
    entity.name = nameCall.value;
  }
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
    
    // Bind contract to access view functions
    let vaultContract = AmanaVault.bind(event.address);
    let nameCall = vaultContract.try_name();
    if (!nameCall.reverted) {
      entity.name = nameCall.value;
    } else {
      entity.name = "Unknown Vault";
    }
    
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
    } else {
      entity.tvl = BigInt.zero();
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
  deposit.crossChainTxId = event.params.crossChainTxId;
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
  withdrawal.crossChainTxId = event.params.crossChainTxId;
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