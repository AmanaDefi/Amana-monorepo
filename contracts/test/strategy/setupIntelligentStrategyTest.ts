// test/intelligent/setupIntelligentStrategyTest.ts

import { ethers, network, upgrades } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { IntelligentStrategyTestConfig } from "../config/intelligentStrategy.config";
import { IERC20 } from "../../typechain";
import { AMANA_VAULT_ADDRESS, WITHDRAW_HELPER_ADDRESS } from "../config/constants";
import { setTokenBalance } from "../utils";

export interface IntelligentStrategyTestContext {
  owner: Signer;
  gatewaySigner: Signer;
  strategy: any;
  inputToken: IERC20;
  moduleContracts: any[]; // deployed modules
  config: IntelligentStrategyTestConfig;
}

export async function deployIntelligentStrategyFixture(config: IntelligentStrategyTestConfig): Promise<IntelligentStrategyTestContext> {
  const {
    forkBlock,
    strategyChainId,
    gatewayAddress,
    inputTokenAddress,
    inputTokenStorageSlot,
    moduleConfigs
  } = config;

  const rpcUrl = `https://${strategyChainId}.rpc.thirdweb.com/4e74a8cc63319adbdf4ca0f672467a7c`;
  await network.provider.request({
    method: "hardhat_reset",
    params: [{ forking: { jsonRpcUrl: rpcUrl, blockNumber: forkBlock } }]
  });

  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [gatewayAddress]
  });
  await network.provider.send("hardhat_setBalance", [gatewayAddress, ethers.utils.parseEther("1000").toHexString()]);

  const gatewaySigner = await ethers.getSigner(gatewayAddress);
  const [owner] = await ethers.getSigners();
  const inputToken = await ethers.getContractAt("IERC20", inputTokenAddress, gatewaySigner);

  // 🔁 Deploy modules dynamically
  const moduleContracts = [];
  for (const moduleConfig of moduleConfigs) {
    const ModuleFactory = await ethers.getContractFactory(moduleConfig.moduleContractName);
    const module = await upgrades.deployProxy(ModuleFactory, moduleConfig.moduleParams, {
      initializer: "initialize",
      kind: "uups"
    });
    await module.deployed();
    moduleContracts.push(module);
    console.log(`✅ Deployed ${moduleConfig.moduleContractName} at ${module.address}`);
  }

  // 🚀 Deploy the intelligent strategy
  const StrategyFactory = await ethers.getContractFactory("ERC20IntelligentStrategy");
  const strategy = await upgrades.deployProxy(
    StrategyFactory,
    [
      config.name,
      config.gatewayAddress,
      AMANA_VAULT_ADDRESS,
      WITHDRAW_HELPER_ADDRESS,
      config.inputTokenAddress,
      config.receiptTokenAddress
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );
  await strategy.deployed();

  // 🔄 Transfer ownership of modules to strategy
  for (const module of moduleContracts) {
    await module.connect(owner).transferOwnership(strategy.address);
  }

  return {
    owner,
    gatewaySigner,
    strategy,
    inputToken,
    moduleContracts,
    config
  };
}
