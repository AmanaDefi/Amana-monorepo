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

  // Deploy the Mock4626 contract
  const assetAddress = args.asset; // Pass the address of the underlying asset as an argument
  if (!assetAddress) {
    throw new Error("Asset address is required to deploy Mock4626 contract.");
  }

  const factory = await hre.ethers.getContractFactory("Mock4626");
  console.log("Deploying Mock4626 contract...");
  const mock4626 = await factory.deploy(assetAddress);

  console.log("Contract deployed, waiting for confirmations...");
  await mock4626.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed Mock4626 on ${network}.`);
  console.log(`📜 Contract address: ${mock4626.address}`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: mock4626.address, // Updated from contract.target
        constructorArguments: [assetAddress],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify(mock4626));
  }
};

task("deploy-mock-4626", "Deploy the Mock4626 contract", main)
  .addParam("asset", "The address of the underlying asset token")
  .addFlag("json", "Output in JSON");

// Export the task so it can be used in Hardhat
export default {};
