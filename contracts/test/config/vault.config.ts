import { ethers } from "hardhat";
import {
  ZC_USDC_BASE_ADDRESS,
  ZC_POL_POL_ADDRESS,
  ZC_ETH_ETH_ADDRESS,
  ZC_USDC_ETH_ADDRESS,
  ZC_ETH_BASE_ADDRESS,
  ZC_ETH_ARB_ADDRESS,
  ZC_USDC_ARB_ADDRESS,
  ZC_USDC_POL_ADDRESS
} from "../../../constants";

export const vaultTestMatrix = [
  {
    name: "AaveV3EthVault",
    vaultConfig: {
      name: "AaveV3EthVault",
      symbol: "AVU",
      asset: ZC_USDC_ARB_ADDRESS, // direct deposit will use this
      feeRate: 1000,
      gasLimitWithdrawAndCall: 500_000,
      gasLimitCall: 500_000,
      rewardToken: ZC_USDC_BASE_ADDRESS,
      rewardTokenAmount: ethers.utils.parseUnits("1000", 6),
      gasPaidFromTank: true,
    },
    strategyConfig: {
      address: "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE", // arbitrary
      chainId: 42161,
      gasToken: ZC_ETH_ARB_ADDRESS,
      gasTankAmount: ethers.utils.parseUnits("10", 18),
    },
    txConfig: {
      originChainId: 1,
      originGasToken: ZC_ETH_ETH_ADDRESS,
      originERC20Input: ethers.constants.AddressZero,
      originZRC20Input: ZC_USDC_ETH_ADDRESS, // cross chain deposit will use this

      otherZRC20Input: ZC_USDC_POL_ADDRESS,


      crossChainDepositAmount1: ethers.utils.parseUnits("3", 6),
      crossChainDepositAmount2: ethers.utils.parseUnits("5", 6),
      slippage: 500,

      gasTankAmount: ethers.utils.parseUnits("100", 18),
      directDepositAmount1: ethers.utils.parseUnits("10", 6),
      minSharesOut1: 0,
      directDepositAmount2: ethers.utils.parseUnits("50", 6),
      minSharesOut2: 0,
      directDepositAmount3: ethers.utils.parseUnits("1", 6),
      minSharesOut3: 0,
    },
  },
];
