import { ethers } from "hardhat";
import {
  ZC_USDC_BASE_ADDRESS,
  ZC_POL_POL_ADDRESS,
  ZC_ETH_ETH_ADDRESS,
  ZC_USDC_ETH_ADDRESS,
  ZC_ETH_BASE_ADDRESS,
  ZC_ETH_ARB_ADDRESS,
  ZC_USDC_ARB_ADDRESS,
  ZC_USDC_POL_ADDRESS,
  ZC_SOL_SOL_ADDRESS,
  ZC_USDC_SOL_ADDRESS,
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
      depositSwapData: "0x8344d6f84d26f998fa070bbea6d2e15e359e26410cbe0df132a6c6b4a2974fa1b7fb953cf0cc798a0327f0660525b15cdb8f1f5fbf0dd7cd5ba182ad",
      withdrawSwapData: "0x",
      originChainId: 900,
      originGasToken: ZC_SOL_SOL_ADDRESS,
      originERC20Input: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // user deposits on origin chain using this
      originNonEvmUserAddress: "0x62ca5055fd4bd065301d278209c2cf6bd7750fc4aa7c1fdabe186d71cca91963",
      originZRC20Input: ZC_USDC_SOL_ADDRESS, // zrc20 equivalent of the asset on origin chain - if you change this, watch decimals below

      otherZRC20Input: ZC_USDC_POL_ADDRESS,

      crossChainDepositAmount1: ethers.utils.parseUnits("10", 6),
      crossChainDepositAmount2: ethers.utils.parseUnits("5", 6),
      slippage: 500,

      gasTankAmount: ethers.utils.parseUnits("100", 18),
      directDepositAmount1: ethers.utils.parseUnits("10", 6),
      minSharesOut1: 0,
      directDepositAmount2: ethers.utils.parseUnits("50", 6),
      minSharesOut2: 0,
      directDepositAmount3: ethers.utils.parseUnits("1", 18), // used for ZETA deposit test
      minSharesOut3: 0,
    },
  },
];
