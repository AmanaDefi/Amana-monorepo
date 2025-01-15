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
  const name = args.name || "AmanaConnectedChainVault";
  const symbol = args.symbol || "UV";
  const asset = args.asset; // This should be passed as an argument
  const treasury = args.treasury; // Address for the treasury
  const gasTank = args.gastank; // Address for the gas tank contract
  const receiver = args.receiver;
  const gasLimitWithdrawAndCall = args.gasLimitWithdrawAndCall;
  const gasLimitCall = args.gasLimitCall;

  // Set the default for performanceFeeRate if it's not provided
  const performanceFeeRate = args.performanceFeeRate ?? 1500; // Default to 15% (1500 basis points)

  if (!asset || !treasury || !gasTank || !receiver) {
    throw new Error("🚨 Asset address, Treasury address, GasTank address and WithdrawalReceiver address are required.");
  }

  // Deploy the AmanaConnectedChainVault contract using OpenZeppelin Upgrades
  const factory = await hre.ethers.getContractFactory("AmanaConnectedChainVault");
  const contract = await hre.upgrades.deployProxy(factory, [name, symbol, asset, treasury, performanceFeeRate, gasTank, receiver, gasLimitWithdrawAndCall, gasLimitCall], {
    initializer: "initialize",
  });
  console.log("Contract deployed, waiting for confirmations...");

  // Wait for contract to be deployed before proceeding
  await contract.deployed();

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Successfully deployed AmanaConnectedChainVault on ${network}.`);
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

task("deploy-amana-connected-chain-vault", "Deploy the AmanaConnectedChainVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "AmanaConnectedChainVault")
  .addOptionalParam("symbol", "Token symbol", "UV")
  .addParam("asset", "The address of the asset ERC20 token")
  .addParam("treasury", "The address of the treasury")
  .addParam("gastank", "The address of the GasTank contract")
  .addParam("receiver", "The address of the WithdrawalReceiver contract on connected chains")
  .addParam("gasLimitWithdrawAndCall", "Gas limit for withdrawAndCall function")
  .addParam("gasLimitCall", "Gas limit for Call function")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)"); // Remove the default here

// Export the task so it can be used in hardhat
export default {};
