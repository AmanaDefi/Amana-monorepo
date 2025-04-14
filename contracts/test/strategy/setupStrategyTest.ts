// test/helpers/setupStrategyTest.ts
import { ethers, network } from "hardhat";
import { Signer } from "ethers";
import { StrategyTestConfig } from "../config/strategy.config";
import { IERC20 } from "../../typechain";
import { GATEWAY_ADDRESS, WITHDRAW_HELPER_ADDRESS } from "../config/constants";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

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

export async function deployStrategyFixture(config: StrategyTestConfig): Promise<StrategyTestContext> {
  const {
    rpcUrl,
    forkBlock,
    inputTokenAddress,
    receiptTokenAddress,
    rewardsContractAddress,
    amanaVaultAddress,
    strategyContractName,
    receiptTokenContractName,
    swapHelperContractName,
    rewardsContractName = "ICometRewards", //default, can be overridden in config file
  } = config;


  await network.provider.request({
    method: "hardhat_reset",
    params: [{ forking: { jsonRpcUrl: rpcUrl, blockNumber: forkBlock } }]
  });

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [GATEWAY_ADDRESS]
  });
  await network.provider.send("hardhat_setBalance", [
    GATEWAY_ADDRESS,
    ethers.utils.parseEther("10").toHexString()
  ]);

  const gatewaySigner = await ethers.getSigner(GATEWAY_ADDRESS);
  const [owner] = await ethers.getSigners();

  const inputToken = await ethers.getContractAt("IERC20", inputTokenAddress, gatewaySigner);
  const receiptTokenContract = await ethers.getContractAt(receiptTokenContractName, receiptTokenAddress, gatewaySigner);
  const rewardsContract = rewardsContractAddress
    ? await ethers.getContractAt(rewardsContractName, rewardsContractAddress, gatewaySigner)
    : undefined;

  const SwapHelperFactory = await ethers.getContractFactory(swapHelperContractName);
  const swapHelper = await SwapHelperFactory.deploy();
  await swapHelper.deployed();

  const StrategyFactory = await ethers.getContractFactory(strategyContractName);
  const strategy = await StrategyFactory.deploy(
    config.name,
    amanaVaultAddress,
    inputTokenAddress,
    receiptTokenAddress,
    GATEWAY_ADDRESS,
    WITHDRAW_HELPER_ADDRESS,
    swapHelper.address
  );
  await strategy.deployed();

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
