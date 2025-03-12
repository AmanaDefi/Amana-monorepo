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

  // Fetch deployment parameters
  const name = args.name || "AmanaZetachainVault";
  const symbol = args.symbol || "ZVU";
  const asset = args.asset;
  const treasury = args.treasury;
  const gasTank = args.gastank;
  const receiver = args.receiver;
  const swapHelper = args.swapHelper;
  const withdrawHelper = args.withdrawHelper;
  const gasLimitWithdrawAndCall = args.gasLimitWithdrawAndCall;
  const gasLimitCall = args.gasLimitCall;

  // Default performance fee if not provided
  const performanceFeeRate = args.performanceFeeRate ?? 1500;

  if (!asset || !treasury || !gasTank || !receiver || !withdrawHelper || !swapHelper) {
    throw new Error(
      "🚨 Asset address, Treasury address, GasTank address, WithdrawalReceiver address, WithdrawHelper address, and SwapHelper address are required."
    );
  }

  console.log(`🔑 Deploying with signer: ${signer.address}`);

  // Deploy the AmanaZetachainVault contract
  const factory = await hre.ethers.getContractFactory("AmanaZetachainVault", signer);

  const vaultContract = await factory.deploy(
    name,
    symbol,
    asset,
    treasury,
    performanceFeeRate,
    gasTank,
    receiver,
    swapHelper,
    withdrawHelper,
    gasLimitWithdrawAndCall,
    gasLimitCall
  );

  console.log(`🚀 Deploying AmanaZetachainVault...`);
  await vaultContract.deployed();
  console.log(`✅ AmanaZetachainVault deployed at: ${vaultContract.address}`);

  // Authorize the vault with the GasTank
  console.log(`⚙️ Authorizing the vault with the GasTank at ${gasTank}`);
  const gasTankContract = await hre.ethers.getContractAt("GasTank", gasTank);
  const tx = await gasTankContract.authorizeVault(vaultContract.address);
  await tx.wait();
  console.log(`✅ Vault authorized with GasTank.`);

  // Etherscan verification
  const etherscanApiKey = hre.config.etherscan.apiKey[network];
  if (etherscanApiKey) {
    console.log(`🔍 Verifying contract on Etherscan...`);
    try {
      await hre.run("verify:verify", {
        address: vaultContract.address,
        constructorArguments: [
          name,
          symbol,
          asset,
          treasury,
          performanceFeeRate,
          gasTank,
          receiver,
          swapHelper,
          withdrawHelper,
          gasLimitWithdrawAndCall,
          gasLimitCall,
        ],
      });
      console.log(`✅ Successfully verified contract on Etherscan`);
    } catch (err) {
      console.error("❌ Etherscan verification failed:", err);
    }
  } else {
    console.log(`🚨 Etherscan API key not configured for ${network}. Skipping verification.`);
  }

  if (args.json) {
    console.log(JSON.stringify({ contractAddress: vaultContract.address }));
  }
};

task("deploy-amana-zetachain-vault", "Deploy the AmanaZetachainVault contract", main)
  .addFlag("json", "Output in JSON")
  .addOptionalParam("name", "Token name", "AmanaZetachainVault")
  .addOptionalParam("symbol", "Token symbol", "ZVU")
  .addParam("asset", "The address of the asset ERC20 token")
  .addParam("treasury", "The address of the treasury")
  .addParam("gastank", "The address of the GasTank contract")
  .addParam("receiver", "The address of the WithdrawalReceiver contract on connected chains")
  .addParam("withdrawHelper", "The address of the WithdrawHelper contract")
  .addParam("swapHelper", "The address of the SwapHelper contract")
  .addParam("gasLimitWithdrawAndCall", "Gas limit for withdrawAndCall function")
  .addParam("gasLimitCall", "Gas limit for Call function")
  .addOptionalParam("performanceFeeRate", "Performance fee rate (basis points)");

// Export the task
export default {};
