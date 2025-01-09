import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "ethers";

// Address of the pre-existing CREATE2 deployer contract
const CREATE2_DEPLOYER_ADDRESS = "0x0B04a5C20CC2dC2701771944b1581586E661e416";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  const contractName = "WithdrawalReceiver";

  // Get the contract's bytecode
  const factory = await hre.ethers.getContractFactory(contractName);
  const bytecode = factory.bytecode;

  // Define the salt for CREATE2
  const salt = ethers.utils.id("WithdrawalReceiverSalt1234"); // Replace with any unique identifier

  // Precompute the contract address
  const create2Address = ethers.utils.getCreate2Address(
    CREATE2_DEPLOYER_ADDRESS,
    salt,
    ethers.utils.keccak256(bytecode)
  );

  console.log(`🔑 Deployer address: ${CREATE2_DEPLOYER_ADDRESS}`);
  console.log(`📜 Precomputed contract address: ${create2Address}`);

  // Check if the contract is already deployed
  const code = await hre.ethers.provider.getCode(create2Address);
  if (code !== "0x") {
    console.log(`🚀 Contract already deployed at ${create2Address} on ${network}`);
    return;
  }

  // Deploy the contract using the CREATE2 deployer
  const tx = await signer.sendTransaction({
    to: CREATE2_DEPLOYER_ADDRESS,
    data: ethers.utils.solidityPack(["bytes", "bytes32"], [bytecode, salt]),
    gasLimit: 7000000, // Adjust as needed
    gasPrice: await hre.ethers.provider.getGasPrice(),
  });

  console.log("Contract deployment transaction sent, waiting for confirmations...");
  const receipt = await tx.wait();

  console.log(`✅ Successfully deployed contract at ${create2Address} on ${network}`);
  console.log(`📜 Transaction hash: ${receipt.transactionHash}`);

  if (args.json) {
    console.log(JSON.stringify({ contractAddress: create2Address, transactionHash: receipt.transactionHash }));
  }

  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: create2Address,
        constructorArguments: [], // No constructor arguments
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }
};

// Define the Hardhat task for deployment
task("deploy-withdrawal-receiver", "Deploy the WithdrawalReceiver contract with CREATE2", main)
  .addFlag("json", "Output in JSON");

export default {};
