import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers, upgrades } = hre;
  const [signer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const gateway = args.gateway;
  const gasTank = args.gasTank;

  if (!gateway) {
    throw new Error("🚨 Gateway address is required.");
  }
  if (!gasTank) {
    throw new Error("🚨 GasTank address is required.");
  }
  console.log(`🔑 Deploying UUPS Upgradeable WithdrawHelper with signer: ${signer.address}`);

  const ContractFactory = await ethers.getContractFactory("WithdrawHelper", signer);

  const proxy = await upgrades.deployProxy(ContractFactory, [gateway], {
    kind: "uups",
    initializer: "initialize",
  });

  await proxy.deployed();
  console.log(`✅ WithdrawHelper proxy deployed at: ${proxy.address}`);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxy.address);
  console.log(`📦 Implementation address: ${implementationAddress}`);

  console.log(`⚙️ Authorizing WithdrawHelper with GasTank at ${gasTank}...`);

  const gasTankContract = await hre.ethers.getContractAt("GasTank", gasTank);
  const tx = await gasTankContract.authorizeVault(proxy.address);
  await tx.wait();
  console.log(`✅ WithdrawHelper authorized with GasTank.`);

  // ✅ Verification
  const etherscanApiKey = hre.config.etherscan.apiKey?.[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying implementation contract on ${network} explorer...`);
    try {
      await hre.run("verify:verify", {
        address: implementationAddress,
        constructorArguments: [],
      });
      console.log(`✅ Contract verified on ${network} explorer`);
    } catch (err) {
      console.error("❌ Contract verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }
};

task("deploy-withdraw-helper", "Deploys the WithdrawHelper contract", main)
  .addParam("gateway", "The address of the Gateway contract")
  .addParam("gasTank", "The address of the GasTank contract")

export default {};
