import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { proxyAddress, gasPrice, gasLimit } = args;
  const { ethers, upgrades } = hre;

  if (!proxyAddress) {
    throw new Error("🚨 Proxy contract address is required");
  }

  // Check the current implementation address of the proxy
  const currentImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log(`Current implementation address of proxy at ${proxyAddress}: ${currentImplementation}`);

  const UpgradeableVault = await ethers.getContractFactory("UpgradeableVault");

  console.log(`Attempting to upgrade proxy at ${proxyAddress} to new implementation...`);

  try {
    // Prepare the upgrade transaction
    const upgradeTx = await upgrades.prepareUpgrade(proxyAddress, UpgradeableVault);

    // Set up transaction options for gas price and gas limit
    const txOptions = {
      gasPrice: gasPrice ? BigNumber.from(gasPrice) : undefined,
      gasLimit: gasLimit ? BigNumber.from(gasLimit) : undefined,
    };

    // Send the upgrade transaction with the specified gas options
    const txResponse = await ethers.provider.getSigner().sendTransaction({
      to: proxyAddress,
      data: upgradeTx.data,
      ...txOptions,
    });

    // Wait for deployment to be confirmed
    const receipt = await txResponse.wait(5);
    console.log(`✅ Proxy at ${proxyAddress} successfully upgraded. Transaction hash: ${receipt.transactionHash}`);

  } catch (error) {
    console.error("❌ Upgrade failed with error:", error);
  }
};

// Define the Hardhat task for upgrading the proxy with additional gas options
task("upgrade-proxy", "Upgrade the implementation of a proxy contract")
  .addParam("proxyAddress", "The address of the proxy contract to upgrade")
  .addOptionalParam("gasPrice", "The gas price to use for the transaction, in wei")
  .addOptionalParam("gasLimit", "The gas limit to use for the transaction")
  .setAction(main);

export default {};
