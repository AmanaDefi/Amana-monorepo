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
  const name = args.name || "UpgradeableVault";
  const symbol = args.symbol || "UV";
  const assetaddress = args.assetaddress; // This should be passed as an argument
  const treasuryAddress = args.treasuryAddress; // Address for the treasury

  // Set the default for performanceFeeRate if it's not provided
  const performanceFeeRate = args.performanceFeeRate ?? 1500; // Default to 15% (1500 basis points)

  if (!assetaddress || !treasuryAddress) {
    throw new Error("🚨 Asset address, Strategy address and Treasury address are required.");
  }

  // Deploy the UpgradeableVault contract using OpenZeppelin Upgrades
  const factory = await hre.ethers.getContractFactory("UpgradeableVault");
  const contract = await hre.upgrades.deployProxy(factory, [name, symbol, assetaddress, treasuryAddress, performanceFeeRate], {
    initializer: "initialize",
  });
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for 5 confirmations before proceeding
  await contract.deploymentTransaction().wait(5);


  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed UpgradeableVault on base.`);
  console.log(`📜 Contract address: ${contract.target}`);

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    // Verifying the implementation contract first
    console.log(`Verifying implementation: ${await hre.upgrades.erc1967.getImplementationAddress(await contract.getAddress())}`);
    try {
      const implementationAddress = await hre.upgrades.erc1967.getImplementationAddress(await contract.getAddress());
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log(`✅ Successfully verified implementation contract at ${implementationAddress}`);
    } catch (err) {
      console.error("❌ Failed to verify implementation contract:", err);
    }

    // Verifying the proxy contract
    const proxyAddress = await contract.getAddress();
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

task("deploy-upgradeable-vault", "Deploy the UpgradeableVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "UpgradeableVault")
  .addOptionalParam("symbol", "Token symbol", "UV")
  .addParam("assetaddress", "The address of the asset ERC20 token")
  .addParam("treasuryAddress", "The address of the treasury")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)"); // Remove the default here

// Export the task so it can be used in hardhat
export default {};
