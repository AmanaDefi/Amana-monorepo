// test/intelligent/setupIntelligentStrategyTest.ts

import { ethers, network, upgrades } from "hardhat";
import { IntelligentStrategyTestConfig } from "../config/intelligentStrategy.config";
import { IERC20 } from "../../typechain";

export interface IntelligentStrategyTestContext {
  owner: any;
  gatewaySigner: any;
  strategy: any;
  inputToken: IERC20;
  module: any;
  config: IntelligentStrategyTestConfig;
}

export async function deployIntelligentStrategyFixture(
  config: IntelligentStrategyTestConfig
): Promise<IntelligentStrategyTestContext> {
  const rpcUrl = `https://${config.strategyChainId}.rpc.thirdweb.com/4e74a8cc63319adbdf4ca0f672467a7c`;
  await network.provider.request({
    method: "hardhat_reset",
    params: [{ forking: { jsonRpcUrl: rpcUrl, blockNumber: config.forkBlock } }]
  });

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [config.gatewayAddress]
  });

  const [owner] = await ethers.getSigners();
  const gatewaySigner = await ethers.getSigner(config.gatewayAddress);

  const inputToken = await ethers.getContractAt("IERC20", config.inputTokenAddress, gatewaySigner);

  const ModuleFactory = await ethers.getContractFactory(config.moduleContractName);
  const module = await upgrades.deployProxy(ModuleFactory, config.moduleParams, {
    initializer: "initialize",
    kind: "uups"
  });
  await module.deployed();

  const StrategyFactory = await ethers.getContractFactory("ERC20IntelligentStrategy");
  const strategy = await upgrades.deployProxy(StrategyFactory, {
    initializer: "initialize"
  });
  await strategy.deployed();

  return { owner, gatewaySigner, strategy, inputToken, module, config };
}
