import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { ethers, upgrades } = hre;
  const [signer] = await ethers.getSigners();
  const network = hre.network.name;

  console.log(`🔑 Deploying UUPS Upgradeable SwapHelperEthereum with signer: ${signer.address}`);

  const priceOracleAddress = args.priceOracle;
  if (!priceOracleAddress) {
    throw new Error("🚨 Price oracle address is required");
  }

  const SwapHelperEthereum = await ethers.getContractFactory("SwapHelperEthereum", signer);

  const proxy = await upgrades.deployProxy(SwapHelperEthereum, [priceOracleAddress], {
    kind: "uups",
    initializer: "initialize",
  });

  await proxy.deployed();
  console.log(`✅ SwapHelperEthereum proxy deployed at: ${proxy.address}`);

  // Optional: print the implementation address
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

task("deploy-swap-helper-ethereum", "Deploys the UUPS upgradeable SwapHelperEthereum contract", main)
  .addParam("priceOracle", "The address of the price oracle contract");

export default {};
