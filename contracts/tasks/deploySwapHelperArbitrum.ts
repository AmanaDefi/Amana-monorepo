import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const priceOracle = args.priceOracle;
  console.log(`🔑 Deploying SwapHelperArbitrum with signer: ${signer.address}`);

  const SwapHelperArbitrum = await hre.ethers.getContractFactory("SwapHelperArbitrum", signer);
  const swapHelper = await SwapHelperArbitrum.deploy(priceOracle);
  await swapHelper.deployed();

  console.log(`✅ SwapHelperArbitrum deployed at: ${swapHelper.address}`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: swapHelper.address, // Updated from contract.target
        constructorArguments: [priceOracle],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }
};

task("deploy-swap-helper-arbitrum", "Deploys the SwapHelperArbitrum contract", main)
  .addParam("priceOracle", "The address of the PriceOracle contract");

export default {};
