import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  if (!args.pythContractAddress) {
    throw new Error("🚨 Pyth contract address is required.");
  }

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Deploying PriceOracle contract on ${network}...`);

  const factory = await hre.ethers.getContractFactory("PriceOracle");
  const contract = await factory.deploy(args.pythContractAddress);
  await contract.deployed();

  console.log(`✅ Successfully deployed PriceOracle on ${network}`);
  console.log(`📜 Contract address: ${contract.address}`);

  // ✅ Verify the contract on Etherscan
  if (network !== "hardhat") {
    console.log("🔍 Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [args.pythContractAddress],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (err) {
      console.error("❌ Verification failed:", err);
    }
  }

  if (args.json) {
    console.log(JSON.stringify({ contractAddress: contract.address }));
  }
};

// Define Hardhat task
task("deploy-price-oracle", "Deploy the PriceOracle contract")
  .addParam("pythContractAddress", "The address of the Pyth contract", undefined, types.string)
  .addFlag("json", "Output in JSON format")
  .setAction(main);

// Export default for Hardhat
export default {};
