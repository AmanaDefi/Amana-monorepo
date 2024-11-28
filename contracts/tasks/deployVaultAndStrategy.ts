import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();

const deployVaultAndStrategy = async (args: any, hre: HardhatRuntimeEnvironment) => {
  const network = hre.network.name;

  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    throw new Error(
      `Wallet not found. Please, run "npx hardhat account --save" or set PRIVATE_KEY env variable (for example, in a .env file)`
    );
  }

  // Vault deployment parameters
  const vaultName = args.vaultName || "AmanaVault";
  const vaultSymbol = args.vaultSymbol || "UV";
  const vaultAsset = args.vaultAsset;
  const treasury = args.treasury;
  const gateway = args.gateway;
  const system = args.system;
  const gasTank = args.gasTank;

  const performanceFeeRate = args.performanceFeeRate
    ? parseInt(args.performanceFeeRate, 10)
    : 1500; // Default to 15% (1500 basis points)

  if (isNaN(performanceFeeRate)) {
    throw new Error("🚨 Invalid performanceFeeRate value. It must be a number.");
  }

  if (!vaultAsset || !treasury || !gateway || !system || !gasTank) {
    throw new Error(
      "🚨 Vault parameters are required: asset, treasury, gateway, system, and gas tank addresses."
    );
  }

  // Deploy the vault to the Zetachain testnet
  console.log("Deploying AmanaVault...");
  const vaultFactory = await hre.ethers.getContractFactory("AmanaVault");
  const vault = await hre.upgrades.deployProxy(
    vaultFactory,
    [vaultName, vaultSymbol, vaultAsset, treasury, performanceFeeRate, gateway, system, gasTank],
    { initializer: "initialize" }
  );
  await vault.deployed();

  console.log(`✅ AmanaVault deployed to Zetachain testnet at: ${vault.address}`);

  // Authorize the vault with the gas tank
  console.log(`⚙️ Authorizing vault (${vault.address}) with GasTank (${gasTank})`);
  const gasTankContract = await hre.ethers.getContractAt("GasTank", gasTank);
  const authorizeTx = await gasTankContract.authorizeVault(vault.address);
  await authorizeTx.wait();
  console.log(`✅ Vault authorized with GasTank.`);

  // Strategy deployment parameters
  const strategyName = args.strategyName;
  const strategyContract = args.strategyContract;
  const inputToken = args.inputToken;
  const receiptToken = args.receiptToken;
  const strategyGateway = args.strategyGateway;
  const strategyNetwork = args.strategyNetwork;

  if (!strategyName || !strategyContract || !inputToken || !receiptToken || !strategyGateway || !strategyNetwork) {
    throw new Error(
      "🚨 Strategy parameters are required: name, contract, input token, receipt token, gateway, and target network."
    );
  }

  // Deploy the strategy on the specified network
  console.log(`Deploying strategy (${strategyName}) to ${strategyNetwork}...`);
  const strategyFactory = await hre.ethers.getContractFactory(strategyContract);
  const strategy = await strategyFactory.deploy(
    strategyName,
    vault.address,
    inputToken,
    receiptToken,
    strategyGateway
  );
  await strategy.deployed();

  console.log(`✅ Strategy deployed to ${strategyNetwork} at: ${strategy.address}`);

  // Set the strategy on the vault
  const strategyChainId = await hre.ethers.provider.getNetwork().then((n) => n.chainId);
  console.log(`⚙️ Setting strategy (${strategy.address}) with chain ID (${strategyChainId}) on the vault...`);
  const setStrategyTx = await vault.setStrategy(strategy.address, strategyChainId);
  await setStrategyTx.wait();
  console.log(`✅ Strategy set on the vault.`);

  // Verification
  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🛠 Verifying contracts on ${network} explorer...`);
    try {
      await hre.run("verify:verify", { address: vault.address, constructorArguments: [] });
      console.log(`✅ Vault verified at ${vault.address}`);
    } catch (err) {
      console.error("❌ Vault verification failed:", err);
    }

    try {
      await hre.run("verify:verify", {
        address: strategy.address,
        constructorArguments: [strategyName, vault.address, inputToken, receiptToken, strategyGateway],
      });
      console.log(`✅ Strategy verified at ${strategy.address}`);
    } catch (err) {
      console.error("❌ Strategy verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured. Skipping verification.`);
  }

  if (args.json) {
    console.log(
      JSON.stringify({ vault: vault.address, strategy: strategy.address, strategyChainId }, null, 2)
    );
  }
};

task("deploy-vault-and-strategy", "Deploys an AmanaVault and a strategy, then links them")
  .addFlag("json", "Output in JSON")
  .addOptionalParam("vaultName", "The name of the vault", "AmanaVault")
  .addOptionalParam("vaultSymbol", "The symbol of the vault", "UV")
  .addParam("vaultAsset", "The address of the vault's asset ERC20 token")
  .addParam("treasury", "The address of the treasury")
  .addParam("gateway", "The address of the vault's gateway contract")
  .addParam("system", "The address of the vault's system contract")
  .addParam("gasTank", "The address of the GasTank contract")
  .addOptionalParam("performanceFeeRate", "Performance fee rate in basis points", "1500")
  .addParam("strategyContract", "The name of the strategy contract to deploy")
  .addParam("strategyName", "The name of the strategy")
  .addParam("inputToken", "The address of the input token for the strategy")
  .addParam("receiptToken", "The address of the receipt token for the strategy")
  .addParam("strategyGateway", "The address of the strategy's gateway contract")
  .addParam("strategyNetwork", "The network for deploying the strategy")
  .setAction(deployVaultAndStrategy);

export default {};
