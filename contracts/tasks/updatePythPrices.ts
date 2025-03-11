import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import dotenv from "dotenv";

dotenv.config();

const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43"; // Replace this with the actual address

const priceIds = [
  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
  "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472", // POL/USD
  "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", // BNB/USD
  "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe", // ZETA/USD
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // SOL/USD
  "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8" // CRV/USD
];

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  // Fetch the deployer account
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please set the PRIVATE_KEY env variable or use a funded Hardhat account.`
    );
  }

  console.log(`🔑 Using account: ${signer.address}`);
  console.log(`🌍 Network: ${network}`);

  // Get Pyth contract instance
  const pythContract = await hre.ethers.getContractAt(
    "contracts/interfaces/IPyth.sol:IPyth",
    PYTH_CONTRACT_ADDRESS,
    signer
  );

  // Connect to Hermes API to fetch price updates
  const connection = new PriceServiceConnection("https://hermes.pyth.network", {
    priceFeedRequestConfig: { binary: true },
  });

  console.log("📡 Fetching latest price updates...");
  const priceUpdateDataBase64 = await connection.getLatestVaas(priceIds);

  if (!priceUpdateDataBase64 || priceUpdateDataBase64.length === 0) {
    throw new Error("❌ No price updates available from Hermes.");
  }

  // Decode base64 data into binary (Buffer)
  const priceUpdateData: Uint8Array[] = priceUpdateDataBase64.map((data) =>
    Buffer.from(data, "base64")
  );

  // Get required update fee
  const updateFee = await pythContract.getUpdateFee(priceUpdateData);
  console.log(`💰 Update fee: ${ethers.utils.formatEther(updateFee)} ETH`);

  console.log("⏳ Sending updatePriceFeeds transaction...");
  const tx = await pythContract.updatePriceFeeds(priceUpdateData, {
    value: updateFee,
  });

  console.log(`📜 Transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
  console.log("✅ Price feeds updated successfully!");
};

// Define the Hardhat task
task("updatePythPrices", "Fetches and updates Pyth price feeds", main);

export default {};
