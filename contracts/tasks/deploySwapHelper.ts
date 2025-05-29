import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers, upgrades } = hre;
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;

  const contractName = args.contract;
  const priceOracleAddress = args.priceOracle;

  if (!contractName) {
    throw new Error("🚨 Contract name is required (e.g., SwapHelperOnBase)");
  }

  if (!priceOracleAddress) {
    throw new Error("🚨 Price oracle address is required");
  }

  console.log(`🔑 Deploying UUPS Upgradeable ${contractName} with signer: ${signer.address}`);

  const ContractFactory = await ethers.getContractFactory(contractName, signer);

  const proxy = await upgrades.deployProxy(ContractFactory, [priceOracleAddress], {
    kind: "uups",
    initializer: "initialize",
  });

  await proxy.deployed();
  console.log(`✅ ${contractName} proxy deployed at: ${proxy.address}`);

  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxy.address);
  console.log(`📦 Implementation address: ${implementationAddress}`);

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

task("deploy-swap-helper", "Deploys a UUPS upgradeable SwapHelper contract")
  .addParam("contract", "The contract name to deploy, e.g., SwapHelperOnBase")
  .addParam("priceOracle", "The address of the price oracle contract")
  .setAction(main); // <- This line is missing in your current script

export default {};
