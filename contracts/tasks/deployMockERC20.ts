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

  // Set deployment parameters
  const tokenName = "Mock Token"; // Replace with your desired token name
  const tokenSymbol = "MCK";      // Replace with your desired token symbol
  const tokenDecimals = 18;        // Replace with your desired decimals

  // Deploy the MockERC20 contract
  const factory = await hre.ethers.getContractFactory("MockERC20");
  console.log("Deploying MockERC20 contract...");
  const mockERC20 = await factory.deploy(tokenName, tokenSymbol, tokenDecimals);

  console.log("Contract deployed, waiting for confirmations...");
  await mockERC20.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed MockERC20 on ${network}.`);
  console.log(`📜 Contract address: ${mockERC20.address}`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: mockERC20.address, // Updated from contract.target
        constructorArguments: [tokenName, tokenSymbol, tokenDecimals],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify(mockERC20));
  }
};

task("deploy-mock-erc20", "Deploy the MockERC20 contract", main)
  .addFlag("json", "Output in JSON");

// Export the task so it can be used in Hardhat
export default {};
