import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  const gateway = args.gateway;

  if (!gateway) {
    throw new Error("🚨 Gateway address is required.");
  }

  console.log(`🔑 Deploying WithdrawHelper with signer: ${signer.address}`);

  const WithdrawHelper = await hre.ethers.getContractFactory("WithdrawHelper", signer);
  const withdrawHelper = await WithdrawHelper.deploy(gateway);
  await withdrawHelper.deployed();

  console.log(`✅ WithdrawHelper deployed at: ${withdrawHelper.address}`);

  // Check storage slots to ensure the contract is stateless
  const storageSlot0 = await hre.ethers.provider.getStorageAt(withdrawHelper.address, 0);
  if (BigInt(storageSlot0) !== BigInt(0)) {
    throw new Error("🚨 Deployment failed: WithdrawHelper is not stateless!");
  }

  console.log(`✅ WithdrawHelper verified as stateless.`);
};

task("deploy-withdraw-helper", "Deploys the WithdrawHelper contract", main)
  .addParam("gateway", "The address of the Gateway contract");
export default {};
