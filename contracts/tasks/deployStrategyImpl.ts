import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers, run } = hre;
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log(`🔑 Deploying implementation with signer: ${signer.address}`);

  const ContractFactory = await ethers.getContractFactory(args.contract, signer);
  const contract = await ContractFactory.deploy();
  await contract.deployed();

  console.log(`✅ ${args.contract} implementation deployed at: ${contract.address}`);

  // Optional delay for block confirmations
  console.log("⏳ Waiting for 5 block confirmations...");
  await contract.deployTransaction.wait(5);

  // Verification
  const etherscanApiKey = hre.config.etherscan.apiKey?.[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying implementation contract on ${network}...`);
    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: [],
      });
      console.log(`✅ Contract verified on ${network}`);
    } catch (err: any) {
      console.error("❌ Verification failed:", err.message || err);
    }
  } else {
    console.warn("⚠️ Etherscan API key not configured. Skipping verification.");
  }
};

task("deploy-implementation", "Deploys and verifies a non-proxy implementation contract")
  .addParam("contract", "The name of the contract to deploy")
  .setAction(main);

export default {};
