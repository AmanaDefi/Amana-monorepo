import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";

const PYTH_CONTRACT_ADDRESS_ZETACHAIN = "0x2880aB155794e7179c9eE2e38200202908C17B43";
const PYTH_CONTRACT_ADDRESS_BASE = "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a";
const PYTH_CONTRACT_ADDRESS_POLYGON = "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C";
const PYTH_CONTRACT_ADDRESS_ETHEREUM = "0x4305FB66699C3B2702D4d05CF36551390A4c69C6";

const priceIdsZetachain = [
  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
  "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472", // POL/USD
  "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", // BNB/USD
  "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe", // ZETA/USD
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // SOL/USD
  "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8", // CRV/USD
  "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7" // AVAX/USD
];

const priceIdsBase = [
  "0x3cf6bab8bf8041dc8ee2a3edebe16b5f9f4ff3cce46006aeb15c885ba4779d0b", // WELL/USD
  "0x5b2a4c542d4a74dd11784079ef337c0403685e3114ba0d9909b5c7a7e06fdc42" // MORPHO/USD
];

const priceIdsPolygon = [
  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
  "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472", // POL/USD
  "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478" // COMP/USD
];

const priceIdsEthereum = [
  "0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8", // CRV/USD
  "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD
  "0x4a8e42861cabc5ecb50996f92e7cfa2bce3fd0a2423b0c44c9b423fb2bd25478", // COMP/USD
  "0x6aac625e125ada0d2a6b98316493256ca733a5808cd34ccef79b0e28c64d1e76" // CVX/USD
];

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  let PYTH_CONTRACT_ADDRESS;
  if (network === "zeta_mainnet") {
    PYTH_CONTRACT_ADDRESS = PYTH_CONTRACT_ADDRESS_ZETACHAIN;
  } else if (network === "base") {
    PYTH_CONTRACT_ADDRESS = PYTH_CONTRACT_ADDRESS_BASE;
  } else if (network === "polygon") {
    PYTH_CONTRACT_ADDRESS = PYTH_CONTRACT_ADDRESS_POLYGON;
  } else if (network === "mainnet") {
    PYTH_CONTRACT_ADDRESS = PYTH_CONTRACT_ADDRESS_ETHEREUM;
  } else {
    throw new Error(
      `Unsupported network: ${network}. Supported networks are: zeta_mainnet, base, polygon.`
    );
  }
  console.log(`📍 Pyth contract address: ${PYTH_CONTRACT_ADDRESS}`);
  let priceIds;
  if (network === "zeta_mainnet") {
    console.log("Setting price feeds for Zetachain...")
    priceIds = priceIdsZetachain;
  } else if (network === "base") {
    console.log("Setting price feeds for Base...")
    priceIds = priceIdsBase;
  } else if (network === "polygon") {
    console.log("Setting price feeds for Polygon...")
    priceIds = priceIdsPolygon;
  } else if (network === "mainnet") {
    console.log("Setting price feeds for Ethereum...")
    priceIds = priceIdsEthereum;
  }

  if (!priceIds) {
    throw new Error(
      `Unsupported network: ${network}. Supported networks are: zeta_mainnet, base, polygon.`
    );
  }

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
