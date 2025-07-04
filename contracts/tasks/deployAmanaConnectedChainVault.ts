import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const main = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;
  const [signer] = await hre.ethers.getSigners();

  if (!signer) {
    throw new Error(
      `Wallet not found. Please set PRIVATE_KEY in an .env file or run "npx hardhat account --save".`
    );
  }

  const name = args.name || "AmanaConnectedChainVault";
  const symbol = args.symbol || "UV";
  const asset = args.asset;
  const registry = args.registry;
  const gasLimitWithdrawAndCall = args.gasLimitWithdrawAndCall;
  const gasLimitCall = args.gasLimitCall;
  const performanceFeeRate = args.performanceFeeRate ?? 1500;
  const depositFeePaid = args.depositFeePaid === "true";

  if (!asset || !registry) {
    throw new Error("🚨 Asset and registry addresses are required.");
  }

  console.log(`🔑 Deploying with signer: ${signer.address}`);

  const factory = await hre.ethers.getContractFactory("AmanaConnectedChainVault", signer);

  const proxy = await hre.upgrades.deployProxy(
    factory,
    [
      name,
      symbol,
      asset,
      registry,
      performanceFeeRate,
      gasLimitWithdrawAndCall,
      gasLimitCall,
      depositFeePaid
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await proxy.deployed();
  console.log(`✅ Proxy deployed at: ${proxy.address}`);

  // Get implementation address
  const implAddress = await hre.upgrades.erc1967.getImplementationAddress(proxy.address);
  console.log(`📦 Implementation deployed at: ${implAddress}`);

  // Authorize vault with GasTank
  const registryContract = await hre.ethers.getContractAt("AmanaRegistry", registry);
  const gasTank = await registryContract.gasTank();
  console.log(`⚙️ Authorizing vault with GasTank at ${gasTank}...`);

  const gasTankContract = await hre.ethers.getContractAt("GasTank", gasTank);
  const tx = await gasTankContract.authorizeVault(proxy.address);
  await tx.wait();
  console.log(`✅ Vault authorized with GasTank.`);

  // Verify implementation contract
  const etherscanApiKey = hre.config.etherscan.apiKey?.[network];
  if (etherscanApiKey) {
    console.log(`🔍 Verifying implementation on Etherscan...`);
    try {
      await hre.run("verify:verify", {
        address: implAddress,
        constructorArguments: [], // Implementation has no constructor args
      });
      console.log(`✅ Implementation verified on Etherscan`);
    } catch (err) {
      console.error("❌ Etherscan verification failed:", err.message);
    }
  } else {
    console.log(`⚠️ No Etherscan API key for ${network}, skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify({ proxyAddress: proxy.address, implementationAddress: implAddress }));
  }
};

task("deploy-amana-connected-chain-vault", "Deploy the AmanaConnectedChainVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "AmanaConnectedChainVault")
  .addOptionalParam("symbol", "Token symbol", "UV")
  .addParam("asset", "The address of the asset ERC20 token")
  .addParam("registry", "The address of the registry")
  .addParam("gasLimitWithdrawAndCall", "Gas limit for withdrawAndCall function")
  .addParam("gasLimitCall", "Gas limit for Call function")
  .addParam("depositFeePaid", "Deposit fee paid from gas tank")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)");

export default {};
