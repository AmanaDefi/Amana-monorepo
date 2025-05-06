import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log(`🔑 Deploying SwapHelper with signer: ${signer.address}`);

  const priceOracleAddress = args.priceOracle;
  if (!priceOracleAddress) {
    throw new Error("🚨 Price oracle address is required")
  };

  const SwapHelper = await hre.ethers.getContractFactory("SwapHelper", signer);
  const swapHelper = await SwapHelper.deploy(priceOracleAddress);
  await swapHelper.deployed();

  console.log(`✅ SwapHelper deployed at: ${swapHelper.address}`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: swapHelper.address, // Updated from contract.target
        constructorArguments: [priceOracleAddress],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }
};

task("deploy-swap-helper", "Deploys the SwapHelper contract", main)
  .addParam("priceOracle", "The address of the price oracle contract");

export default {};
