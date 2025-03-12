import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployWithdrawHelper = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(`Wallet not found. Please set PRIVATE_KEY in an .env file.`);
  }

  if (!args.gatewayAddress) {
    throw new Error("🚨 Gateway address is required.");
  }

  console.log(`🔑 Deploying WithdrawHelper with signer: ${signer.address}`);

  const WithdrawHelperFactory = await hre.ethers.getContractFactory("WithdrawHelper", signer);
  const withdrawHelper = await WithdrawHelperFactory.deploy(args.gatewayAddress);

  console.log(`🚀 Deploying WithdrawHelper...`);
  await withdrawHelper.deployed();
  console.log(`✅ WithdrawHelper deployed at: ${withdrawHelper.address}`);

  if (args.json) {
    console.log(JSON.stringify({ contractAddress: withdrawHelper.address }));
  }
};

// Hardhat task
task("deploy-withdraw-helper", "Deploys WithdrawHelper contract", deployWithdrawHelper)
  .addParam("gatewayAddress", "The address of the gateway contract")
  .addFlag("json", "Output in JSON");

// Export task
export default {};
