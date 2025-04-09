import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const [signer] = await hre.ethers.getSigners();
  const gateway = args.gateway;
  const gasTank = args.gasTank;

  if (!gateway) {
    throw new Error("🚨 Gateway address is required.");
  }
  if (!gasTank) {
    throw new Error("🚨 GasTank address is required.");
  }
  console.log(`🔑 Deploying WithdrawHelper with signer: ${signer.address}`);

  const WithdrawHelper = await hre.ethers.getContractFactory("WithdrawHelper", signer);
  const withdrawHelper = await WithdrawHelper.deploy(gateway);
  await withdrawHelper.deployed();

  console.log(`✅ WithdrawHelper deployed at: ${withdrawHelper.address}`);

  console.log(`⚙️ Authorizing WithdrawHelper with GasTank at ${gasTank}...`);

  const gasTankContract = await hre.ethers.getContractAt("GasTank", gasTank);
  const tx = await gasTankContract.authorizeVault(withdrawHelper.address);
  await tx.wait();
  console.log(`✅ WithdrawHelper authorized with GasTank.`);

  // ✅ Verification
  console.log(`🔍 Verifying WithdrawHelper...`);
  try {
    await hre.run("verify:verify", {
      address: withdrawHelper.address,
      constructorArguments: [gateway],
    });
    console.log(`✅ Contract verified on Etherscan.`);
  } catch (err: any) {
    console.error(`❌ Verification failed:`, err.message || err);
  }
};

task("deploy-withdraw-helper", "Deploys the WithdrawHelper contract", main)
  .addParam("gateway", "The address of the Gateway contract")
  .addParam("gasTank", "The address of the GasTank contract")

export default {};
