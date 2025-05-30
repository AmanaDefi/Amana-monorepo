import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const [signer] = await hre.ethers.getSigners();

  if (!signer) {
    throw new Error("Wallet not found. Please set PRIVATE_KEY in .env");
  }

  const {
    contract: contractName,
    name,
    gateway,
    vault,
    withdrawHelper,
    swapHelper,
    receiptToken,
    inputToken,
    liquidityGauge,
    tokenIndex
  } = args;

  if (!name || !vault || !receiptToken || !contractName || !inputToken || !liquidityGauge) {
    throw new Error("🚨 Missing required parameters.");
  }

  console.log(`🔑 Deploying ${contractName} with signer: ${signer.address}`);

  const StrategyFactory = await hre.ethers.getContractFactory(contractName, signer);

  const proxy = await hre.upgrades.deployProxy(
    StrategyFactory,
    [
      name,
      gateway,
      vault,
      withdrawHelper,
      swapHelper,
      receiptToken,
      inputToken,
      liquidityGauge,
      hre.ethers.constants.AddressZero, // rewards token — unused
      tokenIndex
    ],
    {
      initializer: "initialize",
      kind: "uups"
    }
  );

  await proxy.deployed();
  console.log(`✅ Proxy deployed at: ${proxy.address}`);

  const implAddress = await hre.upgrades.erc1967.getImplementationAddress(proxy.address);
  console.log(`📦 Implementation deployed at: ${implAddress}`);

  const etherscanApiKey = hre.config.etherscan.apiKey?.[network];
  if (etherscanApiKey) {
    console.log(`🔍 Verifying implementation on Etherscan...`);
    try {
      await hre.run("verify:verify", {
        address: implAddress,
        constructorArguments: []
      });
      console.log("✅ Implementation verified on Etherscan");
    } catch (err: any) {
      console.error("❌ Verification failed:", err.message);
    }
  } else {
    console.log("⚠️ No Etherscan API key for this network. Skipping verification.");
  }

  if (args.json) {
    console.log(JSON.stringify({ proxyAddress: proxy.address, implementationAddress: implAddress }));
  }
};

task("deploy-balancer-strategy", "Deploy a UUPS upgradeable Balancer strategy", main)
  .addFlag("json", "Output as JSON")
  .addParam("contract", "Contract name of the strategy to deploy")
  .addParam("name", "Human-readable strategy name")
  .addParam("gateway", "ZetaChain gateway address")
  .addParam("vault", "AmanaVault address")
  .addParam("withdrawHelper", "WithdrawHelper address")
  .addParam("swapHelper", "SwapHelper address")
  .addParam("receiptToken", "Balancer receipt token address")
  .addParam("inputToken", "Input ERC20 token address")
  .addParam("liquidityGauge", "Balancer Liquidity Gauge address")
  .addParam("tokenIndex", "Token index in pool");

export default {};
