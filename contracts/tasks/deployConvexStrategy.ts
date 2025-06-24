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
    cvxRewardsPool,
    crvToken,
    tokenIndex,
    convexPid,
    boosterAddress,
    cvxToken
  } = args;

  if (!name || !vault || !receiptToken || !contractName || !inputToken) {
    throw new Error("🚨 Missing required parameters.");
  }

  console.log(`🔑 Deploying with signer: ${signer.address}`);

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
      cvxRewardsPool,
      crvToken,
      tokenIndex,
      convexPid,
      boosterAddress,
      cvxToken
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

task("deploy-convex-strategy", "Deploy a UUPS upgradeable Convex strategy", main)
  .addFlag("json", "Output as JSON")
  .addParam("contract", "Contract name of the strategy to deploy")
  .addParam("name", "Human-readable strategy name")
  .addParam("gateway", "ZetaChain gateway address")
  .addParam("vault", "AmanaVault address")
  .addParam("withdrawHelper", "WithdrawHelper address")
  .addParam("swapHelper", "SwapHelper address")
  .addParam("receiptToken", "Curve/Compound receipt token address")
  .addParam("inputToken", "Input ERC20 token address")
  .addParam("cvxRewardsPool", "Convex reward pool address")
  .addParam("crvToken", "CRV token address")
  .addParam("tokenIndex", "Token index in pool")
  .addParam("convexPid", "Convex PID for booster")
  .addParam("boosterAddress", "Convex booster address")
  .addParam("cvxToken", "CVX token address");

export default {};
