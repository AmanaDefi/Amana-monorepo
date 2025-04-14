// test/strategy.config.ts
import { ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../../constants";

export interface StrategyTestConfig {
  name: string;
  strategyContractName: string;
  receiptTokenContractName: string;
  swapHelperContractName: string;
  rewardsContractName?: string;
  forkBlock: number;
  rpcUrl: string;
  inputTokenAddress: string;
  receiptTokenAddress: string;
  rewardsContractAddress?: string;
  rewardsTokenAddress?: string;
  originChainId: number;
  withdrawZRC20?: string;
}

export const strategyConfigs: StrategyTestConfig[] = [
  {
    name: "Compound USDT Strategy",
    strategyContractName: "ERC20_Compound_Strategy",
    receiptTokenContractName: "ICompoundVault",
    swapHelperContractName: "SwapHelperPolygon",
    rewardsContractName: "ICometRewards",
    forkBlock: 70004444,
    rpcUrl: "https://137.rpc.thirdweb.com/4e74a8cc63319adbdf4ca0f672467a7c",
    inputTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    receiptTokenAddress: "0xaeB318360f27748Acb200CE616E389A6C9409a07",
    rewardsContractAddress: "0x45939657d1CA34A8FA39A924B71D28Fe8431e581",
    rewardsTokenAddress: "0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c",
    originChainId: 8453,
    withdrawZRC20: ZC_TEST_ETH_SEPOLIA_ADDRESS,
  }
];
