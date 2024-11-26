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

  // Fetch the initializer parameters
  const name = args.name || "AmanaVault";
  const symbol = args.symbol || "UV";
  const asset = args.asset; // This should be passed as an argument
  const treasury = args.treasury; // Address for the treasury
  const gateway = args.gateway; // Address for the gateway
  const system = args.system; // Address for the system contract
  const gasTank = args.gastank; // Address for the gas tank contract

  // Set the default for performanceFeeRate if it's not provided
  const performanceFeeRate = args.performanceFeeRate ?? 1500; // Default to 15% (1500 basis points)

  if (!asset || !treasury || !gateway || !system) {
    throw new Error("🚨 Asset address, Treasury address, Gateway address and System Contract address are required.");
  }

  // Deploy the AmanaVault contract using OpenZeppelin Upgrades
  const factory = await hre.ethers.getContractFactory("AmanaVault");
  const contract = await hre.upgrades.deployProxy(factory, [name, symbol, asset, treasury, performanceFeeRate, gateway, system, gasTank], {
    initializer: "initialize",
  });
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for contract to be deployed before proceeding
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed AmanaVault on ${network}.`);
  console.log(`📜 Contract address: ${contract.address}`);  // Updated from contract.target

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    // Verifying the implementation contract first
    const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(contract.address);  // Updated from getAddress()
    console.log(`Verifying implementation: ${implementationAddress}`);
    try {
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log(`✅ Successfully verified implementation contract at ${implementationAddress}`);
    } catch (err) {
      console.error("❌ Failed to verify implementation contract:", err);
    }

    // Verifying the proxy contract
    const proxyAddress = contract.address;  // Updated from getAddress()
    console.log(`Verifying proxy: ${proxyAddress}`);
    try {
      await hre.run("verify:verify", {
        address: proxyAddress,
        constructorArguments: [], // Proxy has no constructor arguments
      });
      console.log(`✅ Successfully verified proxy contract at ${proxyAddress}`);
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log(`ℹ️ Proxy contract at ${proxyAddress} is already verified.`);
      } else {
        console.error("❌ Failed to verify proxy contract:", err);
      }
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify(contract));
  }
};

task("deploy-upgradeable-vault", "Deploy the AmanaVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "AmanaVault")
  .addOptionalParam("symbol", "Token symbol", "UV")
  .addParam("asset", "The address of the asset ERC20 token")
  .addParam("treasury", "The address of the treasury")
  .addParam("gateway", "The address of the gateway")
  .addParam("system", "The address of the system contract")
  .addParam("gastank", "The address of the GasTank contract")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)"); // Remove the default here

// Export the task so it can be used in hardhat
export default {};
