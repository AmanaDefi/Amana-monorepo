import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  // Fetch the deployer account
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  const swapHelperLibEddy = args.swapHelper;

  // Deploy the ZapContract contract
  const factory = await hre.ethers.getContractFactory("ZapContract", {
    libraries: {
      SwapHelperLibEddy: swapHelperLibEddy,
    },
  });

  const contract = await factory.deploy();
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for contract to be deployed before proceeding
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed ZapContract on ${network}.`);
  console.log(`📜 Contract address: ${contract.address}`); // Updated from contract.target

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: contract.address, // Updated from contract.target
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
    console.log(JSON.stringify(contract));
  }
};

// Define the Hardhat task
task("deploy-zap-contract", "Deploy the ZapContract contract", main)
  .addFlag("json", "Output in JSON")
  .addParam("swapHelper", "SwapHelperLibEddy address")

export default {};
