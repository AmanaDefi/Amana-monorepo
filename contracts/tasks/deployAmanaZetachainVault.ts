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
  const name = args.name || "AmanaZetachainVault";
  const symbol = args.symbol || "UV";
  const asset = args.asset; // This should be passed as an argument
  const treasury = args.treasury; // Address for the treasury
  const gasTank = args.gastank; // Address for the gas tank contract

  // Set the default for performanceFeeRate if it's not provided
  const performanceFeeRate = args.performanceFeeRate ?? 1500; // Default to 15% (1500 basis points)

  if (!asset || !treasury) {
    throw new Error("🚨 Asset address, Treasury address and System Contract address are required.");
  }

  // Deploy the AmanaZetachainVault contract using OpenZeppelin Upgrades
  const factory = await hre.ethers.getContractFactory("AmanaZetachainVault");
  const contract = await hre.upgrades.deployProxy(factory, [name, symbol, asset, treasury, performanceFeeRate, gasTank], {
    initializer: "initialize",
  });
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for contract to be deployed before proceeding
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed AmanaZetachainVault on ${network}.`);
  console.log(`📜 Contract address: ${contract.address}`);  // Updated from contract.target

  // Authorize the vault with the GasTank
  console.log(`⚙️ Authorizing the vault with the GasTank at ${gasTank}`);
  const gasTankContract = await hre.ethers.getContractAt("GasTank", gasTank);
  const tx = await gasTankContract.authorizeVault(contract.address);
  await tx.wait();
  console.log(`✅ Vault authorized with GasTank.`);

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

task("deploy-amana-zetachain-vault", "Deploy the AmanaZetachainVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "AmanaZetachainVault")
  .addOptionalParam("symbol", "Token symbol", "UV")
  .addParam("asset", "The address of the asset ERC20 token")
  .addParam("treasury", "The address of the treasury")
  .addParam("gastank", "The address of the GasTank contract")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)"); // Remove the default here

// Export the task so it can be used in hardhat
export default {};
