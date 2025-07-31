import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config(); // Load env vars

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const [signer] = await hre.ethers.getSigners();

  if (!signer) {
    throw new Error("Wallet not found. Please set PRIVATE_KEY in .env");
  }

  const {
    contract: contractName,
    name,
    vault,
    inputToken,
    receiptToken,
    gateway,
    withdrawHelper,
    swapHelper,
    rewardsContract,
    rewardsToken
  } = args;
  console.log("WithdrawwHelper:", withdrawHelper);
  console.log("SwapHelper:", swapHelper);
  console.log("RewardsContract:", rewardsContract);
  console.log("RewardsToken:", rewardsToken);
  console.log("zero address:", hre.ethers.constants.AddressZero);
  if (!name || !vault || !inputToken || !receiptToken || !contractName || !gateway || !withdrawHelper) {
    throw new Error("🚨 Missing required parameters.");
  }

  console.log(`🔑 Deploying ${contractName} with signer: ${signer.address}`);

  for (const [name, address] of Object.entries({
    // name,
    gateway,
    vault,
    withdrawHelper,
    swapHelper,
    receiptToken,
    inputToken
    // rewardsContract,
    // rewardsToken,
  })) {
    console.log(`${name}: ${address}`);
    const code = await hre.ethers.provider.getCode(address);
    console.log(`  -> isContract: ${code !== "0x"}`);
  }


  const StrategyFactory = await hre.ethers.getContractFactory(contractName, signer);
  console.log("DEPLOY ARGS:", [
    name,
    gateway,
    vault,
    withdrawHelper,
    swapHelper ?? hre.ethers.constants.AddressZero,
    receiptToken,
    inputToken,
    rewardsContract ?? hre.ethers.constants.AddressZero,
    rewardsToken ?? hre.ethers.constants.AddressZero,
    0
  ]);

  const proxy = await hre.upgrades.deployProxy(
    StrategyFactory,
    [
      name,
      gateway,
      vault,
      withdrawHelper,
      swapHelper ?? hre.ethers.constants.AddressZero,
      receiptToken,
      inputToken,
      rewardsContract ?? hre.ethers.constants.AddressZero,
      rewardsToken ?? hre.ethers.constants.AddressZero,
      0  // tokenIndex — unused
    ],
    {
      initializer: "initialize",
      kind: "uups",
      gasLimit: 10_000_000
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

task("deploy-erc20-strategy", "Deploy a UUPS upgradeable ERC20-based strategy", main)
  .addFlag("json", "Output in JSON")
  .addParam("contract", "The name of the strategy contract to deploy")
  .addParam("name", "The name of the strategy")
  .addParam("vault", "The address of the vault")
  .addParam("inputToken", "The address of the input token")
  .addParam("receiptToken", "The address of the receipt token")
  .addParam("gateway", "The address of the gateway contract")
  .addParam("withdrawHelper", "The address of the WithdrawHelper contract")
  .addOptionalParam("swapHelper", "The address of the SwapHelper contract (optional)")
  .addOptionalParam("rewardsContract", "The address of the rewards contract (optional)")
  .addOptionalParam("rewardsToken", "The address of the rewards token (optional)");

export default {};
