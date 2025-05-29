import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

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
    vault,
    receiptToken,
    gateway,
    wrappedTokenGateway,
    weth,
    withdrawHelper
  } = args;

  if (!contract || !name || !vault || !receiptToken || !gateway || !wrappedTokenGateway || !weth || !withdrawHelper) {
    throw new Error("🚨 Missing required parameter. Check contract, name, vault, receiptToken, gateway, wrappedTokenGateway, weth, and withdrawHelper.");
  }

  console.log(`\uD83D\uDD11 Deploying ${name} with signer: ${signer.address}`);

  const StrategyFactory = await ethers.getContractFactory(contract, signer);

  const proxy = await upgrades.deployProxy(
    StrategyFactory,
    [name, vault, receiptToken, gateway, wrappedTokenGateway, weth, withdrawHelper],
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

task("deploy-evm-aave-eth-strategy", "Deploy AaveEthStrategy (UUPS)", main)
  .addFlag("json", "Output contract details as JSON")
  .addParam("contract", "Strategy contract name, e.g., AaveEthStrategy")
  .addParam("name", "The strategy name")
  .addParam("vault", "Amana vault address")
  .addParam("receiptToken", "Address of Aave aToken")
  .addParam("gateway", "ZetaChain gateway address")
  .addParam("wrappedTokenGateway", "Aave WrappedTokenGatewayV3 address")
  .addParam("weth", "WETH token address")
  .addParam("withdrawHelper", "Withdraw helper contract address");

export default {};
