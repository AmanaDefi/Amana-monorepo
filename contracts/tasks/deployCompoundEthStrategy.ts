import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers, upgrades } = hre;
  const network = hre.network.name;
  const [signer] = await ethers.getSigners();

  if (!signer) {
    throw new Error(
      `Wallet not found. Please set PRIVATE_KEY in an .env file or run "npx hardhat account --save".`
    );
  }

  const {
    contract,
    name,
    gateway,
    vault,
    receiptToken,
    weth,
    withdrawHelper,
    swapHelper,
    rewardsContract,
    rewardsToken
  } = args;

  if (!contract || !name || !vault || !receiptToken || !gateway || !weth || !withdrawHelper || !rewardsContract || !rewardsToken) {
    throw new Error("🚨 Missing required parameter. Check contract, name, vault, receiptToken, gateway, weth, withdrawHelper, rewardsContract, and rewardsToken.");
  }

  console.log(`\uD83D\uDD11 Deploying ${name} with signer: ${signer.address}`);

  const StrategyFactory = await ethers.getContractFactory(contract, signer);

  const proxy = await upgrades.deployProxy(
    StrategyFactory,
    [name, gateway, vault, withdrawHelper, swapHelper, receiptToken, weth, rewardsContract, rewardsToken, 0],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await proxy.deployed();
  console.log(`\u2705 ${name} proxy deployed at: ${proxy.address}`);

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxy.address);
  console.log(`\uD83D\uDCC6 Implementation deployed at: ${implAddress}`);

  const etherscanApiKey = hre.config.etherscan.apiKey?.[network];
  if (etherscanApiKey) {
    console.log(`\uD83D\uDD0D Verifying implementation on Etherscan...`);
    try {
      await hre.run("verify:verify", {
        address: implAddress,
        constructorArguments: [],
      });
      console.log(`\u2705 Implementation verified on Etherscan`);
    } catch (err) {
      console.error("\u274C Etherscan verification failed:", err.message);
    }
  } else {
    console.log(`\u26A0\uFE0F No Etherscan API key for ${network}, skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify({ proxyAddress: proxy.address, implementationAddress: implAddress }));
  }
};

task("deploy-compound-eth-strategy", "Deploy CompoundEthStrategy (UUPS)", main)
  .addFlag("json", "Output contract details as JSON")
  .addParam("contract", "Strategy contract name, e.g., CompoundEthStrategy")
  .addParam("name", "The strategy name")
  .addParam("gateway", "ZetaChain gateway address")
  .addParam("vault", "Amana vault address")
  .addParam("receiptToken", "Address of Compound vault")
  .addParam("weth", "WETH token address")
  .addParam("withdrawHelper", "Withdraw helper contract address")
  .addParam("swapHelper", "Swap helper contract address")
  .addParam("rewardsContract", "Rewards contract address")
  .addParam("rewardsToken", "Rewards token address");

export default {};
