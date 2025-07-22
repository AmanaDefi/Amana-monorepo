// test/intelligent/intelligentStrategyConfig.ts

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

export interface IntelligentStrategyTestConfig {
  name: string;
  forkBlock: number;
  strategyChainId: number;
  gatewayAddress: string;
  inputTokenAddress: string;
  inputTokenStorageSlot: number;
  receiptTokenAddress: string;
  moduleContractName: string;
  moduleParams: any[];
  depositAmount: BigNumber;
  withdrawAmount: BigNumber;
  minSharesOut: BigNumber;
  minAmountOut: BigNumber;
  isNative: boolean;
}

export const intelligentStrategyConfigs: IntelligentStrategyTestConfig[] = [
  {
    name: "Fluid USDC Strategy",
    forkBlock: 14450000,
    strategyChainId: 8453, // Base
    gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
    inputTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    inputTokenStorageSlot: 9,
    receiptTokenAddress: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169", // Fluid pool vault
    moduleContractName: "FluidStrategyModule",
    moduleParams: [
      "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // inputToken
      "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169"  // Fluid vault
    ],
    depositAmount: ethers.utils.parseUnits("1000", 6),
    withdrawAmount: ethers.utils.parseUnits("1000", 6),
    minSharesOut: ethers.utils.parseUnits("990", 6),
    minAmountOut: ethers.utils.parseUnits("990", 6),
    isNative: false
  }
];
