// test/strategy.config.ts
import { ZC_USDC_BASE_ADDRESS, ZC_ETH_BASE_ADDRESS, ETH_USDC_ADDRESS, POL_USDC_ADDRESS } from "../../../constants";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

export interface StrategyTestConfig {
  name: string;
  strategyContractName: string;
  strategyChainId: number;
  receiptTokenContractName: string;
  swapHelperContractName: string;
  rewardsContractName?: string;
  forkBlock: number;
  inputTokenAddress: string;
  inputTokenIndexOrPlaceholder: number;
  receiptTokenAddress: string;
  rewardsContractAddress?: string;
  rewardsTokenAddress?: string;
  originChainId: number;
  withdrawZRC20?: string;
  otherErc20Address: string;
  otherErc20BalanceStorageSlot: number;
  isNative: boolean;
  stakingEnabled?: boolean;
  depositAmount: BigNumber;
  minSharesOut: BigNumber;
  withdrawAmount: BigNumber;
  minAmountOut: BigNumber;
  slippage: number;
  convexBooster?: string,
  cvxTokenAddress?: string,
  convexPoolId?: number
}

export const strategyConfigs: StrategyTestConfig[] = [
  {
    name: "Compound USDT Strategy",
    strategyContractName: "ERC20_Compound_Strategy",
    strategyChainId: 137,
    receiptTokenContractName: "ICompoundVault",
    swapHelperContractName: "SwapHelperPolygon",
    rewardsContractName: "ICometRewards",
    forkBlock: 70004444,
    inputTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    inputTokenIndexOrPlaceholder: 0,
    receiptTokenAddress: "0xaeB318360f27748Acb200CE616E389A6C9409a07",
    rewardsContractAddress: "0x45939657d1CA34A8FA39A924B71D28Fe8431e581",
    rewardsTokenAddress: "0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c",
    originChainId: 8453,
    withdrawZRC20: ZC_USDC_BASE_ADDRESS,
    otherErc20Address: POL_USDC_ADDRESS,
    otherErc20BalanceStorageSlot: 0,
    isNative: false,
    depositAmount: ethers.utils.parseUnits("1", 6),
    minSharesOut: ethers.utils.parseUnits("0.9", 6),
    withdrawAmount: ethers.utils.parseUnits("1", 6),
    minAmountOut: ethers.utils.parseUnits("0.9", 6),
    slippage: 10000
  },
  {
    name: "Convex ETH Strategy",
    strategyContractName: "ConvexEthStrategy",
    strategyChainId: 1,
    receiptTokenContractName: "ICurvePoolFixed",
    swapHelperContractName: "SwapHelperEthereum",
    rewardsContractName: "IConvexRewardPool",
    forkBlock: 22315281,
    inputTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    inputTokenIndexOrPlaceholder: 1,
    receiptTokenAddress: "0xa4c567c662349BeC3D0fB94C4e7f85bA95E208e4",
    rewardsContractAddress: "0x442E773FFB0043551417D5A37E10c17990fB075c",
    rewardsTokenAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    originChainId: 8453,
    withdrawZRC20: ZC_ETH_BASE_ADDRESS,
    otherErc20Address: ETH_USDC_ADDRESS,
    otherErc20BalanceStorageSlot: 9,
    isNative: true,
    stakingEnabled: true,
    depositAmount: ethers.utils.parseUnits("1", 18),
    minSharesOut: ethers.utils.parseUnits("0.9", 18),
    withdrawAmount: ethers.utils.parseUnits("1", 18),
    minAmountOut: ethers.utils.parseUnits("0.9", 18),
    slippage: 10000,
    convexBooster: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
    cvxTokenAddress: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
    convexPoolId: 217
  }
];
