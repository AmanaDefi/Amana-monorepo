// test/strategy.config.ts
import { BASE_USDT_ADDRESS, ZC_USDC_POL_ADDRESS, ZC_USDC_BASE_ADDRESS, ZC_ETH_BASE_ADDRESS, ETH_USDC_ADDRESS, POL_USDC_ADDRESS, ARB_USDC_ADDRESS, ARB_CRV_ADDRESS, ARB_USDT_ADDRESS } from "../../../constants";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

export interface StrategyTestConfig {
  name: string;
  gatewayAddress: string;
  strategyContractName: string;
  strategyChainId: number;
  receiptTokenContractName: string;
  swapHelperContractName: string;
  rewardsContractName?: string;
  forkBlock: number;
  inputTokenAddress: string;
  inputTokenStorageSlot: number;
  inputTokenIndexOrPlaceholder: number;
  receiptTokenAddress: string;
  rewardsContractAddress?: string;
  rewardsTokenAddress?: string;
  originChainId: number;
  withdrawZRC20?: string;
  otherErc20Address: string;
  otherErc20BalanceStorageSlot: number;
  isNative: boolean;
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
  // {
  //   name: "Compound USDT Strategy",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
  //   strategyContractName: "ERC20_Compound_Strategy",
  //   strategyChainId: 137,
  //   receiptTokenContractName: "ICompoundVault",
  //   swapHelperContractName: "SwapHelperPolygon",
  //   rewardsContractName: "ICometRewards",
  //   forkBlock: 71580000,
  //   inputTokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  //   inputTokenStorageSlot: 0,
  //   inputTokenIndexOrPlaceholder: 0,
  //   receiptTokenAddress: "0xaeB318360f27748Acb200CE616E389A6C9409a07",
  //   rewardsContractAddress: "0x45939657d1CA34A8FA39A924B71D28Fe8431e581",
  //   rewardsTokenAddress: "0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c",
  //   originChainId: 8453,
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS,
  //   otherErc20Address: POL_USDC_ADDRESS,
  //   otherErc20BalanceStorageSlot: 0,
  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("1000", 6),
  //   minSharesOut: ethers.utils.parseUnits("900", 6),
  //   withdrawAmount: ethers.utils.parseUnits("1000", 6),
  //   minAmountOut: ethers.utils.parseUnits("900", 6),
  //   slippage: 10000
  // },
  // {
  //   name: "Fluid Strategy",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
  //   strategyContractName: "FluidErc20Strategy",
  //   strategyChainId: 8453,
  //   receiptTokenContractName: "I4626Vault",
  //   swapHelperContractName: "SwapHelperOnBase",
  //   rewardsContractName: "ICometRewards",
  //   forkBlock: 30958515,
  //   inputTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  //   inputTokenStorageSlot: 9,
  //   inputTokenIndexOrPlaceholder: 0,
  //   receiptTokenAddress: "0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169",
  //   rewardsContractAddress: ethers.constants.AddressZero, // Fluid strategy does not have a rewards contract
  //   rewardsTokenAddress: ethers.constants.AddressZero, // Fluid strategy does not have a rewards token
  //   originChainId: 137,
  //   withdrawZRC20: ZC_USDC_POL_ADDRESS,
  //   otherErc20Address: BASE_USDT_ADDRESS,
  //   otherErc20BalanceStorageSlot: 0,
  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("1000", 6),
  //   minSharesOut: ethers.utils.parseUnits("900", 6),
  //   withdrawAmount: ethers.utils.parseUnits("1000", 6),
  //   minAmountOut: ethers.utils.parseUnits("900", 6),
  //   slippage: 10000
  // },
  // {
  //   name: "Convex ETH Strategy",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
  //   strategyContractName: "ConvexEthStrategy",
  //   strategyChainId: 1,
  //   receiptTokenContractName: "ICurvePoolFixed",
  //   swapHelperContractName: "SwapHelperEthereum",
  //   rewardsContractName: "IConvexRewardPool",
  //   forkBlock: 22671910,
  //   inputTokenAddress: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  //   inputTokenStorageSlot: 0,
  //   inputTokenIndexOrPlaceholder: 1,
  //   receiptTokenAddress: "0xa4c567c662349BeC3D0fB94C4e7f85bA95E208e4",
  //   rewardsContractAddress: "0x442E773FFB0043551417D5A37E10c17990fB075c",
  //   rewardsTokenAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  //   originChainId: 8453,
  //   withdrawZRC20: ZC_ETH_BASE_ADDRESS,
  //   otherErc20Address: ETH_USDC_ADDRESS,
  //   otherErc20BalanceStorageSlot: 9,
  //   isNative: true,
  //   depositAmount: ethers.utils.parseUnits("1", 18),
  //   minSharesOut: ethers.utils.parseUnits("0.9", 18),
  //   withdrawAmount: ethers.utils.parseUnits("1", 18),
  //   minAmountOut: ethers.utils.parseUnits("0.9", 18),
  //   slippage: 10000,
  //   convexBooster: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
  //   cvxTokenAddress: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
  //   convexPoolId: 217
  // },
  // {
  //   name: "Convex eUSDUSDC Strategy - Ethereum",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
  //   strategyContractName: "ConvexERC20Strategy",
  //   strategyChainId: 1,
  //   receiptTokenContractName: "ICurvePoolFixed",
  //   swapHelperContractName: "SwapHelperEthereum",
  //   rewardsContractName: "IConvexRewardPool",
  //   forkBlock: 22530874,
  //   inputTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //   inputTokenStorageSlot: 9,
  //   inputTokenIndexOrPlaceholder: 1,
  //   receiptTokenAddress: "0x08BfA22bB3e024CDfEB3eca53c0cb93bF59c4147",
  //   rewardsContractAddress: "0xdD2642EBD57A6e8BF9644040Ef15A39Ad568feC9", // update 
  //   rewardsTokenAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52", // crv 
  //   originChainId: 8453,
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS,
  //   otherErc20Address: ETH_USDC_ADDRESS,
  //   otherErc20BalanceStorageSlot: 9,
  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("100", 6),
  //   minSharesOut: ethers.utils.parseUnits("90", 6),
  //   withdrawAmount: ethers.utils.parseUnits("100", 6),
  //   minAmountOut: ethers.utils.parseUnits("90", 6),
  //   slippage: 10000,
  //   convexBooster: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
  //   cvxTokenAddress: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b", // update
  //   convexPoolId: 369 // use hardhat task to find this
  // },
  // {
  //   name: "Convex eUSDUSDC Strategy - Arbitrum",
  //   gatewayAddress: "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549",
  //   strategyContractName: "ConvexERC20StrategyArbitrum",
  //   strategyChainId: 42161,
  //   receiptTokenContractName: "ICurvePoolFixed",
  //   swapHelperContractName: "SwapHelperArbitrum",
  //   rewardsContractName: "IConvexRewardPoolArbitrum",
  //   forkBlock: 329133267,
  //   inputTokenAddress: ARB_USDC_ADDRESS,
  //   inputTokenStorageSlot: 9,
  //   inputTokenIndexOrPlaceholder: 1,
  //   receiptTokenAddress: "0x93a416206B4ae3204cFE539edfeE6BC05a62963e",
  //   rewardsContractAddress: "0xD4f9bCc2e0e920e23763FA8e37eCbC4135959dB4",
  //   rewardsTokenAddress: ARB_CRV_ADDRESS, // crv
  //   originChainId: 8453,
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS,
  //   otherErc20Address: ARB_USDC_ADDRESS,
  //   otherErc20BalanceStorageSlot: 9,
  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("1000", 6),
  //   minSharesOut: ethers.utils.parseUnits("900", 6),
  //   withdrawAmount: ethers.utils.parseUnits("1000", 6),
  //   minAmountOut: ethers.utils.parseUnits("900", 6),
  //   slippage: 10000,
  //   convexBooster: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
  //   cvxTokenAddress: ethers.constants.AddressZero, // There is no cvx token on Arbitrum, but sometimes ethereum CVX is used
  //   convexPoolId: 36 // use hardhat task to find this, or look on convex website
  // },
  {
    name: "Convex eth Strategy - Arbitrum",
    gatewayAddress: "0x1C53e188Bc2E471f9D4A4762CFf843d32C2C8549",
    strategyContractName: "ConvexEthStrategyArbitrum",
    strategyChainId: 42161,
    receiptTokenContractName: "ICurvePoolFixed",
    swapHelperContractName: "SwapHelperArbitrum",
    rewardsContractName: "IConvexRewardPoolArbitrum",
    forkBlock: 329133267,
    inputTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // Native ETH or put WETH here?
    inputTokenStorageSlot: 9, // or 0?
    inputTokenIndexOrPlaceholder: 2,
    receiptTokenAddress: "0xF7Fed8Ae0c5B78c19Aadd68b700696933B0Cefd9",
    rewardsContractAddress: "0xaCb744c7e7C95586DB83Eda3209e6483Fb1FCbA4",
    rewardsTokenAddress: ARB_CRV_ADDRESS, // crv
    originChainId: 8453,
    withdrawZRC20: ZC_USDC_BASE_ADDRESS,
    otherErc20Address: ARB_USDC_ADDRESS,
    otherErc20BalanceStorageSlot: 9,
    isNative: true,
    depositAmount: ethers.utils.parseUnits("1", 18),
    minSharesOut: ethers.utils.parseUnits("0.9", 18),
    withdrawAmount: ethers.utils.parseUnits("1", 18),
    minAmountOut: ethers.utils.parseUnits("0.9", 18),
    slippage: 500,
    convexBooster: "0xf403c135812408bfbe8713b5a23a04b3d48aae31",
    cvxTokenAddress: ethers.constants.AddressZero, // There is no cvx token on Arbitrum, but sometimes ethereum CVX is used
    convexPoolId: 15 // use hardhat task to find this, or look on convex website
  },
  // {
  //   name: "Convex USDTUSDe Strategy - Ethereum",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
  //   strategyContractName: "ConvexERC20Strategy",
  //   strategyChainId: 1,
  //   receiptTokenContractName: "ICurvePoolFixed",
  //   swapHelperContractName: "SwapHelperEthereum",
  //   rewardsContractName: "IConvexRewardPool",
  //   forkBlock: 22315281,
  //   inputTokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  //   inputTokenStorageSlot: 0,
  //   inputTokenIndexOrPlaceholder: 0,
  //   receiptTokenAddress: "0x5B03CcCAb7BA3010fA5CAd23746cbf0794938e96",
  //   rewardsContractAddress: "0x60eF3c53c86E1eCEc76d900B6cf2f0B39ffD98B2",
  //   rewardsTokenAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52", // crv 
  //   originChainId: 8453,
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS,
  //   otherErc20Address: ETH_USDC_ADDRESS,
  //   otherErc20BalanceStorageSlot: 9,
  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("100", 6),
  //   minSharesOut: ethers.utils.parseUnits("90", 6),
  //   withdrawAmount: ethers.utils.parseUnits("100", 6),
  //   minAmountOut: ethers.utils.parseUnits("90", 6),
  //   slippage: 10000,
  //   convexBooster: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
  //   cvxTokenAddress: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
  //   convexPoolId: 437 // find on convex website
  // },
  // {
  //   name: "Balancer USDC Strategy",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Replace with actual gateway address
  //   strategyContractName: "BalancerERC20Strategy",
  //   strategyChainId: 8453, // Base
  //   receiptTokenContractName: "IERC20", // LP token is a plain ERC20
  //   swapHelperContractName: "SwapHelperOnBase",
  //   rewardsContractName: "IBalancerLiquidityGauge",
  //   forkBlock: 31433507, // Set your fork block

  //   inputTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
  //   inputTokenStorageSlot: 9, // Update if needed for forking balance injection
  //   inputTokenIndexOrPlaceholder: 1,

  //   receiptTokenAddress: "0xb6a9a815d98cb98fd9f2353ec59de07b63f5b485", // Balancer LP token
  //   rewardsContractAddress: "0x50355F3Bb70317E518905664CE09333FA8b90645", // LiquidityGauge
  //   rewardsTokenAddress: "0x994ac01750047B9d35431a7Ae4Ed312ee955E030", // axlOP - not actually needed in strategy, but useful here in the test

  //   originChainId: 8453, // Base
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS, // Replace with actual ZRC20 constant
  //   otherErc20Address: BASE_USDT_ADDRESS, // For cross-chain withdrawal test - must be a token on the strategy chain
  //   otherErc20BalanceStorageSlot: 0, // Only if needed for balance impersonation

  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("1000", 6),
  //   minSharesOut: ethers.utils.parseUnits("900", 6),
  //   withdrawAmount: ethers.utils.parseUnits("1000", 6),
  //   minAmountOut: ethers.utils.parseUnits("900", 6),
  //   slippage: 10000,
  // },
  // {
  //   name: "Aegis YUSD Strategy",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed", // Replace with actual gateway address
  //   strategyContractName: "AegisERC20Strategy",
  //   strategyChainId: 56, // BNB
  //   receiptTokenContractName: "IERC20", // LP token is a plain ERC20
  //   swapHelperContractName: "SwapHelperBnb",
  //   rewardsContractName: "IBalancerLiquidityGauge",
  //   forkBlock: 50813513, // Set your fork block

  //   inputTokenAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC on BNB
  //   inputTokenStorageSlot: 0, // Update if needed for forking balance injection
  //   inputTokenIndexOrPlaceholder: 1,

  //   receiptTokenAddress: "0xAB3dBcD9B096C3fF76275038bf58eAC10D22C61f", // Balancer LP token
  //   rewardsContractAddress: "0x50355F3Bb70317E518905664CE09333FA8b90645", // LiquidityGauge
  //   rewardsTokenAddress: "0x994ac01750047B9d35431a7Ae4Ed312ee955E030", // axlOP - not actually needed in strategy, but useful here in the test

  //   originChainId: 8453, // Base
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS, // Replace with actual ZRC20 constant
  //   otherErc20Address: BASE_USDT_ADDRESS, // For cross-chain withdrawal test - must be a token on the strategy chain
  //   otherErc20BalanceStorageSlot: 0, // Only if needed for balance impersonation

  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("1000", 18),
  //   minSharesOut: ethers.utils.parseUnits("900", 18),
  //   withdrawAmount: ethers.utils.parseUnits("100", 18),
  //   minAmountOut: ethers.utils.parseUnits("90", 18),
  //   slippage: 10000,
  // },
  // {
  //   name: "Aave USDT Strategy",
  //   gatewayAddress: "0x48B9AACC350b20147001f88821d31731Ba4C30ed",
  //   strategyContractName: "AaveERC20Strategy",
  //   strategyChainId: 56, // Base
  //   receiptTokenContractName: "IERC20", // LP token is a plain ERC20
  //   swapHelperContractName: "SwapHelperBnb",
  //   rewardsContractName: "IBalancerLiquidityGauge",
  //   forkBlock: 51095333, // Set your fork block

  //   inputTokenAddress: "0x55d398326f99059fF775485246999027B3197955", // USDC on Base
  //   inputTokenStorageSlot: 9, // Update if needed for forking balance injection
  //   inputTokenIndexOrPlaceholder: 1,

  //   receiptTokenAddress: "0xa9251ca9DE909CB71783723713B21E4233fbf1B1", // Balancer LP token
  //   rewardsContractAddress: ethers.constants.AddressZero, // LiquidityGauge
  //   rewardsTokenAddress: ethers.constants.AddressZero, // axlOP - not actually needed in strategy, but useful here in the test

  //   originChainId: 8453, // Base
  //   withdrawZRC20: ZC_USDC_BASE_ADDRESS, // Replace with actual ZRC20 constant
  //   otherErc20Address: BSC_USDC_ADDRESS, // For cross-chain withdrawal test - must be a token on the strategy chain
  //   otherErc20BalanceStorageSlot: 0, // Only if needed for balance impersonation

  //   isNative: false,
  //   depositAmount: ethers.utils.parseUnits("10000", 6),
  //   minSharesOut: ethers.utils.parseUnits("9000", 6),
  //   withdrawAmount: ethers.utils.parseUnits("1000", 6),
  //   minAmountOut: ethers.utils.parseUnits("900", 6),
  //   slippage: 10000,
  // },
];
