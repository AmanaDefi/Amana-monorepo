// test/helpers/setupStrategyTest.ts
import { ethers, network, upgrades } from "hardhat";
import { Signer } from "ethers";
import { StrategyTestConfig } from "../config/strategy.config";
import { IERC20 } from "../../typechain";
import { WITHDRAW_HELPER_ADDRESS, AMANA_VAULT_ADDRESS } from "../config/constants";
import {
  PYTH_CONTRACT_ADDRESS_ETHEREUM,
  PYTH_CONTRACT_ADDRESS_BASE,
  PYTH_CONTRACT_ADDRESS_ZETACHAIN,
  PYTH_CONTRACT_ADDRESS_POLYGON,
  PYTH_CONTRACT_ADDRESS_ARBITRUM
} from "../../../constants";
import { isBalancerStrategy, isConvexStrategy } from "../utils";

export interface StrategyTestContext {
  owner: Signer;
  gatewaySigner: Signer;
  inputToken: IERC20;
  receiptTokenContract: any;
  rewardsTokenAddress?: string;
  rewardsContract?: any;
  swapHelper: any;
  strategy: any;
  config: StrategyTestConfig;
}

function getRpcUrl(chainId: number): string {
  return `https://${chainId}.rpc.thirdweb.com/4e74a8cc63319adbdf4ca0f672467a7c`;
}

function getPythContractAddress(chainId: number): string {
  switch (chainId) {
    case 1:
      return PYTH_CONTRACT_ADDRESS_ETHEREUM;
    case 137:
      return PYTH_CONTRACT_ADDRESS_POLYGON;
    case 7000:
      return PYTH_CONTRACT_ADDRESS_ZETACHAIN;
    case 8453:
      return PYTH_CONTRACT_ADDRESS_BASE;
    case 42161:
      return PYTH_CONTRACT_ADDRESS_ARBITRUM;
    default:
      throw new Error(`Unsupported chainId: ${chainId}`);
  }
}

export async function deployStrategyFixture(config: StrategyTestConfig): Promise<StrategyTestContext> {
  const {
    forkBlock,
    inputTokenAddress,
    receiptTokenAddress,
    rewardsContractAddress,
    rewardsTokenAddress,
    inputTokenIndexOrPlaceholder,
    strategyContractName,
    receiptTokenContractName,
    swapHelperContractName,
    rewardsContractName = "ICometRewards", //default, can be overridden in config file
    strategyChainId,
    convexBooster,
    cvxTokenAddress,
    convexPoolId
  } = config;

  const rpcUrl = getRpcUrl(strategyChainId);
  console.info(`Forking from ${rpcUrl} at block ${forkBlock}`);
  const pythAddress = getPythContractAddress(strategyChainId);

  await network.provider.request({
    method: "hardhat_reset",
    params: [{ forking: { jsonRpcUrl: rpcUrl, blockNumber: forkBlock } }]
  });

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [config.gatewayAddress]
  });

  // Fund the config.gatewayAddress with some ETH for gas
  const fundAmount = ethers.utils.parseEther("1234");
  await network.provider.request({
    method: "hardhat_setBalance",
    params: [config.gatewayAddress, fundAmount.toHexString()]
  });

  const gatewaySigner = await ethers.getSigner(config.gatewayAddress);
  const [owner] = await ethers.getSigners();

  const inputToken = await ethers.getContractAt("IERC20", inputTokenAddress, gatewaySigner);
  const receiptTokenContract = await ethers.getContractAt(receiptTokenContractName, receiptTokenAddress, gatewaySigner);
  let rewardsContract;
  if (isConvexStrategy(strategyContractName)) {
    rewardsContract = rewardsContractAddress
      ? await ethers.getContractAt(rewardsContractName, rewardsContractAddress, gatewaySigner)
      : undefined;
  } else if (isBalancerStrategy(strategyContractName)) {
    rewardsContract = await ethers.getContractAt("IBalancerLiquidityGauge", rewardsContractAddress!, gatewaySigner);
  } else {
    rewardsContract = rewardsContractAddress
      ? await ethers.getContractAt(rewardsContractName, rewardsContractAddress, gatewaySigner)
      : undefined;
  }

  const PriceOracleFactory = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await PriceOracleFactory.deploy(pythAddress); // Pyth contract address on specified chain
  await priceOracle.deployed();
  console.log(`PriceOracle deployed to: ${priceOracle.address}`);
  const SwapHelperFactory = await ethers.getContractFactory(swapHelperContractName);
  const swapHelper = await upgrades.deployProxy(
    SwapHelperFactory,
    [
      priceOracle.address
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  console.log(`SwapHelperFactory deployed to: ${swapHelper.address}`);
  await swapHelper.deployed();
  console.log(`SwapHelper deployed to: ${swapHelper.address}`);
  const StrategyFactory = await ethers.getContractFactory(strategyContractName);
  const args = [
    config.name,
    config.gatewayAddress,
    AMANA_VAULT_ADDRESS,
    WITHDRAW_HELPER_ADDRESS,
    swapHelper.address,
    receiptTokenAddress,
    inputTokenAddress,
    rewardsContractAddress ?? ethers.constants.AddressZero,
    rewardsTokenAddress ?? ethers.constants.AddressZero,
    inputTokenIndexOrPlaceholder ?? 0
  ];

  if (isConvexStrategy(config.strategyContractName)) {
    if (!convexBooster || !cvxTokenAddress || !convexPoolId) {
      throw new Error("Convex parameters are required for ConvexEthStrategy");
    }
    args.push(convexPoolId, convexBooster, cvxTokenAddress);
  }
  console.log(`Deploying strategy with args: ${args}`);
  let strategy;
  try {
    strategy = await upgrades.deployProxy(StrategyFactory, args, {
      initializer: "initialize"
    });
    await strategy.deployed();
  } catch (err) {
    console.error("❌ Strategy deployment failed:", err);
    throw err;
  }
  console.log(`Strategy deployed to: ${strategy.address}`);

  return {
    owner,
    gatewaySigner,
    inputToken,
    receiptTokenContract,
    rewardsContract,
    swapHelper,
    strategy,
    config
  };
}

// in test/helpers/setupStrategyTest.ts
export async function deployStrategyFromConfig(config: StrategyTestConfig, swapHelper: any): Promise<any> {
  const StrategyFactory = await ethers.getContractFactory(config.strategyContractName);

  const args = [
    config.name + " Clone", // Give it a distinguishable name
    config.gatewayAddress,
    AMANA_VAULT_ADDRESS,
    WITHDRAW_HELPER_ADDRESS,
    swapHelper.address,
    config.receiptTokenAddress,
    config.inputTokenAddress,
    config.rewardsContractAddress ?? ethers.constants.AddressZero,
    config.rewardsTokenAddress ?? ethers.constants.AddressZero,
    config.inputTokenIndexOrPlaceholder ?? 0
  ];

  if (isConvexStrategy(config.strategyContractName)) {
    if (!config.convexBooster || !config.cvxTokenAddress || !config.convexPoolId) {
      throw new Error("Convex parameters are required for ConvexEthStrategy");
    }
    args.push(config.convexPoolId, config.convexBooster, config.cvxTokenAddress);
  }

  const strategy = await upgrades.deployProxy(StrategyFactory, args, {
    initializer: "initialize"
  }); await strategy.deployed();

  return strategy;
}
