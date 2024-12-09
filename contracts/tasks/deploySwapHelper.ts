import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please set a PRIVATE_KEY environment variable or configure your wallet in the Hardhat config.`
    );
  }

  const contractName = args.name || "SwapHelper"; // Default to "SwapHelper"
  const factory = await hre.ethers.getContractFactory(contractName);

  // Deploy the contract
  console.log(`Deploying "${contractName}" contract to ${network}...`);
  const contract = await factory.deploy();
  await contract.deployed();

  // Output the deployment details
  if (args.json) {
    console.log(JSON.stringify({ address: contract.address }));
  } else {
    console.log(`🔑 Using account: ${signer.address}

🚀 Successfully deployed "${contractName}" contract on ${network}.
📜 Contract address: ${contract.address}
`);
  }
};

// Define the Hardhat task
task("deploy-swap-helper", "Deploy the SwapHelper contract", main)
  .addFlag("json", "Output deployment details in JSON format")
  .addOptionalParam("name", "Name of the contract to deploy", "SwapHelper", types.string);
