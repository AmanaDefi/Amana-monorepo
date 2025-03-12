import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploySwapHelper = async (_args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(`Wallet not found. Please set PRIVATE_KEY in an .env file.`);
  }

  console.log(`🔑 Deploying SwapHelper with signer: ${signer.address}`);

  const SwapHelperFactory = await hre.ethers.getContractFactory("SwapHelper", signer);
  const swapHelper = await SwapHelperFactory.deploy();

  console.log(`🚀 Deploying SwapHelper...`);
  await swapHelper.deployed();
  console.log(`✅ SwapHelper deployed at: ${swapHelper.address}`);

  if (_args.json) {
    console.log(JSON.stringify({ contractAddress: swapHelper.address }));
  }
};

// Hardhat task
task("deploy-swap-helper", "Deploys SwapHelper contract", deploySwapHelper)
  .addFlag("json", "Output in JSON");

// Export task
export default {};
