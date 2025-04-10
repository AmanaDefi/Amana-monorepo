import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`🔑 Deploying SwapHelperPolygon with signer: ${signer.address}`);

  const SwapHelperPolygon = await hre.ethers.getContractFactory("SwapHelperPolygon", signer);
  const swapHelper = await SwapHelperPolygon.deploy();
  await swapHelper.deployed();

  console.log(`✅ SwapHelperPolygon deployed at: ${swapHelper.address}`);

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

task("deploy-swap-helper-polygon", "Deploys the SwapHelperPolygon contract", main);
export default {};
