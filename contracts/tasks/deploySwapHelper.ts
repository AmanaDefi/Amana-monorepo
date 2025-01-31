import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployLibrary = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const [deployer] = await hre.ethers.getSigners();

  if (!deployer) {
    throw new Error(
      `Wallet not found. Please, set a PRIVATE_KEY env variable or run "npx hardhat account --save"`
    );
  }

  console.log(`🔑 Deploying using account: ${deployer.address}`);
  console.log(`🚀 Deploying SwapHelperLibEddyTestnet on ${network}...`);

  // Deploy the library
  const factory = await hre.ethers.getContractFactory("SwapHelperLibEddyTestnet");
  const swapHelperLib = await factory.deploy();

  console.log("📜 Contract deployed, waiting for confirmations...");
  await swapHelperLib.deployed();

  console.log(`✅ Successfully deployed SwapHelperLibEddyTestnet on ${network}.`);
  console.log(`📍 Library address: ${swapHelperLib.address}`);

  // Verify contract on Etherscan if API key is set
  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: swapHelperLib.address,
        constructorArguments: [], // Libraries don't have constructor arguments
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }

  // Output JSON if the flag is set
  if (args.json) {
    console.log(JSON.stringify(swapHelperLib));
  }
};

// Register the Hardhat task
task("deploy-swap-helper", "Deploy SwapHelperLibEddyTestnet library", deployLibrary)
  .addFlag("json", "Output in JSON format");

// Export for Hardhat
export default {};
