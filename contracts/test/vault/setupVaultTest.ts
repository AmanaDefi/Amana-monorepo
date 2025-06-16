import { ethers, network, upgrades } from "hardhat";
import { Signer } from "ethers";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import { ZC_USDT_BSC_ADDRESS, ZC_USDC_BSC_ADDRESS, ZC_ETH_BASE_ADDRESS } from "../../../constants";
import { setTokenBalance } from "../utils";
import { AmanaConnectedChainVaultV1 } from "../../typechain";
import { vaultTestMatrix } from "../config/vault.config";
import { swap } from "codemelt-retro-api-sdk/functional/api";
import api from "codemelt-retro-api-sdk";
import type { IConnection } from "codemelt-retro-api-sdk"; import axios from "axios";
import { formatUnits } from "ethers/lib/utils";

const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";

export async function setupVaultFixture() {
  const config = vaultTestMatrix[0]; // ⬅️ use just the first config

  const { vaultConfig, strategyConfig, txConfig } = config;
  const FORK_BLOCK_NUMBER = 8736520;
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: "https://zetachain-mainnet.g.allthatnode.com/archive/evm",
          blockNumber: FORK_BLOCK_NUMBER,
        },
      },
    ]
  });

  const [owner, user1, user2] = await ethers.getSigners();

  const otherZRC20 = await ethers.getContractAt("IERC20", txConfig.otherZRC20Input);
  const vaultAsset = await ethers.getContractAt("IERC20", vaultConfig.asset);
  const rewardToken = await ethers.getContractAt("IERC20", vaultConfig.rewardToken);
  const originZRC20Input = await ethers.getContractAt(
    "IERC20",
    txConfig.originZRC20Input
  );

  let gatewaySigner = await setupGatewaySigner();

  const gatewayZEVM = await ethers.getContractAt(
    GatewayZEVMABI.abi,
    ZEVM_GATEWAY_ADDRESS
  );

  const pythContract = await ethers.getContractAt("contracts/interfaces/IPyth.sol:IPyth", PYTH_CONTRACT_ADDRESS, owner);


  console.info("🔧 Starting Deployments...");

  const treasury = await deployAndLog("Treasury", [owner.address]);
  const withdrawalReceiver = await deployAndLog("WithdrawalReceiver", [owner.address])
  const priceOracle = await deployAndLog("PriceOracle", [PYTH_CONTRACT_ADDRESS]);
  const SwapHelperFactory = await ethers.getContractFactory("SwapHelperZetachain", owner);

  const swapHelper = await upgrades.deployProxy(
    SwapHelperFactory,
    [
      priceOracle.address
    ],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await swapHelper.deployed();
  console.log("✅ SwapHelperZetachain deployed at:", swapHelper.address);
  const gasTank = await deployAndLog("GasTank", []);
  const withdrawHelper = await deployAndLog("WithdrawHelper", [ZEVM_GATEWAY_ADDRESS]);
  const zapContract = await deployAndLog("ZapContract", [], owner);
  const amanaRegistry = await deployAndLog("AmanaRegistry", [
    gasTank.address,
    treasury.address,
    withdrawHelper.address,
    withdrawalReceiver.address, // ,
    swapHelper.address,
    zapContract.address,
  ]);
  await zapContract.updateRegistryAddress(amanaRegistry.address);

  const Vault = await ethers.getContractFactory("AmanaConnectedChainVaultV1", owner);
  console.log("About to deploy vault");
  const amanaVault: AmanaConnectedChainVaultV1 = await upgrades.deployProxy(
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
  console.log(`AmanaConnectedChainVaultV1 deployed at: ${amanaVault.address}`);

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
  const depositSwapData = await getBeamSwapData(txConfig.originZRC20Input, vaultConfig.asset);
  const withdrawSwapData = await getBeamSwapData(vaultConfig.asset, txConfig.originZRC20Input);

  console.log("Setup done, returning values")
  return {
    amanaVault,
    withdrawHelper,
    amanaRegistry,
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
    depositSwapData,
    withdrawSwapData,
    originZRC20Input
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

const beamConnection: IConnection = {
  host: "https://public-beam-backend-mainnet.codemelt.codes",
  headers: {
    "x-api-key": process.env.BEAM_API_KEY!,
  },
};

const getBeamTokenId = async (tokenAddress: string): Promise<number | null> => {
  try {
    const response = await api.functional.api.currency.partners.getPartners(
      beamConnection,
      "7000"
    );

    const data = response.data as {
      data: { address: string; id: number }[];
    };

    const token = data.data.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.id ?? null;
  } catch (err) {
    console.error("Failed to fetch token ID:", err);
    return null;
  }
};

export async function getBeamSwapData(inputToken: string, outputToken: string) {

  const config = vaultTestMatrix[0];
  const { txConfig } = config;

  // const inputToken = txConfig.originZRC20Input;
  // const outputToken = vaultConfig.asset;
  const userAddress = "0x1111111111111111111111111111111111111111";

  const [inputTokenId, outputTokenId] = await Promise.all([
    getBeamTokenId(inputToken),
    getBeamTokenId(outputToken),
  ]);

  if (inputTokenId == null || outputTokenId == null) {
    console.error("❌ Missing token ID for input or output token");
    return;
  }

  const swapDetails: swap.native.getSwapData.Input = {
    tokenAId: inputTokenId,
    tokenBId: outputTokenId,
    slippage: 500,
    amount: formatUnits(txConfig.crossChainDepositAmount1, txConfig.originERC20InputDecimals),
    sender: userAddress,
    recipient: userAddress,
  };

  try {
    console.log("📡 Requesting Beam swap data...");
    const response = await swap.native.getSwapData(beamConnection, swapDetails);
    const path: string[] = response.data?.data?.path;

    if (!Array.isArray(path) || path.length < 2) {
      throw new Error("Invalid or missing swap path from Beam");
    }

    const encodedPath = ethers.utils.solidityPack(
      Array(path.length).fill("address"),
      path
    );

    return encodedPath;
  } catch (err: any) {
    console.error("❌ Failed to fetch swap data:", err.message);
  }
}
