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
const AMANA_VAULT_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"; // Replace with actual AMANA vault address
const WITHDRAW_HELPER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"; // Replace with actual withdraw helper address

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
  const fundAmount = ethers.utils.parseEther("1234");
  await network.provider.request({
    method: "hardhat_setBalance",
    params: [config.gatewayAddress, fundAmount.toHexString()]
  });
  const inputToken = await ethers.getContractAt("IERC20", config.inputTokenAddress, gatewaySigner);

  const ModuleFactory = await ethers.getContractFactory(config.moduleContractName);
  const module = await upgrades.deployProxy(ModuleFactory, config.moduleParams, {
    initializer: "initialize",
    kind: "uups"
  });
  await module.deployed();

  const StrategyFactory = await ethers.getContractFactory("ERC20IntelligentStrategy");
  const strategy = await upgrades.deployProxy(StrategyFactory, [
    config.name,
    config.gatewayAddress,
    AMANA_VAULT_ADDRESS,
    WITHDRAW_HELPER_ADDRESS,
    config.inputTokenAddress,
    config.receiptTokenAddress
  ], {
    initializer: "initialize"
  });


  await strategy.deployed();

  return { owner, gatewaySigner, strategy, inputToken, module, config };
}
