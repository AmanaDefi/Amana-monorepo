import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const { proxyAddress } = args;
  const { ethers, upgrades } = hre;

  if (!proxyAddress) {
    throw new Error("🚨 Proxy contract address is required");
  }

  const AmanaVault = await ethers.getContractFactory("AmanaConnectedChainVault");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, AmanaVault, { kind: "uups", });
  console.log(`✅ Proxy at ${proxyAddress} upgraded.`);
  console.log(`📦 New implementation address: ${await upgrades.erc1967.getImplementationAddress(proxyAddress)}`);
};

task("upgrade-proxy", "Upgrade the implementation of a proxy contract")
  .addParam("proxyAddress", "The address of the proxy contract to upgrade")
  .setAction(main);

export default {};
