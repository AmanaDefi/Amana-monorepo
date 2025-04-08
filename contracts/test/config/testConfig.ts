import { ethers } from "hardhat";
import {
  ZC_USDT_BSC_ADDRESS,
  ZC_ETH_ETH_ADDRESS,
  ZC_BNB_BSC_ADDRESS,
  ZC_USDT_POL_ADDRESS,
  ZC_POL_POL_ADDRESS
} from "../../../constants";

// Configuration for the vault being tested
export const vaultConfig = {
  name: "AaveV3EthVault",
  symbol: "AVU",
  asset: ZC_USDT_POL_ADDRESS,
  feeRate: 1000,
  gasLimitWithdrawAndCall: 300_000,
  gasLimitCall: 300_000,
};

// Configuration for the strategy used by the vault
export const strategyConfig = {
  address: "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE", // not really significant
  chainId: 137,
  gasToken: ZC_POL_POL_ADDRESS,
};

// Configuration for the originating chain of the cross-chain tx
export const txConfig = {
  originChainId: 1,
  originGasToken: ZC_ETH_ETH_ADDRESS,
  originERC20Input: ethers.constants.AddressZero,
  originZRC20Input: ZC_ETH_ETH_ADDRESS,
};
