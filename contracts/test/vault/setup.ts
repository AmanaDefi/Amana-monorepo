import { ethers, network, upgrades } from "hardhat";
import { Signer, BigNumber } from "ethers";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import { ZC_USDT_BSC_ADDRESS, ZC_BNB_BSC_ADDRESS, ZC_USDC_BSC_ADDRESS, ZC_ETH_ETH_ADDRESS, ZC_ETH_BASE_ADDRESS } from "../../../constants";
import { setTokenBalance } from "../utils";
import { AmanaConnectedChainVault } from "../../typechain";

const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
const VAULT_ASSET = ZC_USDT_BSC_ADDRESS;
const GAS_LIMIT_FOR_WITHDRAW_AND_CALL = 300000;
const GAS_LIMIT_FOR_CALL = 300000;
const FEE_RATE = 1000;
const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
const STRATEGY_GAS_TOKEN = ZC_BNB_BSC_ADDRESS;
const ORIGIN_CHAIN_GAS_TOKEN = ZC_ETH_ETH_ADDRESS;
const ORIGIN_CHAIN_ZRC20_INPUT = ZC_ETH_ETH_ADDRESS;
const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43"; // Replace with your Pyth contract address

export async function setupVaultFixture() {
  const FORK_BLOCK_NUMBER = 7624477;
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
  const vaultAsset = await ethers.getContractAt("IERC20", VAULT_ASSET);
  const usdcBSC = await ethers.getContractAt("IERC20", ZC_USDC_BSC_ADDRESS);

  let gatewaySigner = await setupGatewaySigner();

  const gatewayZEVM = await ethers.getContractAt(
    GatewayZEVMABI.abi,
    ZEVM_GATEWAY_ADDRESS
  );

  const pythContract = await ethers.getContractAt("contracts/interfaces/IPyth.sol:IPyth", PYTH_CONTRACT_ADDRESS, owner);


  console.info("🔧 Starting Deployments...");

  const treasury = await deployAndLog("Treasury", [owner.address]);
  const withdrawalReceiver = await deployAndLog("WithdrawalReceiver", [])
  const swapHelper = await deployAndLog("SwapHelper", []);
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
  const amanaVault: AmanaConnectedChainVault = await upgrades.deployProxy(
    Vault,
    [
      "AaveV3EthVault",
      "AVU",
      VAULT_ASSET,
      amanaRegistry.address,
      FEE_RATE,
      GAS_LIMIT_FOR_WITHDRAW_AND_CALL,
      GAS_LIMIT_FOR_CALL,
      false,
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await amanaVault.deployed();
  console.log(`AmanaConnectedChainVault deployed at: ${amanaVault.address}`);

  await gasTank.authorizeVault(amanaVault.address);
  console.log(`Vault authorized with GasTank.`);

  await gasTank.authorizeVault(withdrawHelper.address);
  console.log(`WithdrawHelper authorized with GasTank.`);

  await amanaVault.setStrategy(STRATEGY_ADDRESS);

  const depositAmount1 = ethers.utils.parseUnits("100", 18);
  const depositAmount2 = ethers.utils.parseUnits("50", 18);

  const rewardAmount = BigNumber.from(1000); // Example reward amount

  await setTokenBalance(STRATEGY_GAS_TOKEN, gasTank.address, depositAmount1.mul(20).div(1), 3);
  await setTokenBalance(ORIGIN_CHAIN_GAS_TOKEN, gasTank.address, depositAmount1.mul(20000).div(1), 3);

  await setTokenBalance(VAULT_ASSET, await owner.getAddress(), depositAmount1.mul(20).div(1), 3);
  await setTokenBalance(ORIGIN_CHAIN_ZRC20_INPUT, await owner.getAddress(), depositAmount1.mul(200).div(1), 3);
  await setTokenBalance(ZC_USDC_BSC_ADDRESS, await owner.getAddress(), depositAmount1.mul(200).div(1), 3);

  return {
    amanaVault,
    owner,
    user1,
    user2,
    depositAmount1,
    depositAmount2,
    rewardAmount,
    gasTank,
    swapHelper,
    zapContract,
    gatewaySigner,
    withdrawZRC20: ZC_USDT_BSC_ADDRESS,
    vaultAsset,
    otherZRC20,
    usdcBSC,
    pythContract,
    gatewayZEVM
  };
}

async function setupGatewaySigner(): Promise<Signer> {
  try {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ZEVM_GATEWAY_ADDRESS],
    });
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
