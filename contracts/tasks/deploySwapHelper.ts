import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();

  console.log(`🔑 Deploying SwapHelper with signer: ${signer.address}`);

  const SwapHelper = await hre.ethers.getContractFactory("SwapHelper", signer);
  const swapHelper = await SwapHelper.deploy();
  await swapHelper.deployed();

  console.log(`✅ SwapHelper deployed at: ${swapHelper.address}`);

  // Check storage slots to ensure the contract is stateless
  const storageSlot0 = await hre.ethers.provider.getStorageAt(swapHelper.address, 0);
  if (storageSlot0 !== "0x0") {
    throw new Error("🚨 Deployment failed: SwapHelper is not stateless!");
  }

  console.log(`✅ SwapHelper verified as stateless.`);
};

task("deploy-swap-helper", "Deploys the SwapHelper contract", main);
export default {};
