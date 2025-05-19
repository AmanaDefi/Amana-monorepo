// This test simulates a vault with ETH.ETH as the vault assets
// Cross chain deposits and withdrawals are simulated to be coming from Base

import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance } from "../utils";
import { simulateConfirmDeposit, simulateConfirmAssetUpdate, simulateConfirmDirectWithdraw, simulateConfirmRedeemToAnyToken, simulateConfirmSwitch, simulateConfirmWithdrawToConnChain, simulateDepositCallFromConnChain, simulateWithdrawCallFromConnChain } from "../utils";
import { setupVaultFixture } from "./setupVaultTest";

describe("AmanaConnectedChainVault Tests", function () {

  const PRICE_FEED_ID = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"; // ETH/USD price feed ID
  const HERMES_ENDPOINT = `https://hermes.pyth.network/api/latest_vaas?ids[]=${PRICE_FEED_ID}`;

  const UNISWAP_V3_ROUTER = "0x9b30cfbacd3504252f82263f72d6acf62bf733c2";
  const ERROR_MARGIN = ethers.utils.parseUnits("0.00015", 18);

  it("initializes the vault correctly", async function () {
    const { amanaVault, vaultConfig, owner } = await loadFixture(setupVaultFixture);

    expect(await amanaVault.name()).to.equal(vaultConfig.name);
    expect(await amanaVault.symbol()).to.equal(vaultConfig.symbol);
    expect(await amanaVault.asset()).to.equal(vaultConfig.asset);
    expect(await amanaVault.owner()).to.equal(await owner.getAddress());
    expect(await amanaVault.perfFee()).to.equal(vaultConfig.feeRate);
  });

  it("should reject unauthorized access to setStrategy", async function () {
    const { user1, amanaVault, strategyConfig } = await loadFixture(setupVaultFixture);

    await expect(
      amanaVault.connect(user1).setStrategy(strategyConfig.address)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should execute a basic direct deposit", async function () {
    const { user1, amanaVault, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture)
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

    // fund user with vault asset so that they can deposit
    await setTokenBalance(vaultConfig.asset, await user1.getAddress(), txConfig.directDepositAmount1, 3);
    await vaultAsset.connect(user1).approve(amanaVault.address, txConfig.directDepositAmount1);
    console.log("Approved vault asset for user1");
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount1, txConfig.minSharesOut1, await user1.getAddress());
    console.log("Deposited vault asset for user1");
    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.directDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    console.log("Confirmed deposit for user1");
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(txConfig.directDepositAmount1, ERROR_MARGIN);
  });

  it("should execute a ZapContract deposit with ERC20", async function () {
    const { user1, amanaVault, otherZRC20, zapContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, withdrawHelper } = await loadFixture(setupVaultFixture);
    await setTokenBalance(txConfig.otherZRC20Input, await user1.getAddress(), txConfig.directDepositAmount3, 3);

    await otherZRC20.connect(user1).approve(zapContract.address, txConfig.directDepositAmount3);
    const tx = await zapContract.connect(user1).zapDeposit(txConfig.otherZRC20Input, amanaVault.address, vaultConfig.asset, txConfig.directDepositAmount3, txConfig.minSharesOut3, await user1.getAddress(), 10000);

    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;

    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(emittedAmount, ERROR_MARGIN);
  });

  it("should execute a ZapContract deposit with ZETA", async function () {
    const { user1, amanaVault, zapContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, withdrawHelper } = await loadFixture(setupVaultFixture);

    const tx = await zapContract.connect(user1).zapDeposit(ethers.constants.AddressZero, amanaVault.address, vaultConfig.asset, txConfig.directDepositAmount3, txConfig.minSharesOut3, await user1.getAddress(), 10000, { value: txConfig.directDepositAmount3 });

    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;

    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(emittedAmount, ERROR_MARGIN);
  });

  it("should execute a basic cross chain deposit", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, owner, gasTank, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);

    // supply the owner address with an amount of origin chain input ZRC20 token, so they can make deposits
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    console.log("Deposited vault asset for user1");
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;


    console.log("Confirming deposit for user1");
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    console.log("Confirmed deposit for user1");
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(emittedAmount, ERROR_MARGIN);
  });

  it("should execute a basic direct withdraw of max amount", async function () {
    const { user1, amanaVault, pythContract, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);
    console.log("About to call simulateDepositCallFromConnChain");
    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    console.log("Deposited vault asset for user1");
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    console.log("Confirming deposit for user1");
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    console.log("Confirmed deposit for user1");
    const userMaxWithdraw = await amanaVault.maxWithdraw(await user1.getAddress());
    const userVaultSharesBurnt = await amanaVault.convertToShares(userMaxWithdraw);
    console.log("About to call amanaVault.connect(user1).withdraw");
    await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](userMaxWithdraw, minAmountOut, await user1.getAddress(), await user1.getAddress());
    console.log("Withdrew vault asset for user1");
    await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userMaxWithdraw, userVaultSharesBurnt, emittedAmount, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);
    console.log("Confirmed direct withdraw for user1");
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance = await vaultAsset.balanceOf(await user1.getAddress());
    expect(totalShares).to.eq(0);
    expect(userBalance).to.eq(userMaxWithdraw);
  });

  it("should execute a basic cross chain withdraw", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    const userExpectedAmountWithdrawn = await amanaVault.convertToAssets(userMaxRedeem);
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress);

    await simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, userExpectedAmountWithdrawn, userMaxRedeem, emittedAmount, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    expect(totalShares).to.eq(0);

  });

  it("should execute a basic direct redeem", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultAsset, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    const userExpectedAmountWithdrawn = await amanaVault.convertToAssets(userMaxRedeem);

    amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](userMaxRedeem, minAmountOut, await user1.getAddress(), await user1.getAddress());

    await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userExpectedAmountWithdrawn, userMaxRedeem, emittedAmount, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance = await vaultAsset.balanceOf(await user1.getAddress());

    expect(totalShares).to.eq(0);
    expect(userBalance).to.eq(userExpectedAmountWithdrawn);
    expect(userBalance).to.be.closeTo(txConfig.crossChainDepositAmount1, ERROR_MARGIN);
  });

  it("should execute a basic direct redeemToAnyToken", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const withdrawToken = txConfig.originZRC20Input;
    console.log("withdrawToken from config in test", withdrawToken);
    await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 500);
    const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
    await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, expectedAmountWithdrawn, totalShares, emittedAmount, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.eq(0);
  });

  it("should execute a basic direct redeemToAnyToken to ZETA", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());

    const userBalance1 = await ethers.provider.getBalance(await user1.getAddress());

    const withdrawToken = ethers.constants.AddressZero;
    await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 10000);
    const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
    await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, expectedAmountWithdrawn, txConfig.crossChainDepositAmount1, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance2 = await ethers.provider.getBalance(await user1.getAddress());
    expect(totalShares).to.eq(0);
    expect(userBalance2).to.be.gt(userBalance1);
  });

  it("should initiate switch to a new strategy successfully", async function () {
    const { amanaVault, owner, gatewayZEVM, user1, pythContract, gatewaySigner, txConfig, strategyConfig, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);
    const newStrategyAddress = ethers.Wallet.createRandom().address;
    const invalidStrategyAddress = ethers.constants.AddressZero;

    // Step 1: Verify ownership restriction
    await expect(
      amanaVault.connect(user1).switchStrategy(newStrategyAddress, 0)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount");

    // Step 2: Validate invalid inputs
    await expect(
      amanaVault.connect(owner).switchStrategy(invalidStrategyAddress, 0)
    ).to.be.revertedWithCustomError(amanaVault, "InvalidAddress");

    const currentStrategy = await amanaVault.strategyAddress();
    await expect(
      amanaVault.connect(owner).switchStrategy(currentStrategy, 0)
    ).to.be.revertedWithCustomError(amanaVault, "InvalidAddress");

    // Step 3: Simulate a deposit by User1, otherwise full strategy switch won't happen (just update)
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    await expect(
      amanaVault.connect(owner).switchStrategy(newStrategyAddress, 0)
    )
      .to.emit(gatewayZEVM, "Called");
    // .withArgs(newStrategyAddress);
    await simulateConfirmSwitch(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, newStrategyAddress, 2, 2, strategyConfig.chainId, strategyConfig.gasToken);
    const updatedStrategy = await amanaVault.strategyAddress();

    expect(updatedStrategy).to.equal(newStrategyAddress);
  });

  it("should process a totalAssets update confirmation successfully", async function () {
    const { amanaVault, gatewaySigner, strategyConfig } = await loadFixture(setupVaultFixture);
    const totalAssetsAmount = ethers.utils.parseUnits("0.1", 18);
    const receipt = await simulateConfirmAssetUpdate(amanaVault, gatewaySigner, totalAssetsAmount, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    expect(receipt).to.emit(amanaVault, "TotalAssetsUpdated").withArgs(totalAssetsAmount);
  });

  it("should reject unauthorized access to setPerformanceFee", async function () {
    const { user1, amanaVault } = await loadFixture(setupVaultFixture);

    const newFeeRate = ethers.BigNumber.from(1500); // 15%
    await expect(amanaVault.connect(user1).setPerformanceFee(newFeeRate))
      .to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());

  });

  it("should update performance fee correctly", async function () {
    const { amanaVault, owner } = await loadFixture(setupVaultFixture);

    const newFeeRate = ethers.BigNumber.from(1500); // 15%
    await amanaVault.connect(owner).setPerformanceFee(newFeeRate);

    expect(await amanaVault.perfFee()).to.equal(newFeeRate);
  });

  it("should calculate and deduct the performance fee on withdrawal", async function () {
    const { user1, user2, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    // Step 1: Simulate a deposit by User1
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    let receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    const initialTotalAssets = emittedAmount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, initialTotalAssets, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    // Step 2: Simulate a deposit by User2
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx2 = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt2 = await tx2.wait(); // Wait for the tx receipt

    const log2 = receipt2.logs.find((log) => log.topics[0] === topic);
    expect(log2).to.exist;

    const decoded2 = iface.decodeEventLog("CrossChainInvestSent", log2!.data, log2!.topics);
    const emittedAmount2 = decoded2.amount;

    const profit = emittedAmount.div(10); // 10% profit
    console.log("emittedAmount", emittedAmount.toString());
    console.log("emittedAmount2", emittedAmount2.toString());
    // The confirmation from the second deposit shows that user1 has made a profit already
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount2, initialTotalAssets.add(profit), 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    console.log("Initial total assets:", initialTotalAssets.toString());
    console.log("profit:", profit.toString());
    const updatedTotalAssets = initialTotalAssets.add(emittedAmount2).add(profit);
    console.log("Updated total assets after deposit:", updatedTotalAssets.toString());

    // Step 3: Perform a withdrawal and calculate the fee
    const expectedFee = profit.mul(vaultConfig.feeRate).div(10000);
    console.log("Expected fee:", expectedFee.toString());
    const withdrawAmount = emittedAmount.add(profit); // Withdraw everything except the fee
    console.log("Withdraw amount:", withdrawAmount.toString());
    const totalSharesUser1 = await amanaVault.balanceOf(await user1.getAddress());
    const sharesToWithdraw = totalSharesUser1;

    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, sharesToWithdraw, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress);
    await expect(simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, withdrawAmount, sharesToWithdraw, updatedTotalAssets, 3, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken,))
      .to.emit(amanaVault, "PerformanceFeePaid")
      .withArgs(await user1.getAddress(), expectedFee);
  });

  it("should handle emergency withdrawal by the owner", async function () {
    const { amanaVault, owner, otherZRC20, txConfig } = await loadFixture(setupVaultFixture);

    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await setTokenBalance(txConfig.otherZRC20Input, amanaVault.address, depositAmount, 3);

    const balanceBefore = await otherZRC20.balanceOf(await owner.getAddress());
    await amanaVault.connect(owner).emergencyWithdraw(txConfig.otherZRC20Input);

    const balanceAfter = await otherZRC20.balanceOf(await owner.getAddress());
    expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
  });

  it("should reject unauthorized emergency withdrawal", async function () {
    const { amanaVault, user1, txConfig } = await loadFixture(setupVaultFixture);

    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await setTokenBalance(txConfig.otherZRC20Input, amanaVault.address, depositAmount, 3);

    await expect(
      amanaVault.connect(user1).emergencyWithdraw(txConfig.otherZRC20Input)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should correctly handle _crossChainInvest revert during cross-chain deposits", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, withdrawHelper, amanaRegistry } = await loadFixture(setupVaultFixture);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    // Simulate _crossChainInvest reverting
    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_crossChainInvestFailed", txConfig.crossChainDepositAmount1, await user1.getAddress(), txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    // the revert will send back some vault asset
    await setTokenBalance(txConfig.originZRC20Input, withdrawHelper.address, txConfig.crossChainDepositAmount1, 3);
    await expect(
      withdrawHelper.connect(gatewaySigner).onRevert({
        sender: strategyConfig.address,
        asset: vaultConfig.asset,
        revertMessage: mockRevertMessage,
        amount: txConfig.crossChainDepositAmount1,
      })
    ).to.emit(withdrawHelper, "CrossChainInvestFailed").withArgs(vaultNonce, amanaVault.address, await user1.getAddress(), txConfig.crossChainDepositAmount1);
  });

  it("should handle _divestConnectedChainStrategyFailed in onRevert", async function () {
    const {
      user1,
      amanaVault,
      gatewaySigner,
      withdrawHelper,
      vaultConfig,
      txConfig,
      amanaRegistry,
      strategyConfig,
      owner,
      gasTank,
      pythContract
    } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_divestConnectedChainStrategyFailed", userMaxRedeem, user1.address, txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onRevert({
        sender: ethers.constants.AddressZero,
        asset: vaultConfig.asset,
        amount: 0,
        revertMessage,
      })
    ).to.emit(withdrawHelper, "DivestFailed").withArgs(vaultNonce, amanaVault.address, user1.address, userMaxRedeem);
    // TO DO should also decrease Pending Withdrawals
  });

  it("should handle _returnFundsToUserFailed in onRevert", async function () {
    const {
      user1,
      gatewaySigner,
      withdrawHelper,
      vaultConfig,
      txConfig,
      amanaVault,
      amanaRegistry
    } = await loadFixture(setupVaultFixture);

    const amount = ethers.utils.parseEther("1");

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_returnFundsToUserFailed", amount, user1.address, txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onRevert({
        sender: ethers.constants.AddressZero,
        asset: vaultConfig.asset,
        amount,
        revertMessage,
      })
    ).to.emit(withdrawHelper, "ReturnFundsToUserFailed").withArgs(vaultNonce, amanaVault.address, user1.address, amount);
  });

  it("should handle _switchStrategyFailed in onRevert", async function () {
    const {
      gatewaySigner,
      withdrawHelper,
      amanaVault,
      amanaRegistry,
      txConfig,
      user1
    } = await loadFixture(setupVaultFixture);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_switchStrategyFailed", 0, user1.address, txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onRevert({
        sender: ethers.constants.AddressZero,
        asset: ethers.constants.AddressZero,
        amount: 0,
        revertMessage,
      })
    ).to.emit(withdrawHelper, "SwitchStrategyFailed").withArgs(vaultNonce, amanaVault.address);
  });

  it("should correctly handle _crossChainInvest abort during cross-chain deposits", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, withdrawHelper, amanaRegistry } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const txId = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    // Simulate _crossChainInvest reverting
    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_crossChainInvestFailed", txConfig.crossChainDepositAmount1, await user1.getAddress(), txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    // the abort will send back some vault asset
    await setTokenBalance(txConfig.originZRC20Input, withdrawHelper.address, txConfig.crossChainDepositAmount1, 3);
    await expect(
      withdrawHelper.connect(gatewaySigner).onAbort({
        sender: strategyConfig.address,
        asset: vaultConfig.asset,
        amount: txConfig.crossChainDepositAmount1,
        outgoing: true,
        chainID: txConfig.originChainId,
        revertMessage: mockRevertMessage,
      })
    ).to.emit(withdrawHelper, "CrossChainInvestFailed").withArgs(vaultNonce, amanaVault.address, await user1.getAddress(), txConfig.crossChainDepositAmount1);
  });

  it("should handle _divestConnectedChainStrategyFailed in onAbort", async function () {
    const {
      user1,
      amanaVault,
      gatewaySigner,
      withdrawHelper,
      vaultConfig,
      txConfig,
      amanaRegistry,
      owner,
      strategyConfig,
      gasTank,
      pythContract
    } = await loadFixture(setupVaultFixture);

    const txId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_divestConnectedChainStrategyFailed", userMaxRedeem, user1.address, txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onAbort({
        sender: ethers.constants.AddressZero,
        asset: vaultConfig.asset,
        amount: txConfig.crossChainDepositAmount1,
        outgoing: true,
        chainID: txConfig.originChainId,
        revertMessage: revertMessage,
      })
    ).to.emit(withdrawHelper, "DivestFailed").withArgs(vaultNonce, amanaVault.address, user1.address, userMaxRedeem);
    // TO DO should also decrease Pending Withdrawals  
  });

  it("should handle _returnFundsToUserFailed in onAbort", async function () {
    const {
      user1,
      gatewaySigner,
      withdrawHelper,
      vaultConfig,
      txConfig,
      amanaVault,
      amanaRegistry
    } = await loadFixture(setupVaultFixture);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_returnFundsToUserFailed", txConfig.crossChainDepositAmount1, user1.address, txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onAbort({
        sender: ethers.constants.AddressZero,
        asset: vaultConfig.asset,
        amount: txConfig.crossChainDepositAmount1,
        outgoing: true,
        chainID: txConfig.originChainId,
        revertMessage: revertMessage,
      })
    ).to.emit(withdrawHelper, "ReturnFundsToUserFailed").withArgs(vaultNonce, amanaVault.address, user1.address, txConfig.crossChainDepositAmount1);
  });

  it("should handle _switchStrategyFailed in onAbort", async function () {
    const {
      gatewaySigner,
      withdrawHelper,
      amanaVault,
      amanaRegistry,
      txConfig,
      vaultConfig,
      user1
    } = await loadFixture(setupVaultFixture);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256", "address", "address", "address", "address", "uint256", "bytes"],
      ["_switchStrategyFailed", 0, user1.address, txConfig.originZRC20Input, amanaRegistry.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onAbort({
        sender: ethers.constants.AddressZero,
        asset: ethers.constants.AddressZero,
        amount: 0,
        outgoing: true,
        chainID: txConfig.originChainId,
        revertMessage: revertMessage,
      })
    ).to.emit(withdrawHelper, "SwitchStrategyFailed").withArgs(vaultNonce, amanaVault.address);
  });

  it("should reject unauthorized registry updates", async function () {
    const { amanaVault, user1 } = await loadFixture(setupVaultFixture);

    const newRegistryAddress = ethers.Wallet.createRandom().address;
    await expect(
      amanaVault.connect(user1).setRegistry(newRegistryAddress)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should withdraw the maximum amount possible for a user", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, withdrawHelper } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken)

    // Withdraw the maximum amount
    const maxRedeemAmount = await amanaVault.maxRedeem(await user1.getAddress());
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, maxRedeemAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress)
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const totalAssets = await amanaVault.convertToAssets(totalShares);
    console.log("About to confirm withdraw to conn chain");
    await expect(simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, maxRedeemAmount, totalShares, totalAssets, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken))
      .to.emit(withdrawHelper, "ReturnFundsToUserSent")
      .to.emit(amanaVault, "Withdrawn");
  });

  it("should fail to withdraw more than the user balance", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    // Attempt to withdraw more than balance
    const excessiveWithdrawAmount = txConfig.crossChainDepositAmount1.mul(2); // Double the deposited amount

    await expect(simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, excessiveWithdrawAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress))
      .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
  });

  it("should update user shares correctly after multiple deposits and withdrawals", async function () {
    const { user1, user2, amanaVault, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);

    await setTokenBalance(vaultConfig.asset, await user1.getAddress(), txConfig.directDepositAmount1, 3);

    await vaultAsset.connect(user1).approve(amanaVault.address, txConfig.directDepositAmount1);
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount1, txConfig.minSharesOut1, await user1.getAddress());

    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.directDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    await setTokenBalance(vaultConfig.asset, await user2.getAddress(), txConfig.directDepositAmount2, 3);

    await vaultAsset.connect(user2).approve(amanaVault.address, txConfig.directDepositAmount2);
    await amanaVault.connect(user2)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount2, txConfig.minSharesOut2, await user2.getAddress());

    const totalDeposits = txConfig.directDepositAmount1.add(txConfig.directDepositAmount2);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.directDepositAmount2, txConfig.directDepositAmount1, 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    // User1 withdraws part of their deposit
    const sharesToWithdraw1 = totalShares.div(2);
    const minAmountOut = sharesToWithdraw1.mul(1000).div(1001);
    await amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"]
      (sharesToWithdraw1, minAmountOut, await user1.getAddress(), await user1.getAddress());

    await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount1.div(2), sharesToWithdraw1, totalDeposits, 3, 3, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    // Validate the remaining shares for User1
    const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
    const expectedShares = totalShares.sub(sharesToWithdraw1);
    expect(remainingShares).to.eq(expectedShares);
  });

  it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
    const { user1, amanaVault, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);
    // Step 1: Deposit into the vault
    await setTokenBalance(vaultConfig.asset, await user1.getAddress(), txConfig.directDepositAmount1, 3);
    await vaultAsset.connect(user1).approve(amanaVault.address, txConfig.directDepositAmount1);
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount1, txConfig.minSharesOut1, await user1.getAddress());

    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.directDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const initialShares = await amanaVault.balanceOf(await user1.getAddress());
    const initialAssets = await amanaVault.convertToAssets(initialShares);
    expect(initialAssets).to.be.closeTo(txConfig.directDepositAmount1, ERROR_MARGIN);
    // Step 2: Perform multiple withdrawals
    const withdrawShareAmounts = [
      initialShares.div(3), // Withdraw 1/3 of the total balance
      initialShares.div(3), // Withdraw another 1/3
      initialShares.sub(initialShares.div(3).mul(2)), // Withdraw the remaining balance
    ];

    let totalAssetsBefore = txConfig.directDepositAmount1;
    let executionNonce = 2;
    let crossChainTxId = 2;
    for (const withdrawShareAmount of withdrawShareAmounts) {
      // Perform withdrawal
      await amanaVault.connect(user1).redeemToAnyToken(
        withdrawShareAmount,
        withdrawShareAmount.mul(1000).div(1001),
        await user1.getAddress(),
        await user1.getAddress(),
        vaultConfig.asset,
        500
      );
      await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount1.div(3), withdrawShareAmount, totalAssetsBefore, executionNonce, crossChainTxId, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);
      totalAssetsBefore = totalAssetsBefore.sub(txConfig.directDepositAmount1.div(3));
      executionNonce++;
      crossChainTxId++;
    }

    // Step 3: Validate final state
    const finalShares = await amanaVault.balanceOf(await user1.getAddress());
    const finalAssets = await amanaVault.totalAssets();

    expect(finalShares).to.equal(0); // User should have no shares left
    expect(finalAssets).to.equal(1); // Vault should only have 1 virtual share left
    // Step 4: Ensure further withdrawals fail
    await expect(
      amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](1, 0, await user1.getAddress(), await user1.getAddress())
    ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
  });

  it("should handle zero balances without errors", async function () {
    const { user1, vaultAsset, amanaVault, pythContract, gatewaySigner, txConfig } = await loadFixture(setupVaultFixture);

    // Simulate a withdrawal for a user with zero balance
    const zeroAmount = BigNumber.from(0);
    await expect(amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    await expect(amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    await expect(simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, zeroAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress)).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    // Deposit and then withdraw entire balance
    await vaultAsset.connect(user1).approve(amanaVault.address, zeroAmount);
    await expect(amanaVault.connect(user1)["deposit(uint256,uint256,address)"](zeroAmount, 0, await user1.getAddress()))
      .to.be.revertedWithCustomError(amanaVault, "AmountCantBeZero");
  });

  it("should distribute and claim rewards (time-based)", async function () {
    const { user1, rewardToken, amanaVault, owner, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, gasTank } = await loadFixture(setupVaultFixture);

    // Get the current block timestamp to calculate the reward period
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock.timestamp;

    const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds (10 minutes) later
    const rewardDuration = 3600; // Reward duration: 1 hour (3600 seconds)
    const endTimestamp = startTimestamp + rewardDuration; // End rewards after 1 hour

    // Set reward token, reward interval, and reward amount
    await amanaVault.connect(owner).setRewardToken(vaultConfig.rewardToken); // Set USDC as the reward token for testing
    await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, vaultConfig.rewardTokenAmount);

    // Simulate deposit for User1
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    // Confirm the deposit for User1
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    // Simulate time passing during the reward period
    const halfwayTime = startTimestamp + rewardDuration / 2;
    const secondsToSimulate = halfwayTime - currentTimestamp;
    await ethers.provider.send("evm_increaseTime", [secondsToSimulate]); // Increase time by half of the reward duration
    await ethers.provider.send("evm_mine", []); // Trigger a block to update the blockchain timestamp

    const newBlock = await ethers.provider.getBlock("latest");
    const newTimestamp = newBlock.timestamp;

    // Calculate expected rewards halfway through the campaign
    const expectedRewardPerSecond = vaultConfig.rewardTokenAmount.div(BigNumber.from(rewardDuration)); // Reward per second
    const timeElapsed = BigNumber.from(newTimestamp - startTimestamp);
    const expectedReward = expectedRewardPerSecond.mul(timeElapsed);

    await setTokenBalance(vaultConfig.rewardToken, amanaVault.address, vaultConfig.rewardTokenAmount, 3); // Set the reward amount

    // User1 should now have accumulated rewards halfway through the campaign
    await amanaVault.connect(user1).claimRewards(await user1.getAddress()); // Claim the rewards

    // Check the rewards balance for User1
    const userRewardBalance = await rewardToken.balanceOf(await user1.getAddress());
    expect(userRewardBalance).to.be.closeTo(expectedReward, ethers.utils.parseUnits("1", 18)); // Allow a small margin for rounding
  });

  it("should correctly distribute rewards proportional to user shares using precise timestamps", async function () {
    const { user1, user2, rewardToken, amanaVault, owner, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, gasTank } = await loadFixture(setupVaultFixture);

    const rewardDuration = 3600; // 1 hour in seconds

    // Set the start and end timestamps explicitly
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds later
    const endTimestamp = startTimestamp + rewardDuration;

    // Set rewards interval
    await amanaVault.connect(owner).setRewardToken(vaultConfig.rewardToken);
    await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, vaultConfig.rewardTokenAmount);

    // Set reward token balance
    await setTokenBalance(vaultConfig.rewardToken, amanaVault.address, vaultConfig.rewardTokenAmount, 3);

    // Simulate deposits
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt = await tx.wait(); // Wait for the tx receipt

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);

    const topic = iface.getEventTopic("CrossChainInvestSent");

    const log = receipt.logs.find((log) => log.topics[0] === topic);
    expect(log).to.exist;

    const decoded = iface.decodeEventLog("CrossChainInvestSent", log!.data, log!.topics);
    const emittedAmount = decoded.amount;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx2 = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount2, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const receipt2 = await tx2.wait(); // Wait for the tx receipt

    // Find the CrossChainInvestSent event
    const log2 = receipt2.logs.find((log) => log.topics[0] === topic);
    expect(log2).to.exist;

    const decoded2 = iface.decodeEventLog("CrossChainInvestSent", log2!.data, log2!.topics);
    const emittedAmount2 = decoded2.amount;

    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount2, txConfig.crossChainDepositAmount1, 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    // Move to halfway through the rewards duration
    const halfwayTimestamp = startTimestamp + rewardDuration / 2;
    await ethers.provider.send("evm_setNextBlockTimestamp", [halfwayTimestamp]);
    await ethers.provider.send("evm_mine", []); // Mine a block to apply the new timestamp

    // Calculate expected rewards
    const totalSupply = await amanaVault.totalSupply();
    const elapsedRewardAmount = vaultConfig.rewardTokenAmount.mul(halfwayTimestamp - startTimestamp).div(rewardDuration);

    const user1Shares = await amanaVault.balanceOf(await user1.getAddress());
    const user2Shares = await amanaVault.balanceOf(await user2.getAddress());
    const user1ExpectedRewards = user1Shares.mul(elapsedRewardAmount).div(totalSupply);
    const user2ExpectedRewards = user2Shares.mul(elapsedRewardAmount).div(totalSupply);

    // Users claim rewards
    await amanaVault.connect(user1).claimRewards(await user1.getAddress());
    const user1Reward = await rewardToken.balanceOf(await user1.getAddress());

    await amanaVault.connect(user2).claimRewards(await user2.getAddress());
    const user2Reward = await rewardToken.balanceOf(await user2.getAddress());

    // Validate the rewards
    expect(user1Reward).to.be.closeTo(user1ExpectedRewards, ethers.utils.parseUnits("1", 18));
    expect(user2Reward).to.be.closeTo(user2ExpectedRewards, ethers.utils.parseUnits("1", 18));
  });

});

