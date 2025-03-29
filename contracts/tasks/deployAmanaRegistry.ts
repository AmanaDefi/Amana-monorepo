import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const [signer] = await hre.ethers.getSigners();

  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable`
    );
  }

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🚀 Deploying AmanaRegistry contract on ${network}...`);

  const factory = await hre.ethers.getContractFactory("AmanaRegistry", signer);
  const registry = await factory.deploy(
    args.gasTank,
    args.treasury,
    args.withdrawHelper,
    args.withdrawalReceiver,
    args.swapHelper,
    args.zapContract
  );
  await registry.deployed();

  console.log(`✅ Successfully deployed AmanaRegistry on ${network}`);
  console.log(`📜 Contract address: ${registry.address}`);

  if (args.json) {
    console.log(JSON.stringify({ contractAddress: registry.address }));
  }
};

// Define Hardhat task
task("deploy-amana-registry", "Deploy the AmanaRegistry contract")
  .addParam("gasTank", "Address of the gas tank", undefined, types.string)
  .addParam("treasury", "Address of the treasury", undefined, types.string)
  .addParam("withdrawHelper", "Address of the withdraw helper", undefined, types.string)
  .addParam("withdrawalReceiver", "Address of the withdrawal receiver", undefined, types.string)
  .addParam("swapHelper", "Address of the swap helper", undefined, types.string)
  .addParam("zapContract", "Address of the zap contract", undefined, types.string)
  .addFlag("json", "Output in JSON format")
  .setAction(main);

export default {};
