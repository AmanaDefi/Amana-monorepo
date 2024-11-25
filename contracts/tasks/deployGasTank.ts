import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Deploy the GasTank contract
  const factory = await hre.ethers.getContractFactory("GasTank");
  console.log("Deploying GasTank contract...");
  const gasTank = await factory.deploy();

  console.log("Contract deployed, waiting for confirmations...");
  await gasTank.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed GasTank on ${network}.`);
  console.log(`📜 Contract address: ${gasTank.address}`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: gasTank.address, // Updated from contract.target
        constructorArguments: [],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify(gasTank));
  }
};

task("deploy-gas-tank", "Deploy the GasTank contract", main)
  .addFlag("json", "Output in JSON");

// Export the task so it can be used in Hardhat
export default {};
