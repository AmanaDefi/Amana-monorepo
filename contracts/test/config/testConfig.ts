import { ethers } from "hardhat";
import {
  ZC_USDT_BSC_ADDRESS,
  ZC_ETH_ETH_ADDRESS,
  ZC_BNB_BSC_ADDRESS,
  ZC_USDT_POL_ADDRESS,
  ZC_POL_POL_ADDRESS,
  ZC_USDC_BASE_ADDRESS,
  ZC_ETH_BASE_ADDRESS
} from "../../../constants";
import { BigNumber } from "ethers";

// Configuration for the vault being tested
export const vaultConfig = {
  name: "AaveV3EthVault",
  symbol: "AVU",
  asset: ZC_USDC_BASE_ADDRESS, // must match strategy chain
  feeRate: 1000,
  gasLimitWithdrawAndCall: 500_000,
  gasLimitCall: 500_000,
};

// Configuration for the strategy used by the vault
export const strategyConfig = {
  address: "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE", // not really significant
  chainId: 8453,
  gasToken: ZC_ETH_BASE_ADDRESS,
};

// Configuration for the originating chain of the cross-chain tx
export const txConfig = {
  gasTankAmount: ethers.utils.parseUnits("100", 18),
  depositAmount1: ethers.utils.parseUnits("100", 6),
  minSharesOut1: 0,
  depositAmount2: ethers.utils.parseUnits("50", 6),
  minSharesOut2: 0,
  depositAmount3: ethers.utils.parseUnits("1", 6),
  minSharesOut3: 0,
  rewardAmount: BigNumber.from(1000), // Example reward amount
  originChainId: 1,
  originGasToken: ZC_ETH_ETH_ADDRESS,
  originERC20Input: ethers.constants.AddressZero,
  originZRC20Input: ZC_ETH_ETH_ADDRESS,
};
