import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Fetch the vault address argument required for the BaseAaveStrategy constructor
  const contractName = args.contract;
  const name = args.name;
  const vault = args.vault; // This should be passed as an argument
  const withdrawHelper = args.withdrawHelper;
  const swapHelper = args.swapHelper;
  const receiptToken = args.receiptToken;
  const inputToken = args.inputToken;
  const tokenIndex = args.tokenIndex;
  const cvxRewardsPool = args.cvxRewardsPool;
  const crvToken = args.crvToken;
  const convexPid = args.convexPid;
  const boosterAddress = args.boosterAddress;
  const cvxToken = args.cvxToken;

  if (!name) {
    throw new Error("🚨 Strategy name is required");
  }
  if (!vault) {
    throw new Error("🚨 Vault address is required");
  }
  if (!receiptToken) {
    throw new Error("🚨 Receipt token address is required");
  }
  if (!contractName) {
    throw new Error("🚨 Strategy contract name is required");
  }

  if (!inputToken) {
    throw new Error("🚨 WETH address is required");
  }

  // Deploy the BaseAaveStrategy contract
  const factory = await hre.ethers.getContractFactory(contractName);
  const contract = await factory.deploy(name, vault, withdrawHelper, swapHelper, receiptToken, inputToken, cvxRewardsPool, crvToken, tokenIndex, convexPid, boosterAddress, cvxToken);
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for contract to be deployed before proceeding
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed ${name} on ${network}.`);
  console.log(`📜 Contract address: ${contract.address}`); // Updated from contract.target

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: contract.address, // Updated from contract.target
        constructorArguments: [name, vault, withdrawHelper, swapHelper, receiptToken, inputToken, cvxRewardsPool, crvToken, tokenIndex, convexPid, boosterAddress, cvxToken],
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

// Define the Hardhat task for deployment
task("deploy-convex-strategy", "Deploy a Strategy contract", main)
  .addFlag("json", "Output in JSON")
  .addParam("contract", "The name of the strategy contract to deploy")
  .addParam("name", "The name of the strategy")
  .addParam("vault", "The address of the vault")
  .addParam("withdrawHelper", "The address of the withdraw helper contract")
  .addParam("swapHelper", "The address of the swap helper contract")
  .addParam("receiptToken", "The address of the receipt token")
  .addParam("inputToken", "The address of the WETH contract")
  .addParam("cvxRewardsPool", "The address of the CVX rewards pool")
  .addParam("crvToken", "The address of the CRV token")
  .addParam("tokenIndex", "The index of the token in the gauge contract")
  .addParam("convexPid", "The Convex PID")
  .addParam("boosterAddress", "The address of the Convex booster")
  .addParam("cvxToken", "The address of the CVX token");

export default {};
