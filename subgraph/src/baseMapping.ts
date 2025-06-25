import { VaultInitialized, StrategyUpdated, Deposited, Withdrawn } from "../generated/EulerUSDC_Base/AmanaVault";
import { AmanaVault } from "../generated/EulerUSDC_Base/AmanaVault";
import { Vault, VaultDayData, Deposit, Withdrawal } from "../generated/schema";
import { BigInt, ethereum, dataSource, BigDecimal } from "@graphprotocol/graph-ts";

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

function updatePriceAndAPY(vault: Vault, timestamp: BigInt): void {
  let contract = AmanaVault.bind(dataSource.address());
  let assetsCall = contract.try_totalAssets();
  let supplyCall = contract.try_totalSupply();
  if (!assetsCall.reverted && !supplyCall.reverted && supplyCall.value.notEqual(BigInt.zero())) {
    let pps = assetsCall.value.toBigDecimal().div(supplyCall.value.toBigDecimal());
    vault.pricePerShare = pps;
    // save day snapshot
    let dayData = getOrCreateVaultDayData(vault.id, timestamp);
    dayData.pricePerShare = pps;
    dayData.save();

    // compute APY if we have 7d ago snapshot
    let day = timestamp.toI32() / 86400;
    let pastId = vault.id + "-" + (day - 7).toString();
    let past = VaultDayData.load(pastId);
    if (past != null && past.pricePerShare.gt(BigDecimal.zero())) {
      let weeklyReturn = pps.div(past.pricePerShare).minus(BigDecimal.fromString("1"));
      let apy = weeklyReturn.times(BigDecimal.fromString("52"));
      vault.apy7d = apy;
    }
  }
}

export function handleVaultInitialized(event: VaultInitialized): void {
  let id = event.address.toHex();
  let v = new Vault(id);
  v.decimals = event.params.decimals.toI32()
  v.perfFee = event.params.perfFee;
  v.createdAtBlock = event.block.number;
  v.createdAtTimestamp = event.block.timestamp;
  v.sharesSupply = BigInt.zero();
  v.tvl = BigInt.zero();
  v.normalizedTVL = BigDecimal.zero();
  v.totalDeposited = BigInt.zero();
  v.totalWithdrawn = BigInt.zero();
  v.pricePerShare = BigDecimal.zero();
  v.apy7d = BigDecimal.zero();
  v.apy30d = BigDecimal.zero();

  // Set default values for new required fields
  v.type = "Unknown";
  v.description = "Unknown vault";
  v.imgURL = "/default.png";
  v.depositFeePaidFromGasTank = false;
  v.assetSymbol = "UNKNOWN";
  v.assetDecimals = 18;
  v.assetImgURL = "/default.png";
  v.assetPrice = BigDecimal.fromString("1.0");
  v.strategyNetwork = "Unknown";
  v.strategyChainId = 0;
  v.protocolName = "Unknown";
  v.protocolImgURL = "/default.png";
  v.protocolDescription = "Unknown protocol";
  v.networkDescription = "Unknown network";
  v.riskLevel = 1;

  let contract = AmanaVault.bind(event.address);
  let n = contract.try_name();
  if (!n.reverted) v.name = n.value;
  let s = contract.try_symbol();
  if (!s.reverted) v.symbol = s.value;
  let a = contract.try_asset();
  if (!a.reverted) v.asset = a.value;
  let st = contract.try_strategyAddress();
  if (!st.reverted) v.strategy = st.value;
  let tr = contract.try_treasury();
  if (!tr.reverted) v.treasury = tr.value;
  v.save();
}

export function handleStrategyUpdated(event: StrategyUpdated): void {
  let v = Vault.load(event.address.toHex());
  if (v == null) return;
  v.strategy = event.params.newStrategyAddress;
  v.save();
}

export function handleDeposited(event: Deposited): void {
  let id = event.address.toHex();
  let v = Vault.load(id);
  if (v == null) return;
  v.totalDeposited = v.totalDeposited.plus(event.params.amount);
  v.sharesSupply = v.sharesSupply.plus(event.params.shares);
  let contract = AmanaVault.bind(event.address);
  let tvl = contract.try_totalAssets();
  if (!tvl.reverted) {
    v.tvl = tvl.value;
    v.normalizedTVL = calculateNormalizedTVL(v.tvl, v.assetDecimals);
  }
  v.save();

  let d = getOrCreateVaultDayData(id, event.block.timestamp);
  d.dailyDeposit = d.dailyDeposit.plus(event.params.amount);
  d.sharesSupply = v.sharesSupply;
  d.tvl = v.tvl;
  d.normalizedTVL = v.normalizedTVL;
  d.save();
  
  // Create deposit record
  let depositId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let deposit = new Deposit(depositId);
  deposit.vault = id;
  deposit.user = event.params.user;
  deposit.amount = event.params.amount;
  deposit.shares = event.params.shares;
  
  // Adapted code for working with both old (crossChainTxId) and new (vaultNonce) formats
  if (event.parameters.length >= 4) {
    let nonceParam = event.parameters[3].value;
    if (nonceParam.kind == ethereum.ValueKind.BYTES) {
      // Old version: convert bytes32 to BigInt for compatibility
      deposit.vaultNonce = BigInt.fromI32(0); // can't convert bytes32 -> BigInt, use 0
    } else {
      // New version
      deposit.vaultNonce = nonceParam.toBigInt();
    }
  } else {
    deposit.vaultNonce = BigInt.fromI32(0);
  }
  
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.pricePerShare = v.pricePerShare || BigDecimal.fromString("1.0");
  deposit.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let id = event.address.toHex();
  let v = Vault.load(id);
  if (v == null) return;
  v.totalWithdrawn = v.totalWithdrawn.plus(event.params.amount);
  v.sharesSupply = v.sharesSupply.minus(event.params.shares);
  let contract = AmanaVault.bind(event.address);
  let tvl = contract.try_totalAssets();
  if (!tvl.reverted) {
    v.tvl = tvl.value;
    v.normalizedTVL = calculateNormalizedTVL(v.tvl, v.assetDecimals);
  }
  v.save();

  let d = getOrCreateVaultDayData(id, event.block.timestamp);
  d.dailyWithdraw = d.dailyWithdraw.plus(event.params.amount);
  d.sharesSupply = v.sharesSupply;
  d.tvl = v.tvl;
  d.normalizedTVL = v.normalizedTVL;
  d.save();
  
  // Create withdrawal record
  let withdrawalId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.vault = id;
  withdrawal.user = event.params.user;
  withdrawal.amount = event.params.amount;
  withdrawal.shares = event.params.shares;
  
  // Adapted code for working with both old (crossChainTxId) and new (vaultNonce) formats
  if (event.parameters.length >= 4) {
    let nonceParam = event.parameters[3].value;
    if (nonceParam.kind == ethereum.ValueKind.BYTES) {
      // Old version: convert bytes32 to BigInt for compatibility
      withdrawal.vaultNonce = BigInt.fromI32(0); // can't convert bytes32 -> BigInt, use 0
    } else {
      // New version
      withdrawal.vaultNonce = nonceParam.toBigInt();
    }
  } else {
    withdrawal.vaultNonce = BigInt.fromI32(0);
  }
  
  withdrawal.blockNumber = event.block.number;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.pricePerShare = v.pricePerShare || BigDecimal.fromString("1.0");
  withdrawal.save();
}

export function handleBlock(block: ethereum.Block): void {
  let id = dataSource.address().toHex();
  let v = Vault.load(id);
  if (v == null) return;
  updatePriceAndAPY(v, block.timestamp);
  v.save();
  }

export function handleDepositedLegacy(event: Deposited): void {
  let id = event.address.toHex();
  let v = Vault.load(id);
  if (v == null) return;
  v.totalDeposited = v.totalDeposited.plus(event.params.amount);
  v.sharesSupply = v.sharesSupply.plus(event.params.shares);
  let contract = AmanaVault.bind(event.address);
  let tvl = contract.try_totalAssets();
  if (!tvl.reverted) v.tvl = tvl.value;
  v.save();

  let d = getOrCreateVaultDayData(id, event.block.timestamp);
  d.dailyDeposit = d.dailyDeposit.plus(event.params.amount);
  d.sharesSupply = v.sharesSupply;
  d.tvl = v.tvl;
  d.save();
  
  // Create deposit record - for legacy events
  let depositId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let deposit = new Deposit(depositId);
  deposit.vault = id;
  deposit.user = event.params.user;
  deposit.amount = event.params.amount;
  deposit.shares = event.params.shares;
  // For legacy events, we don't have vaultNonce, so set to 0
  deposit.vaultNonce = BigInt.fromI32(0);
  deposit.blockNumber = event.block.number;
  deposit.timestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.pricePerShare = v.pricePerShare || BigDecimal.fromString("1.0");
  deposit.save();
}

export function handleWithdrawnLegacy(event: Withdrawn): void {
  let id = event.address.toHex();
  let v = Vault.load(id);
  if (v == null) return;
  v.totalWithdrawn = v.totalWithdrawn.plus(event.params.amount);
  v.sharesSupply = v.sharesSupply.minus(event.params.shares);
  let contract = AmanaVault.bind(event.address);
  let tvl = contract.try_totalAssets();
  if (!tvl.reverted) v.tvl = tvl.value;
  v.save();

  let d = getOrCreateVaultDayData(id, event.block.timestamp);
  d.dailyWithdraw = d.dailyWithdraw.plus(event.params.amount);
  d.sharesSupply = v.sharesSupply;
  d.tvl = v.tvl;
  d.save();
  
  // Create withdrawal record - for legacy events
  let withdrawalId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let withdrawal = new Withdrawal(withdrawalId);
  withdrawal.vault = id;
  withdrawal.user = event.params.user;
  withdrawal.amount = event.params.amount;
  withdrawal.shares = event.params.shares;
  // For legacy events, we don't have vaultNonce, so set to 0
  withdrawal.vaultNonce = BigInt.fromI32(0);
  withdrawal.blockNumber = event.block.number;
  withdrawal.timestamp = event.block.timestamp;
  withdrawal.transactionHash = event.transaction.hash;
  withdrawal.pricePerShare = v.pricePerShare || BigDecimal.fromString("1.0");
  withdrawal.save();
} 