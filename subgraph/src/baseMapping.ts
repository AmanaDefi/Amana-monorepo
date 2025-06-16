import { VaultInitialized, StrategyUpdated, Deposited, Withdrawn } from "../generated/EulerUSDC_Base/AmanaVault";
import { AmanaVault } from "../generated/EulerUSDC_Base/AmanaVault";
import { Vault, VaultDayData } from "../generated/schema";
import { BigInt, ethereum, dataSource, BigDecimal } from "@graphprotocol/graph-ts";

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
  if (!tvl.reverted) v.tvl = tvl.value;
  v.save();

  let d = getOrCreateVaultDayData(id, event.block.timestamp);
  d.dailyDeposit = d.dailyDeposit.plus(event.params.amount);
  d.sharesSupply = v.sharesSupply;
  d.tvl = v.tvl;
  d.save();
}

export function handleWithdrawn(event: Withdrawn): void {
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
}

export function handleBlock(block: ethereum.Block): void {
  let id = dataSource.address().toHex();
  let v = Vault.load(id);
  if (v == null) return;
  updatePriceAndAPY(v, block.timestamp);
  v.save();
} 