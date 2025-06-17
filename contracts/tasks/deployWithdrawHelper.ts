import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers, upgrades } from "hardhat";

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

  console.log(`🔑 Deploying UUPS upgradeable WithdrawHelper with signer: ${signer.address}`);

  const WithdrawHelper = await ethers.getContractFactory("WithdrawHelper", signer);

  const withdrawHelper = await upgrades.deployProxy(
    WithdrawHelper,
    [gateway],
    {
      kind: "uups",
      initializer: "initialize",
    }
  );
  await withdrawHelper.deployed();

  console.log(`✅ WithdrawHelper deployed at proxy address: ${withdrawHelper.address}`);

  console.log(`⚙️ Authorizing WithdrawHelper with GasTank at ${gasTank}...`);

  const gasTankContract = await ethers.getContractAt("GasTank", gasTank);
  const tx = await gasTankContract.authorizeVault(withdrawHelper.address);
  await tx.wait();
  console.log(`✅ WithdrawHelper authorized with GasTank.`);

  // 🧠 Optional: log implementation address
  const implementation = await upgrades.erc1967.getImplementationAddress(withdrawHelper.address);
  console.log(`📦 Implementation deployed at: ${implementation}`);

  // ✅ Verification
  console.log(`🔍 Verifying implementation contract on Etherscan...`);
  try {
    await hre.run("verify:verify", {
      address: implementation,
      constructorArguments: [],
    });
    console.log(`✅ Contract verified on Etherscan.`);
  } catch (err: any) {
    console.error(`❌ Verification failed:`, err.message || err);
  }
};

task("deploy-withdraw-helper", "Deploys the WithdrawHelper contract", main)
  .addParam("gateway", "The address of the Gateway contract")
  .addParam("gasTank", "The address of the GasTank contract");

export default {};
