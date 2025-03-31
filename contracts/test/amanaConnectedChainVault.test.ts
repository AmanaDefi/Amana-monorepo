// This test simulates a vault with ETH.ETH as the vault assets
// Cross chain deposits and withdrawals are simulated to be coming from Base

import { ethers, network, upgrades } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaConnectedChainVault, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import dotenv from "dotenv";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import { generateTransactionId } from "./utils";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

dotenv.config();

import {
  ZC_ETH_BASE_ADDRESS,
  ZC_ETH_ETH_ADDRESS,
  ZC_USDC_BSC_ADDRESS,
  ZC_USDC_ETH_ADDRESS,
  ZC_SOL_SOL_ADDRESS,
  ZC_USDT_BSC_ADDRESS,
  ZC_BNB_BSC_ADDRESS,
  ZC_USDT_ETH_ADDRESS,
  ETH_USDT_ADDRESS
} from "../../constants";

describe("AmanaConnectedChainVault Tests", function () {

  let amanaVault: AmanaConnectedChainVault;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let gatewaySigner: Signer;
  let otherZRC20: IERC20;
  let vaultAsset: IERC20;
  let usdcBSC: IERC20;
  let withdrawZRC20: string;

  const PYTH_CONTRACT_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43"; // Replace with your Pyth contract address
  const PRICE_FEED_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD price feed ID
  const HERMES_ENDPOINT = `https://hermes.pyth.network/api/latest_vaas?ids[]=${PRICE_FEED_ID}`;

  const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
  const VAULT_ASSET = ZC_USDT_BSC_ADDRESS;
  const FEE_RATE = 1000;
  const ZC_CHAIN_ID = 7000;
  const ORIGIN_CHAIN_ID = 1; // where the deposit/withdrawal originated from
  const ORIGIN_CHAIN_GAS_TOKEN = ZC_ETH_ETH_ADDRESS;
  const ORIGIN_CHAIN_ZRC20_INPUT = ZC_ETH_ETH_ADDRESS;
  const ORIGIN_CHAIN_ERC20_INPUT = ethers.constants.AddressZero;

  const WITHDRAWAL_RECEIVER = "0xD2f84247ac3462cD52cb380fda0d95D19501e130";
  const INPUT_TOKEN = ethers.constants.AddressZero;
  const FORK_BLOCK_NUMBER = 7624477;
  // const SWAP_HELPER_ADDRESS = "0x1968643f36ad81a2756Dba0C4Dfe948bBa957A72";
  const UNISWAP_V3_ROUTER = "0x9b30cfbacd3504252f82263f72d6acf62bf733c2";

  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
  const STRATEGY_CHAIN_ID = 56;
  const STRATEGY_GAS_TOKEN = ZC_BNB_BSC_ADDRESS;

  const OTHER_ZRC20 = ZC_ETH_BASE_ADDRESS;

  const GAS_LIMIT_FOR_WITHDRAW_AND_CALL = 300000;
  const GAS_LIMIT_FOR_CALL = 300000;

  const SECOND_STRATEGY_ADDRESS = "0xFFcB9E833403c311f99d4f2E32Cdf61d4Eb0695f";

  const ERROR_MARGIN = ethers.utils.parseUnits("0.00015", 18);

  async function setupGatewaySigner() {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ZEVM_GATEWAY_ADDRESS],
    });

    gatewaySigner = await ethers.getSigner(ZEVM_GATEWAY_ADDRESS);

    await network.provider.send("hardhat_setBalance", [
      ZEVM_GATEWAY_ADDRESS,
      ethers.utils.parseEther("10").toHexString(),
    ]);
  }

  before(async () => {
  });

  async function updatePythPrices(pythContract: any, signer: Signer): Promise<void> {

    const connection = new PriceServiceConnection("https://hermes.pyth.network", {
      priceFeedRequestConfig: {
        // Provide this option to retrieve signed price updates for on-chain contracts.
        // Ignore this option for off-chain use.
        binary: true,
      },
    }); // See Hermes endpoints section below for other endpoints

    const priceIds = [
      "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD price id
      "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472", // POL/USD price id
      "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", // BNB/USD price id
      "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe", // ZETA/USD price id
      "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // SOL/USD price id
    ];

    // Fetch price updates
    const priceUpdateDataBase64 = await connection.getLatestVaas(priceIds);

    if (!priceUpdateDataBase64 || priceUpdateDataBase64.length === 0) {
      throw new Error("No price updates available from Hermes");
    }

    // Decode base64 data into binary (Buffer)
    const priceUpdateData: Uint8Array[] = priceUpdateDataBase64.map((data) =>
      Buffer.from(data, "base64")
    );

    const updateFee = await pythContract.getUpdateFee(priceUpdateData);
    const tx = await pythContract
      .connect(signer)
      .updatePriceFeeds(priceUpdateData, { value: updateFee });

    const receipt = await tx.wait();
  }

  async function simulateDepositCallFromEthereum(
    user: Signer,
    depositAmount: BigNumber,
    pythContract: any
  ): Promise<`0x${string}`> {
    // Update Pyth prices
    // await updatePythPrices(pythContract, user);

    // Set token balance for the vault
    await setTokenBalance(ORIGIN_CHAIN_ZRC20_INPUT, amanaVault.address, depositAmount, 3);
    const minSharesOut = 0 // depositAmount.mul(1000).div(1001);
    const slippage = 10000;

    // Generate a transaction ID using your generateTransactionId function
    const transactionId = generateTransactionId(await user.getAddress(), 8453);

    // Encode the deposit message
    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "uint16", "bytes32"],
      [INPUT_TOKEN, minSharesOut, slippage, transactionId]
    );
    // Execute the onCall function to simulate a deposit
    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ORIGIN_CHAIN_ZRC20_INPUT,
      depositAmount,
      depositMessage
    );

    // Return the transaction ID
    return transactionId;
  }


  async function simulateConfirmDeposit(
    user: Signer,
    depositAmount: any,
    totalAssetsBefore: any,
    executionNonce: any,
    crossChainTxId: any
  ): Promise<void> {
    const depositAmountBN = BigNumber.from(depositAmount);
    const totalAssetsBeforeBN = BigNumber.from(totalAssetsBefore);

    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
      [ethers.constants.AddressZero, await user.getAddress(), ethers.constants.AddressZero, ethers.constants.AddressZero, depositAmount, 0, 0, true, totalAssetsBeforeBN.add(depositAmountBN), executionNonce, crossChainTxId, 0]
    );

    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      STRATEGY_GAS_TOKEN,
      0,
      confirmMessage
    );
  }

  async function simulateConfirmSwitch(
    transferredAmount: any,
    newStrategyAddress: any,
    executionNonce: any,
    crossChainTxId: any
  ): Promise<any> {
    const transferredAmountBN = BigNumber.from(transferredAmount);

    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
      [ethers.constants.AddressZero, ethers.constants.AddressZero, newStrategyAddress, ethers.constants.AddressZero, transferredAmount, 0, 0, true, transferredAmountBN, executionNonce, crossChainTxId, 0]
    );

    const tx = await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: newStrategyAddress,
        chainID: STRATEGY_CHAIN_ID,
      },
      STRATEGY_GAS_TOKEN,
      0,
      confirmMessage
    );
    return tx;
  }

  async function simulateConfirmAssetUpdate(
    totalAssetsAmount: any,
  ): Promise<any> {

    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
      [ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, 0, false, totalAssetsAmount, 0, 0, 0]
    );

    const tx = await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      STRATEGY_GAS_TOKEN,
      0,
      confirmMessage
    );
    return tx;
  }

  async function simulateWithdrawCallFromEthereum(
    user: Signer,
    sharesToWithdraw: BigNumber,
    pythContract: any
  ): Promise<void> {
    // await updatePythPrices(pythContract, user);
    const minAmountOut = sharesToWithdraw.mul(1000).div(1001);
    const slippage = 10000;
    const transactionId = generateTransactionId(await user.getAddress(), 8453)

    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes32"],
      [ORIGIN_CHAIN_ZRC20_INPUT, ethers.constants.AddressZero, sharesToWithdraw, minAmountOut, slippage, transactionId]
    );

    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ORIGIN_CHAIN_GAS_TOKEN,
      0,
      withdrawMessage
    )
  }

  async function simulateConfirmWithdrawToEthereum(
    user: Signer,
    withdrawnAmount: BigNumber,
    fractionOfTotalShares: BigNumber,
    totalAssetsBefore: BigNumber,
    executionNonce: number,
    crossChainTxId: number
  ): Promise<any> {
    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
      [
        await user.getAddress(),
        await user.getAddress(),
        ORIGIN_CHAIN_ZRC20_INPUT,
        ORIGIN_CHAIN_ERC20_INPUT,
        withdrawnAmount,
        fractionOfTotalShares,
        ORIGIN_CHAIN_ID,
        false,
        totalAssetsBefore.sub(withdrawnAmount),
        executionNonce,
        crossChainTxId,
        10000
      ]
    );

    // Mock token balance setup for the test environment
    await setTokenBalance(VAULT_ASSET, amanaVault.address, withdrawnAmount, 3);

    // Return the transaction object so it can be awaited or used in tests
    return await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      VAULT_ASSET,
      withdrawnAmount,
      confirmMessage
    );
  }

  async function simulateConfirmDirectWithdraw(
    user: Signer,
    withdrawnAmount: BigNumber,
    fractionOfTotalShares: BigNumber,
    totalAssetsBefore: BigNumber,
    executionNonce: number,
    crossChainTxId: number
  ): Promise<any> {
    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
      [
        await user.getAddress(),
        await user.getAddress(),
        VAULT_ASSET,
        VAULT_ASSET,
        withdrawnAmount,
        fractionOfTotalShares,
        ZC_CHAIN_ID,
        false,
        totalAssetsBefore.sub(withdrawnAmount),
        executionNonce,
        crossChainTxId,
        500
      ]
    );

    // Mock token balance setup for the test environment
    await setTokenBalance(VAULT_ASSET, amanaVault.address, withdrawnAmount, 3);

    // Return the transaction object so it can be awaited or used in tests
    return await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      VAULT_ASSET,
      withdrawnAmount,
      confirmMessage
    );
  }

  async function simulateConfirmRedeemToAnyToken(
    user: Signer,
    withdrawZRC20: string,
    withdrawnAmount: BigNumber,
    fractionOfTotalShares: BigNumber,
    totalAssetsBefore: BigNumber,
    executionNonce: number,
    crossChainTxId: number
  ): Promise<any> {
    const confirmMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
      [
        await user.getAddress(),
        await user.getAddress(),
        withdrawZRC20,
        withdrawZRC20,
        withdrawnAmount,
        fractionOfTotalShares,
        ZC_CHAIN_ID,
        false,
        totalAssetsBefore.sub(withdrawnAmount),
        executionNonce,
        crossChainTxId,
        500
      ]
    );

    // Mock token balance setup for the test environment
    await setTokenBalance(VAULT_ASSET, amanaVault.address, withdrawnAmount, 3);

    // Return the transaction object so it can be awaited or used in tests
    return await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      VAULT_ASSET,
      withdrawnAmount,
      confirmMessage
    );
  }

  async function setup() {
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

    [owner, user1, user2] = await ethers.getSigners();
    const pythContract = await ethers.getContractAt("contracts/interfaces/IPyth.sol:IPyth", PYTH_CONTRACT_ADDRESS, owner);
    // await updatePythPrices(pythContract, owner);

    otherZRC20 = await ethers.getContractAt("IERC20", ZC_ETH_BASE_ADDRESS);
    vaultAsset = await ethers.getContractAt("IERC20", VAULT_ASSET);
    usdcBSC = await ethers.getContractAt("IERC20", ZC_USDC_BSC_ADDRESS);

    await setupGatewaySigner();

    withdrawZRC20 = ORIGIN_CHAIN_ZRC20_INPUT;

    const gatewayZEVM = await ethers.getContractAt(
      GatewayZEVMABI.abi,
      ZEVM_GATEWAY_ADDRESS
    );

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(await owner.getAddress());
    await treasury.deployed();

    const WithdrawalReceiver = await ethers.getContractFactory("WithdrawalReceiver");
    const withdrawalReceiver = await WithdrawalReceiver.deploy();
    await withdrawalReceiver.deployed();

    const SwapHelper = await ethers.getContractFactory("SwapHelper");
    const swapHelper = await SwapHelper.deploy();
    await swapHelper.deployed();

    const GasTank = await ethers.getContractFactory("GasTank");
    const gasTank = await GasTank.deploy();
    await gasTank.deployed();

    const WithdrawHelper = await ethers.getContractFactory("WithdrawHelper");
    const withdrawHelper = await WithdrawHelper.deploy(ZEVM_GATEWAY_ADDRESS, gasTank.address);
    await withdrawHelper.deployed();

    const ZapContract = await ethers.getContractFactory("ZapContract", owner);
    const zapContract = await ZapContract.deploy(swapHelper.address);
    await zapContract.deployed();

    const AmanaRegistry = await ethers.getContractFactory("AmanaRegistry");
    const amanaRegistry = await AmanaRegistry.deploy(
      gasTank.address,
      treasury.address,
      withdrawHelper.address,
      withdrawalReceiver.address,
      swapHelper.address,
      zapContract.address,
    );
    await amanaRegistry.deployed();

    const Vault = await ethers.getContractFactory("AmanaConnectedChainVault", owner);

    amanaVault = await upgrades.deployProxy(
      Vault,
      [
        "AaveV3EthVault",                  // Vault name
        "AVU",                             // Symbol
        VAULT_ASSET,                       // Vault asset
        amanaRegistry.address,
        FEE_RATE,                          // Performance fee rate
        GAS_LIMIT_FOR_WITHDRAW_AND_CALL,   // Gas limit for withdraw and call
        GAS_LIMIT_FOR_CALL                 // Gas limit for call
      ],
      {
        initializer: "initialize",
        kind: "uups"
      }
    );

    await amanaVault.deployed();

    await gasTank.authorizeVault(amanaVault.address);

    await gasTank.authorizeVault(withdrawHelper.address);

    await amanaVault.setStrategy(STRATEGY_ADDRESS);

    const depositAmount1 = ethers.utils.parseUnits("100", 18);
    const depositAmount2 = ethers.utils.parseUnits("50", 18);

    const rewardAmount = BigNumber.from(1000); // Example reward amount

    await setTokenBalance(STRATEGY_GAS_TOKEN, gasTank.address, depositAmount1.mul(20).div(1), 3);
    await setTokenBalance(ORIGIN_CHAIN_GAS_TOKEN, gasTank.address, depositAmount1.mul(20000).div(1), 3);

    await setTokenBalance(VAULT_ASSET, await owner.getAddress(), depositAmount1.mul(20).div(1), 3);
    await setTokenBalance(ORIGIN_CHAIN_ZRC20_INPUT, await owner.getAddress(), depositAmount1.mul(200).div(1), 3);
    await setTokenBalance(ZC_USDC_BSC_ADDRESS, await owner.getAddress(), depositAmount1.mul(200).div(1), 3);

    return { owner, user1, user2, pythContract, depositAmount1, depositAmount2, rewardAmount, otherZRC20, vaultAsset, usdcBSC, amanaVault, gatewayZEVM, withdrawZRC20, zapContract };
  }

  describe("Cross-Chain Deposit and Withdraw Workflow", function () {
    it("should correctly initialize the vault", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      expect(await amanaVault.name()).to.equal("AaveV3EthVault");
      expect(await amanaVault.symbol()).to.equal("AVU");
      expect(await amanaVault.asset()).to.equal(VAULT_ASSET);
      expect(await amanaVault.owner()).to.equal(await owner.getAddress());
      expect(await amanaVault.perfFee()).to.equal(FEE_RATE);
    });

    // it("should be upgradeable", async () => {
    //   const implBefore = await getImplementationAddress(
    //     ethers.provider,
    //     amanaVault.address
    //   );

    //   const VaultV2 = await ethers.getContractFactory("AmanaConnectedChainVault");
    //   const upgraded = await upgrades.upgradeProxy(amanaVault.address, VaultV2);
    //   await upgraded.deployed();
    //   console.log("Upgraded to:", upgraded.address);

    //   const implAfter = await getImplementationAddress(
    //     ethers.provider,
    //     upgraded.address
    //   );

    //   expect(implAfter).to.not.equal(implBefore);
    // });

    it("should reject unauthorized access to setStrategy", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      await expect(
        amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should execute a basic direct deposit", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

      await setTokenBalance(VAULT_ASSET, await user1.getAddress(), depositAmount1, 3);

      await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      const minSharesOut = depositAmount1.mul(1000).div(1001);
      await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount1, ERROR_MARGIN);
    });

    it("should execute a ZapContract deposit with ERC20", async function () {
      const { user1, depositAmount1, amanaVault, otherZRC20, zapContract } = await loadFixture(setup);
      const minSharesOut = 0; // depositAmount1.mul(1000).div(1100);
      const depositAmount3 = ethers.utils.parseUnits("1", 18);
      await setTokenBalance(OTHER_ZRC20, await user1.getAddress(), depositAmount3, 3);

      await otherZRC20.connect(user1).approve(zapContract.address, depositAmount3);
      await expect(zapContract.connect(user1).zapDeposit(OTHER_ZRC20, amanaVault.address, VAULT_ASSET, depositAmount3, minSharesOut, await user1.getAddress(), 10000))
        .to.emit(amanaVault, "CrossChainInvestSent");

      await simulateConfirmDeposit(user1, depositAmount3, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount3, ERROR_MARGIN);
    });

    it("should execute a ZapContract deposit with ZETA", async function () {
      const { user1, depositAmount1, amanaVault, zapContract } = await loadFixture(setup);
      const minSharesOut = 0; // depositAmount1.mul(1000).div(1001);
      const depositAmount3 = ethers.utils.parseUnits("1", 18);

      await expect(zapContract.connect(user1).zapDeposit(ethers.constants.AddressZero, amanaVault.address, VAULT_ASSET, depositAmount3, minSharesOut, await user1.getAddress(), 10000, { value: depositAmount3 }))
        .to.emit(amanaVault, "CrossChainInvestSent");

      await simulateConfirmDeposit(user1, depositAmount3, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount3, ERROR_MARGIN);
    });

    it("should execute a basic cross chain deposit", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);

      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount1, ERROR_MARGIN);
    });

    it("should execute a basic direct withdraw", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](depositAmount1, minAmountOut, await user1.getAddress(), await user1.getAddress());
      let userBalance = await vaultAsset.balanceOf(await user1.getAddress());
      await simulateConfirmDirectWithdraw(user1, depositAmount1, ethers.utils.parseUnits("1", 18), depositAmount1, 2, 2);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());
      userBalance = await vaultAsset.balanceOf(await user1.getAddress());
      expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
      expect(userBalance).to.be.closeTo(depositAmount1, ERROR_MARGIN);
    });

    it("should execute a basic cross chain withdraw", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);

      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());

      await simulateWithdrawCallFromEthereum(user1, totalShares, pythContract);
      await simulateConfirmWithdrawToEthereum(user1, depositAmount1, ethers.utils.parseUnits("1", 18), depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());
      expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    });

    it("should execute a basic direct redeem", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());

      amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress());

      await simulateConfirmDirectWithdraw(user1, depositAmount1, ethers.utils.parseUnits("1", 18), depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    });

    it("should execute a basic direct redeemToAnyToken", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const withdrawToken = ORIGIN_CHAIN_ZRC20_INPUT;
      await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 500);

      await simulateConfirmRedeemToAnyToken(user1, withdrawToken, depositAmount1, ethers.utils.parseUnits("1", 18), depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    });

    it("should execute a basic direct redeemToAnyToken to ZETA", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const userBalance1 = await ethers.provider.getBalance(await user1.getAddress());
      const withdrawToken = ethers.constants.AddressZero;
      await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 10000);
      await simulateConfirmRedeemToAnyToken(user1, withdrawToken, depositAmount1, ethers.utils.parseUnits("1", 18), depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const userBalance2 = await ethers.provider.getBalance(await user1.getAddress());
      expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
      expect(userBalance2).to.be.gt(userBalance1);
    });

    it("should initiate switch to a new strategy successfully", async function () {
      const { amanaVault, owner, gatewayZEVM, user1, depositAmount1, vaultAsset, pythContract } = await loadFixture(setup);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      const newStrategyAddress = ethers.Wallet.createRandom().address;
      const invalidStrategyAddress = ethers.constants.AddressZero;

      // Step 1: Verify ownership restriction
      await expect(
        amanaVault.connect(user1).switchStrategy(newStrategyAddress, 0, 0)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount");

      // Step 2: Validate invalid inputs
      await expect(
        amanaVault.connect(owner).switchStrategy(invalidStrategyAddress, 0, 0)
      ).to.be.revertedWithCustomError(amanaVault, "InvalidAddress");

      const currentStrategy = await amanaVault.strategyAddress();
      await expect(
        amanaVault.connect(owner).switchStrategy(currentStrategy, 0, 0)
      ).to.be.revertedWithCustomError(amanaVault, "InvalidAddress");

      // Step 3: Simulate a deposit by User1, otherwise full strategy switch won't happen (just update)
      // await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user1.getAddress(), depositAmount1.mul(20).div(1), 3);
      // await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);
      await expect(
        amanaVault.connect(owner).switchStrategy(newStrategyAddress, 0, 0)
      )
        .to.emit(gatewayZEVM, "Called");
      // .withArgs(newStrategyAddress);
      await simulateConfirmSwitch(depositAmount1, newStrategyAddress, 2, 2);
      const updatedStrategy = await amanaVault.strategyAddress();

      expect(updatedStrategy).to.equal(newStrategyAddress);
    });

    it("should process a totalAssets update confirmation successfully", async function () {
      const { } = await loadFixture(setup);
      const totalAssetsAmount = ethers.utils.parseUnits("0.1", 18);
      const receipt = await simulateConfirmAssetUpdate(totalAssetsAmount);
      expect(receipt).to.emit(amanaVault, "TotalAssetsUpdated").withArgs(totalAssetsAmount);
    });

    it("should reject unauthorized access to setPerformanceFee", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      const newFeeRate = ethers.BigNumber.from(1500); // 15%
      await expect(amanaVault.connect(user1).setPerformanceFee(newFeeRate))
        .to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());

    });

    it("should update performance fee correctly", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      const newFeeRate = ethers.BigNumber.from(1500); // 15%
      await amanaVault.connect(owner).setPerformanceFee(newFeeRate);

      expect(await amanaVault.perfFee()).to.equal(newFeeRate);
    });

    it("should calculate and deduct the performance fee on withdrawal", async function () {
      const { user1, depositAmount1, amanaVault, vaultAsset, pythContract } = await loadFixture(setup);

      // Step 1: Simulate a deposit by User1
      // await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user1.getAddress(), depositAmount1.mul(20).div(1), 3);
      // await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);
      const initialTotalAssets = depositAmount1;
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      // Step 2: Simulate a deposit by User2
      // await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user2.getAddress(), depositAmount1.mul(20).div(1), 3);
      // await vaultAsset.connect(user2).approve(amanaVault.address, depositAmount1);
      await simulateDepositCallFromEthereum(user2, depositAmount1, pythContract);

      const profit = depositAmount1.div(10); // 10% profit

      // The confirmation from the second deposit shows that user1 has made a profit already
      await simulateConfirmDeposit(user2, depositAmount1, depositAmount1.add(profit), 2, 2);

      const updatedTotalAssets = initialTotalAssets.add(depositAmount1).add(profit);

      // Step 3: Perform a withdrawal and calculate the fee
      const expectedFee = profit.mul(FEE_RATE).div(10000);
      const withdrawAmount = depositAmount1.add(profit); // Withdraw everything except the fee
      const totalSharesUser1 = await amanaVault.balanceOf(await user1.getAddress());
      const sharesToWithdraw = totalSharesUser1;
      const fractionOfTotalShares = sharesToWithdraw
        .mul(ethers.BigNumber.from("1000000000000000000")) // 1e18
        .div(await amanaVault.totalSupply());

      await simulateWithdrawCallFromEthereum(user1, sharesToWithdraw, pythContract);
      await expect(simulateConfirmWithdrawToEthereum(user1, withdrawAmount, fractionOfTotalShares, updatedTotalAssets, 3, 3))
        .to.emit(amanaVault, "PerformanceFeePaid")
        .withArgs(await user1.getAddress(), expectedFee);
    });

    it("should handle emergency withdrawal by the owner", async function () {
      const { amanaVault, owner, otherZRC20 } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await setTokenBalance(OTHER_ZRC20, amanaVault.address, depositAmount, 3);

      const balanceBefore = await otherZRC20.balanceOf(await owner.getAddress());
      await amanaVault.connect(owner).emergencyWithdraw(OTHER_ZRC20);

      const balanceAfter = await otherZRC20.balanceOf(await owner.getAddress());
      expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
    });

    it("should reject unauthorized emergency withdrawal", async function () {
      const { amanaVault, user1, otherZRC20 } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await setTokenBalance(OTHER_ZRC20, amanaVault.address, depositAmount, 3);

      await expect(
        amanaVault.connect(user1).emergencyWithdraw(OTHER_ZRC20)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should correctly handle _crossChainInvest revert during cross-chain deposits", async function () {
      const { user1, amanaVault, pythContract } = await loadFixture(setup);
      const depositAmount = ethers.utils.parseUnits("100", 18);
      const txId = await simulateDepositCallFromEthereum(
        user1,
        depositAmount,
        pythContract
      )
      // Simulate _crossChainInvest reverting
      const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string", "bytes32", "uint256", "address", "address", "address", "uint32"],
        ["_crossChainInvestFailed", txId, depositAmount, await user1.getAddress(), ORIGIN_CHAIN_ZRC20_INPUT, ethers.constants.AddressZero, ORIGIN_CHAIN_ID]
      );

      // the revert will send back some vault asset
      await setTokenBalance(VAULT_ASSET, amanaVault.address, depositAmount.mul(95).div(100), 3);

      await expect(
        amanaVault.connect(gatewaySigner).onRevert({
          sender: STRATEGY_ADDRESS,
          asset: VAULT_ASSET,
          revertMessage: mockRevertMessage,
          amount: 95000000000000000000n,
        })
      ).to.emit(amanaVault, "CrossChainInvestFailed").withArgs(txId);
    });

    it("should reject unauthorized registry updates", async function () {
      const { amanaVault, user1 } = await loadFixture(setup);

      const newRegistryAddress = ethers.Wallet.createRandom().address;
      await expect(
        amanaVault.connect(user1).setRegistry(newRegistryAddress)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should withdraw the maximum amount possible for a user", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);

      await simulateDepositCallFromEthereum(
        user1,
        depositAmount1,
        pythContract
      )
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1)

      // Withdraw the maximum amount
      const maxRedeemAmount = await amanaVault.maxRedeem(await user1.getAddress());
      await simulateWithdrawCallFromEthereum(user1, maxRedeemAmount, pythContract)

      await expect(simulateConfirmWithdrawToEthereum(user1, maxRedeemAmount, ethers.utils.parseUnits("1", 18), depositAmount1, 2, 2))
        .to.emit(amanaVault, "ReturnFundsToUserSent")
        .to.emit(amanaVault, "Withdrawn");
    });

    it("should fail to withdraw more than the user balance", async function () {
      const { user1, depositAmount1, amanaVault, pythContract } = await loadFixture(setup);

      await simulateDepositCallFromEthereum(
        user1,
        depositAmount1, pythContract
      )
      simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      // Attempt to withdraw more than balance
      const excessiveWithdrawAmount = depositAmount1.mul(2); // Double the deposited amount

      await expect(simulateWithdrawCallFromEthereum(user1, excessiveWithdrawAmount, pythContract))
        .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
    });

    it("should update user shares correctly after multiple deposits and withdrawals", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault } = await loadFixture(setup);
      const minSharesOut = depositAmount1.mul(1000).div(1001);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

      await setTokenBalance(VAULT_ASSET, await user1.getAddress(), depositAmount1, 3);

      await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      await setTokenBalance(VAULT_ASSET, await user2.getAddress(), depositAmount2, 3);

      await vaultAsset.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2)["deposit(uint256,uint256,address)"](depositAmount2, minSharesOut, await user2.getAddress());

      const totalDeposits = depositAmount1.add(depositAmount2);
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 2);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());
      // User1 withdraws part of their deposit
      const sharesToWithdraw1 = totalShares.div(2);
      const minAmountOut = sharesToWithdraw1.mul(1000).div(1001);
      await amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"]
        (sharesToWithdraw1, minAmountOut, await user1.getAddress(), await user1.getAddress());

      const fractionOfTotalShares = sharesToWithdraw1
        .mul(ethers.BigNumber.from("1000000000000000000")) // 1e18
        .div(await amanaVault.totalSupply());
      await simulateConfirmDirectWithdraw(user1, depositAmount1.div(2), fractionOfTotalShares, totalDeposits, 3, 3);

      // Validate the remaining shares for User1
      const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
      const expectedShares = totalShares.sub(sharesToWithdraw1);
      expect(remainingShares).to.be.closeTo(expectedShares, ERROR_MARGIN);
    });

    it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);
      const minSharesOut = depositAmount1.mul(1000).div(1001);
      // Step 1: Deposit into the vault
      await setTokenBalance(VAULT_ASSET, await user1.getAddress(), depositAmount1, 3);
      await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      const initialShares = await amanaVault.balanceOf(await user1.getAddress());
      console.log("initialShares", initialShares.toString());
      const initialAssets = await amanaVault.convertToAssets(initialShares);
      expect(initialAssets).to.be.closeTo(depositAmount1, ERROR_MARGIN);
      // Step 2: Perform multiple withdrawals
      const withdrawShareAmounts = [
        initialShares.div(3), // Withdraw 1/3 of the total balance
        initialShares.div(3), // Withdraw another 1/3
        initialShares.sub(initialShares.div(3).mul(2)), // Withdraw the remaining balance
      ];

      let totalAssetsBefore = depositAmount1;
      let executionNonce = 2;
      let crossChainTxId = 2;
      let fractionWithdrawn;
      for (const withdrawShareAmount of withdrawShareAmounts) {
        fractionWithdrawn = withdrawShareAmount.mul(ethers.utils.parseEther("1")).div(await amanaVault.totalSupply());
        if (fractionWithdrawn.gt(ethers.utils.parseEther("1"))) {
          fractionWithdrawn = ethers.utils.parseEther("1");
        }
        // Perform withdrawal
        console.log("withdrawShareAmount", withdrawShareAmount.toString());
        console.log("fractionWithdrawn", fractionWithdrawn.toString());
        await amanaVault.connect(user1).redeemToAnyToken(
          withdrawShareAmount,
          withdrawShareAmount.mul(1000).div(1001),
          await user1.getAddress(),
          await user1.getAddress(),
          VAULT_ASSET,
          500
        );
        await simulateConfirmDirectWithdraw(user1, depositAmount1.div(3), fractionWithdrawn, totalAssetsBefore, executionNonce, crossChainTxId);
        console.log("share balance of user1", (await amanaVault.balanceOf(await user1.getAddress())).toString());
        totalAssetsBefore = totalAssetsBefore.sub(withdrawShareAmount);
        executionNonce++;
        crossChainTxId++;
      }

      // Step 3: Validate final state
      const finalShares = await amanaVault.balanceOf(await user1.getAddress());
      const finalAssets = await amanaVault.totalAssets();

      expect(finalShares).to.equal(0); // User should have no shares left
      expect(finalAssets).to.equal(1); // Vault should only have 1 virtual share left
      console.log("got here")
      // Step 4: Ensure further withdrawals fail
      await expect(
        amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](1, 0, await user1.getAddress(), await user1.getAddress())
      ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
    });

    it("should handle zero balances without errors", async function () {
      const { user1, vaultAsset, amanaVault, pythContract } = await loadFixture(setup);

      // Simulate a withdrawal for a user with zero balance
      const zeroAmount = BigNumber.from(0);
      await expect(amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
        .revertedWithCustomError(amanaVault, "AmountCantBeZero");

      await expect(amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
        .revertedWithCustomError(amanaVault, "AmountCantBeZero");

      await expect(simulateWithdrawCallFromEthereum(user1, zeroAmount, pythContract)).to.be
        .revertedWithCustomError(amanaVault, "AmountCantBeZero");

      // Deposit and then withdraw entire balance
      await vaultAsset.connect(user1).approve(amanaVault.address, zeroAmount);
      await expect(amanaVault.connect(user1)["deposit(uint256,uint256,address)"](zeroAmount, 0, await user1.getAddress()))
        .to.be.revertedWithCustomError(amanaVault, "AmountCantBeZero");
    });

    it("should distribute and claim rewards (time-based)", async function () {
      const { user1, depositAmount1, usdcBSC, amanaVault, owner, pythContract } = await loadFixture(setup);

      // Get the current block timestamp to calculate the reward period
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;

      const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds (10 minutes) later
      const rewardDuration = 3600; // Reward duration: 1 hour (3600 seconds)
      const endTimestamp = startTimestamp + rewardDuration; // End rewards after 1 hour

      const rewardAmount = ethers.utils.parseUnits("1000", 18); // Total rewards to be distributed over the duration

      // Set reward token, reward interval, and reward amount
      await amanaVault.connect(owner).setRewardToken(usdcBSC.address); // Set USDC as the reward token for testing
      await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

      // Simulate deposit for User1
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);

      // Confirm the deposit for User1
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      // Simulate time passing during the reward period
      const halfwayTime = startTimestamp + rewardDuration / 2;
      const secondsToSimulate = halfwayTime - currentTimestamp;
      await ethers.provider.send("evm_increaseTime", [secondsToSimulate]); // Increase time by half of the reward duration
      await ethers.provider.send("evm_mine", []); // Trigger a block to update the blockchain timestamp

      const newBlock = await ethers.provider.getBlock("latest");
      const newTimestamp = newBlock.timestamp;

      // Calculate expected rewards halfway through the campaign
      const expectedRewardPerSecond = rewardAmount.div(BigNumber.from(rewardDuration)); // Reward per second
      const timeElapsed = BigNumber.from(newTimestamp - startTimestamp);
      const expectedReward = expectedRewardPerSecond.mul(timeElapsed);

      await setTokenBalance(ZC_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount, 3); // Set the reward amount

      // User1 should now have accumulated rewards halfway through the campaign
      await amanaVault.connect(user1).claimRewards(await user1.getAddress()); // Claim the rewards

      // Check the rewards balance for User1
      const userRewardBalance = await usdcBSC.balanceOf(await user1.getAddress());
      expect(userRewardBalance).to.be.closeTo(expectedReward, ethers.utils.parseUnits("1", 18)); // Allow a small margin for rounding
    });

    it("should correctly distribute rewards proportional to user shares using precise timestamps", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdcBSC, amanaVault, owner, pythContract } = await loadFixture(setup);

      const rewardAmount = ethers.utils.parseUnits("1000", 18);
      const rewardDuration = 3600; // 1 hour in seconds

      // Set the start and end timestamps explicitly
      const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
      const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds later
      const endTimestamp = startTimestamp + rewardDuration;

      // Set rewards interval
      await amanaVault.connect(owner).setRewardToken(usdcBSC.address);
      await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

      // Set reward token balance
      await setTokenBalance(ZC_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount, 3);

      // Simulate deposits
      await simulateDepositCallFromEthereum(user1, depositAmount1, pythContract);
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 1);

      await simulateDepositCallFromEthereum(user2, depositAmount2, pythContract);
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 2);

      // Move to halfway through the rewards duration
      const halfwayTimestamp = startTimestamp + rewardDuration / 2;
      await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply the new timestamp

      // Calculate expected rewards
      const totalSupply = await amanaVault.totalSupply();
      const elapsedRewardAmount = rewardAmount.mul(halfwayTimestamp - startTimestamp).div(rewardDuration);

      const user1Shares = await amanaVault.balanceOf(await user1.getAddress());
      const user2Shares = await amanaVault.balanceOf(await user2.getAddress());
      const user1ExpectedRewards = user1Shares.mul(elapsedRewardAmount).div(totalSupply);
      const user2ExpectedRewards = user2Shares.mul(elapsedRewardAmount).div(totalSupply);

      // Users claim rewards
      await amanaVault.connect(user1).claimRewards(await user1.getAddress());
      const user1Reward = await usdcBSC.balanceOf(await user1.getAddress());

      await amanaVault.connect(user2).claimRewards(await user2.getAddress());
      const user2Reward = await usdcBSC.balanceOf(await user2.getAddress());

      // Validate the rewards
      expect(user1Reward).to.be.closeTo(user1ExpectedRewards, ethers.utils.parseUnits("1", 18));
      expect(user2Reward).to.be.closeTo(user2ExpectedRewards, ethers.utils.parseUnits("1", 18));
    });

    it("should execute a direct ERC20 multi-hop swap using exactInput on Uniswap V3 Router", async function () {
      const { user1 } = await loadFixture(setup);

      // Uniswap V3 Router Address
      const swapRouter = await ethers.getContractAt("ISwapRouter", UNISWAP_V3_ROUTER);

      // Define input and output tokens
      const inputToken = await ethers.getContractAt("IERC20", ORIGIN_CHAIN_ZRC20_INPUT);  // Example ERC20 token
      const outputToken = await ethers.getContractAt("IERC20", VAULT_ASSET); // Example ERC20 token

      // Set the amount to swap
      const swapAmount = ethers.utils.parseUnits("0.0001", 18);

      // Fund the user with enough input tokens
      await setTokenBalance(ORIGIN_CHAIN_ZRC20_INPUT, await user1.getAddress(), swapAmount, 3);
      // Approve Uniswap Router to spend user's tokens
      await inputToken.connect(user1).approve(UNISWAP_V3_ROUTER, swapAmount);

      // Construct the path for the swap (inputToken -> outputToken with a 0.3% fee)
      const fee1 = 3000;
      const fee2 = 500;
      const encodedPath = ethers.utils.solidityPack(
        ["address", "uint24", "address", "uint24", "address"],
        [ORIGIN_CHAIN_ZRC20_INPUT, fee1, ZC_USDC_ETH_ADDRESS, fee2, VAULT_ASSET]
      );
      // Set up swap parameters
      const params = {
        path: encodedPath,
        recipient: await user1.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10-minute deadline
        amountIn: swapAmount,
        amountOutMinimum: 0, // Adjust for slippage in real cases
      };

      // Execute swap
      swapRouter.connect(user1).exactInput(params)

      // Get the final balance of the output token
      const finalOutputBalance = await outputToken.balanceOf(await user1.getAddress());

      expect(finalOutputBalance).to.be.gt(0);
    });

    it("should execute a direct ERC20 swap using exactInputSingle on Uniswap V3 Router", async function () {
      const { user1 } = await loadFixture(setup);

      // Uniswap V3 Router Address
      const swapRouter = await ethers.getContractAt("ISwapRouter", UNISWAP_V3_ROUTER);

      // Define input and output tokens
      const inputToken = await ethers.getContractAt("IERC20", ZC_ETH_BASE_ADDRESS);  // Example ERC20 token
      const outputToken = await ethers.getContractAt("IERC20", ZC_USDC_ETH_ADDRESS); // Example ERC20 token

      // Set the amount to swap
      const swapAmount = ethers.utils.parseUnits("0.0001", 18);

      // Fund the user with enough input tokens
      await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user1.getAddress(), swapAmount, 3);

      // Approve Uniswap Router to spend user's tokens
      await inputToken.connect(user1).approve(UNISWAP_V3_ROUTER, swapAmount);
      const allowance = await inputToken.allowance(await user1.getAddress(), UNISWAP_V3_ROUTER);

      // Set up swap parameters for exactInputSingle
      const fee = 3000; // 0.3% pool fee
      const params = {
        tokenIn: ZC_ETH_BASE_ADDRESS,
        tokenOut: ZC_USDC_ETH_ADDRESS,
        fee: fee,
        recipient: await user1.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 10, // 10-minute deadline
        amountIn: swapAmount,
        amountOutMinimum: 0, // Adjust for slippage in real cases
        sqrtPriceLimitX96: 0, // No price limit
      };

      // Execute swap
      // await expect(swapRouter.connect(user1).exactInputSingle(params))
      //   .to.emit(swapRouter, "Swap");
      swapRouter.connect(user1).exactInputSingle(params)
      // Get the final balance of the output token
      const finalOutputBalance = await outputToken.balanceOf(await user1.getAddress());

      expect(finalOutputBalance).to.be.gt(0);
    });

  });
});

