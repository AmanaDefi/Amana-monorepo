import { VaultData, Token, Balance, VaultAPY, VaultTotalAssets, UserVaultBalance } from '@/types/types';
import { GraphVault, GraphUserPosition } from '@/types/graphTypes';
import { EMPTY_BALANCE } from '@/utils/helpers';
import { formatUnits } from 'viem';

export function convertGraphVaultToVaultData(graphVault: GraphVault): VaultData {
  const inputToken: Token = {
    symbol: graphVault.assetSymbol,
    decimals: graphVault.assetDecimals,
    address: graphVault.asset,
    imgURL: graphVault.assetImgURL || "/USDC.png",
    price: graphVault.assetPrice ? parseFloat(graphVault.assetPrice) : 1,
    balance: EMPTY_BALANCE,
    isNative: false
  };

  return {
    id: graphVault.id,
    name: graphVault.name,
    type: graphVault.type || "Vault",
    symbol: graphVault.symbol,
    des: graphVault.description,
    imgURL: graphVault.imgURL,
    depositFeePaidFromGasTank: graphVault.depositFeePaidFromGasTank,
    inputToken,
    strategyNetwork: graphVault.strategyNetwork,
    protocolPoints: graphVault.protocolPoints,
    protocolPointsDescription: graphVault.protocolPointsDescription,
    cooldownPeriod: graphVault.cooldownPeriod,
    protocol: {
      name: graphVault.protocolName || "Unknown",
      strategyAddress: graphVault.strategy || graphVault.id,
      rewardsContractAddress: graphVault.rewardsContractAddress,
      network: graphVault.strategyNetwork || "Unknown",
      chainId: graphVault.strategyChainId || 0,
      netdes: graphVault.networkDescription,
      imgURL: graphVault.protocolImgURL || "/default-protocol.png",
      des: graphVault.protocolDescription
    }
  };
}

export function convertGraphVaultToAPY(graphVault: GraphVault): VaultAPY {
  return {
    vaultId: graphVault.id,
    APY7d: graphVault.apy7d ? parseFloat(graphVault.apy7d) : 0,
    apy30d: graphVault.apy30d ? parseFloat(graphVault.apy30d) : undefined
  };
}

export function convertGraphVaultToTotalAssets(graphVault: GraphVault): VaultTotalAssets {

  const formattedTVL = convertStringToBalance(
    graphVault.tvl,
    graphVault.assetDecimals,
    graphVault.assetPrice ? parseFloat(graphVault.assetPrice) : 1
  ).formatted;

  return {
    vaultId: graphVault.id,
    totalAssets: formattedTVL
  };
}

export function convertGraphUserPositionToBalance(
  userPosition: GraphUserPosition
): UserVaultBalance {

  const formattedBalance = convertStringToBalance(
    userPosition.assetsBalance,
    userPosition.vault.assetDecimals
  ).formatted;

  return {
    vaultId: userPosition.vault.id,
    balance: formattedBalance
  };
}

export function convertStringToBalance(
  amountString: string | null | undefined,
  decimals: number,
  price: number = 1
): Balance {
  // Handle null/undefined/empty string cases
  if (!amountString || amountString === '0' || amountString === '') {
    return EMPTY_BALANCE;
  }

  try {
    const value = BigInt(amountString);
    const formatted = formatUnits(value, decimals);
    const formattedUSD = (parseFloat(formatted) * price).toFixed(2);

    return {
      value,
      formatted,
      formattedUSD: `$${formattedUSD}`
    };
  } catch (error) {
    console.error('Error converting string to balance:', { amountString, decimals, price, error });
    return EMPTY_BALANCE;
  }
}

export function formatTimestamp(timestamp: string): string {

  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}
