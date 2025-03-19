import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`🔑 Deploying SwapHelper with signer: ${signer.address}`);

  const SwapHelper = await hre.ethers.getContractFactory("SwapHelperOnBase", signer);
  const swapHelper = await SwapHelper.deploy();
  await swapHelper.deployed();

  console.log(`✅ SwapHelper deployed at: ${swapHelper.address}`);

  // Check storage slots to ensure the contract is stateless
  const storageSlot0 = await hre.ethers.provider.getStorageAt(swapHelper.address, 0);
  if (BigInt(storageSlot0) !== BigInt(0)) {
    throw new Error("🚨 Deployment failed: SwapHelper is not stateless!");
  }

  console.log(`✅ SwapHelper verified as stateless.`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: swapHelper.address, // Updated from contract.target
        constructorArguments: [],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }
};

task("deploy-swap-helper", "Deploys the SwapHelper contract", main);
export default {};
