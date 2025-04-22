import { ethers, network, upgrades } from "hardhat";
import { Signer } from "ethers";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import { ZC_USDT_BSC_ADDRESS, ZC_USDC_BSC_ADDRESS, ZC_ETH_BASE_ADDRESS } from "../../../constants";
import { setTokenBalance } from "../utils";
import { AmanaConnectedChainVault } from "../../typechain";
import { vaultTestMatrix } from "../config/vault.config";

const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";

export async function setupVaultFixture() {
  const config = vaultTestMatrix[0]; // ⬅️ use just the first config

  const { vaultConfig, strategyConfig, txConfig } = config;
  const FORK_BLOCK_NUMBER = 7997959;
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://zetachain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
          blockNumber: FORK_BLOCK_NUMBER,
        },
      },
    ]
  });

  const [owner, user1, user2] = await ethers.getSigners();

  const otherZRC20 = await ethers.getContractAt("IERC20", ZC_ETH_BASE_ADDRESS);
  const vaultAsset = await ethers.getContractAt("IERC20", vaultConfig.asset);
  const rewardToken = await ethers.getContractAt("IERC20", vaultConfig.rewardToken);

  let gatewaySigner = await setupGatewaySigner();

  const gatewayZEVM = await ethers.getContractAt(
    GatewayZEVMABI.abi,
    ZEVM_GATEWAY_ADDRESS
  );

  const pythContract = await ethers.getContractAt("contracts/interfaces/IPyth.sol:IPyth", PYTH_CONTRACT_ADDRESS, owner);


  console.info("🔧 Starting Deployments...");

  const treasury = await deployAndLog("Treasury", [owner.address]);
  const withdrawalReceiver = await deployAndLog("WithdrawalReceiver", [])
  const priceOracle = await deployAndLog("PriceOracle", [PYTH_CONTRACT_ADDRESS]);
  const swapHelper = await deployAndLog("SwapHelper", [priceOracle.address], owner);
  const gasTank = await deployAndLog("GasTank", []);
  const withdrawHelper = await deployAndLog("WithdrawHelper", [ZEVM_GATEWAY_ADDRESS]);
  const zapContract = await deployAndLog("ZapContract", [swapHelper.address], owner);
  const amanaRegistry = await deployAndLog("AmanaRegistry", [
    gasTank.address,
    treasury.address,
    withdrawHelper.address,
    withdrawalReceiver.address,
    swapHelper.address,
    zapContract.address,
  ]);

  const Vault = await ethers.getContractFactory("AmanaConnectedChainVault", owner);
  console.log("About to deploy vault");
  const amanaVault: AmanaConnectedChainVault = await upgrades.deployProxy(
    Vault,
    [
      vaultConfig.name,
      vaultConfig.symbol,
      vaultConfig.asset,
      amanaRegistry.address,
      vaultConfig.feeRate,
      vaultConfig.gasLimitWithdrawAndCall,
      vaultConfig.gasLimitCall,
      vaultConfig.gasPaidFromTank,
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  console.log("Vault deployed, waiting for confirmation");
  await amanaVault.deployed();
  console.log(`AmanaConnectedChainVault deployed at: ${amanaVault.address}`);

  await gasTank.authorizeVault(amanaVault.address);
  console.log(`Vault authorized with GasTank.`);

  await gasTank.authorizeVault(withdrawHelper.address);
  console.log(`WithdrawHelper authorized with GasTank.`);

  await amanaVault.setStrategy(strategyConfig.address);

  // supply the gas tank with the gasToken of the strategy contract chain, to fund deposits
  await setTokenBalance(strategyConfig.gasToken, gasTank.address, txConfig.gasTankAmount, 3);
  // supply the gas tank with the gasToken of the origin chain, to fund withdrawals
  await setTokenBalance(txConfig.originGasToken, gasTank.address, txConfig.gasTankAmount, 3);

  // supply the owner address with an amount of vault asset, so they can make deposits
  await setTokenBalance(vaultConfig.asset, await owner.getAddress(), txConfig.directDepositAmount1.mul(20).div(1), 3);
  // supply the owner address with an amount of origin chain input ZRC20 token, so they can make deposits
  await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
  await setTokenBalance(ZC_USDC_BSC_ADDRESS, await owner.getAddress(), txConfig.directDepositAmount1.mul(200).div(1), 3);
  console.log("Setup done, returning values")
  return {
    amanaVault,
    owner,
    user1,
    user2,
    gasTank,
    swapHelper,
    zapContract,
    gatewaySigner,
    vaultAsset,
    rewardToken,
    otherZRC20,
    pythContract,
    gatewayZEVM,
    vaultConfig,
    strategyConfig,
    txConfig,
  };
}

async function setupGatewaySigner(): Promise<Signer> {
  try {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ZEVM_GATEWAY_ADDRESS],
    });
    // fund the gateway signer with some ETH
    await network.provider.send("hardhat_setBalance", [
      ZEVM_GATEWAY_ADDRESS,
      ethers.utils.parseEther("10").toHexString(),
    ]);
    return ethers.getSigner(ZEVM_GATEWAY_ADDRESS);
  } catch (err) {
    throw new Error("Failed to impersonate gateway signer: " + err);
  }
}

async function deployAndLog(name: string, factoryArgs: any[] = [], signer?: Signer) {
  const factory = signer
    ? await ethers.getContractFactory(name, signer)
    : await ethers.getContractFactory(name);
  const contract = await factory.deploy(...factoryArgs);
  await contract.deployed();
  console.log(`${name} deployed at: ${contract.address}`);
  return contract;
}
