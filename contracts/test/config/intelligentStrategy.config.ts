// test/intelligent/intelligentStrategyConfig.ts

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

export interface ModuleConfig {
  moduleContractName: string;
  moduleParams: any[];
}

export interface IntelligentStrategyTestConfig {
  name: string;
  forkBlock: number;
  strategyChainId: number;
  gatewayAddress: string;
  inputTokenAddress: string;
  inputTokenStorageSlot: number;
  receiptTokenAddress: string;
  moduleConfigs: ModuleConfig[]; // ⬅️ NEW
  depositAmount: BigNumber;
  withdrawAmount: BigNumber;
  minSharesOut: BigNumber;
  minAmountOut: BigNumber;
  isNative: boolean;
}

export const intelligentStrategyConfigs: IntelligentStrategyTestConfig[] = [
  {
    name: "Fluid + Compound USDC Strategy",
    forkBlock: 33196229,
    strategyChainId: 8453,
    gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
    inputTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    inputTokenStorageSlot: 9,
    receiptTokenAddress: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169", // irrelevant for intelligent strategy
    moduleConfigs: [
      {
        moduleContractName: "FluidStrategyModule",
        moduleParams: [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // inputToken
          "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169"  // Fluid vault
        ]
      },
      {
        moduleContractName: "CompoundStrategyModule",
        moduleParams: [
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // inputToken
          "0xb125E6687d4313864e53df431d5425969c15Eb2F", // receiptToken
          "0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1", // rewards contract
          "0x9e1028F5F1D5eDE59748FFceE5532509976840E0"  // COMP token
        ]
      }
    ],
    depositAmount: ethers.utils.parseUnits("1000", 6),
    withdrawAmount: ethers.utils.parseUnits("1000", 6),
    minSharesOut: ethers.utils.parseUnits("990", 6),
    minAmountOut: ethers.utils.parseUnits("990", 6),
    isNative: false
  }
];
