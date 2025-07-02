// This test simulates a vault with ETH.ETH as the vault assets
// Cross chain deposits and withdrawals are simulated to be coming from Base

import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance } from "../utils";
import { simulateConfirmDeposit, simulateConfirmAssetUpdate, simulateConfirmDirectWithdraw, simulateConfirmRedeemToAnyToken, simulateConfirmSwitch, simulateConfirmWithdrawToConnChain, simulateDepositCallFromConnChain, simulateWithdrawCallFromConnChain } from "../utils";
import { setupVaultFixture } from "./setupVaultTest";
import { formatUnits } from "ethers/lib/utils";

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
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount1, txConfig.minSharesOut1, await user1.getAddress());
    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.directDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
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
    const { user1, amanaVault, pythContract, gatewaySigner, owner, gasTank, vaultConfig, txConfig, strategyConfig, depositSwapData } = await loadFixture(setupVaultFixture);

    // supply the owner address with an amount of origin chain input ZRC20 token, so they can make deposits
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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

  it("should execute a basic direct withdraw of max amount", async function () {
    const { user1, amanaVault, pythContract, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);
    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
    const userMaxWithdraw = await amanaVault.maxWithdraw(await user1.getAddress());
    const userVaultSharesBurnt = await amanaVault.convertToShares(userMaxWithdraw);
    await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](userMaxWithdraw, minAmountOut, await user1.getAddress(), await user1.getAddress());
    await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userMaxWithdraw, userVaultSharesBurnt, emittedAmount, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance = await vaultAsset.balanceOf(await user1.getAddress());
    expect(totalShares).to.eq(0);
    expect(userBalance).to.eq(userMaxWithdraw);
  });

  it("should execute a basic cross chain withdraw", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, depositSwapData, withdrawSwapData } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage);

    await simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, userExpectedAmountWithdrawn, emittedAmount, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    expect(totalShares).to.eq(0);

  });

  it("should execute a basic direct redeem", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultAsset, vaultConfig, txConfig, strategyConfig, owner, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
    await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 500);
    const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
    await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, expectedAmountWithdrawn, totalShares, emittedAmount, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.eq(0);
  });

  it("should execute a basic direct redeemToAnyToken to ZETA", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
    const { amanaVault, owner, gatewayZEVM, user1, pythContract, gatewaySigner, txConfig, strategyConfig, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);
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
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
      amanaVault.connect(owner).switchStrategy(newStrategyAddress, 0, 0)
    )
      .to.emit(gatewayZEVM, "Called");
    // .withArgs(newStrategyAddress);
    await simulateConfirmSwitch(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, newStrategyAddress, 2, strategyConfig.chainId, strategyConfig.gasToken);
    const updatedStrategy = await amanaVault.strategyAddress();

    expect(updatedStrategy).to.equal(newStrategyAddress);
  });

  it("should process a totalAssets update confirmation successfully", async function () {
    const { amanaVault, gatewaySigner, strategyConfig } = await loadFixture(setupVaultFixture);
    const totalAssetsAmount = ethers.utils.parseUnits("0.1", 18);
    const lastProcessedNonce = await amanaVault.lastProcessedNonce();
    const vaultNonce = lastProcessedNonce;
    const receipt = await simulateConfirmAssetUpdate(amanaVault, gatewaySigner, totalAssetsAmount, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken, vaultNonce);
    const updatedTotalAssets = await amanaVault.totalAssets();
    expect(updatedTotalAssets).to.equal(totalAssetsAmount);
    expect(receipt).to.emit(amanaVault, "TotalAssetsUpdated").withArgs(totalAssetsAmount, vaultNonce);
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
    const { user1, user2, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, depositSwapData, withdrawSwapData } = await loadFixture(setupVaultFixture);

    // Step 1: Simulate a deposit by User1
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);

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

    const tx2 = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
    const receipt2 = await tx2.wait(); // Wait for the tx receipt

    const log2 = receipt2.logs.find((log) => log.topics[0] === topic);
    expect(log2).to.exist;

    const decoded2 = iface.decodeEventLog("CrossChainInvestSent", log2!.data, log2!.topics);
    const emittedAmount2 = decoded2.amount;

    const profit = emittedAmount.div(10); // 10% profit

    // The confirmation from the second deposit shows that user1 has made a profit already
    await simulateConfirmDeposit(amanaVault, gatewaySigner, emittedAmount2, initialTotalAssets.add(profit), 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const updatedTotalAssets = initialTotalAssets.add(emittedAmount2).add(profit);

    // Step 3: Perform a withdrawal and calculate the fee
    const expectedFee = profit.mul(vaultConfig.feeRate).div(10000);
    const withdrawAmount = emittedAmount.add(profit); // Withdraw everything except the fee
    const totalSharesUser1 = await amanaVault.balanceOf(await user1.getAddress());
    const sharesToWithdraw = totalSharesUser1;

    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, sharesToWithdraw, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage);
    await expect(simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, withdrawAmount, updatedTotalAssets, 3, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken,))
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
    const { user1, amanaVault, vaultAsset, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, withdrawHelper, amanaRegistry, originZRC20Input } = await loadFixture(setupVaultFixture);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    // Simulate _crossChainInvest reverting
    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_crossChainInvestFailed", strategyConfig.address, txConfig.crossChainDepositAmount1, await user1.getAddress(), txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    // the revert will send back some vault asset
    await setTokenBalance(vaultAsset.address, withdrawHelper.address, txConfig.crossChainDepositAmount1, 3);
    console.log("user balance of zrc20 before revert", await originZRC20Input.balanceOf(await user1.getAddress()));
    await expect(
      withdrawHelper.connect(gatewaySigner).onRevert({
        sender: strategyConfig.address,
        asset: vaultConfig.asset,
        revertMessage: mockRevertMessage,
        amount: txConfig.crossChainDepositAmount1,
      })
    ).to.emit(withdrawHelper, "CrossChainInvestFailed").withArgs(vaultNonce, amanaVault.address, await user1.getAddress(), txConfig.crossChainDepositAmount1);
    console.log("user balance of zrc20 after revert", await originZRC20Input.balanceOf(await user1.getAddress()));

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
      pythContract,
      vaultAsset,
      depositSwapData, withdrawSwapData
    } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_divestConnectedChainStrategyFailed", strategyConfig.address, userMaxRedeem, user1.address, txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
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
      amanaRegistry,
      strategyConfig,
      vaultAsset
    } = await loadFixture(setupVaultFixture);

    const amount = ethers.utils.parseEther("1");

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_returnFundsToUserFailed", strategyConfig.address, amount, user1.address, txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    await expect(
      withdrawHelper.connect(gatewaySigner).onRevert({
        sender: ethers.constants.AddressZero,
        asset: vaultConfig.asset,
        amount,
        revertMessage,
      })
    ).to.emit(withdrawHelper, "ReturnFundsToUserFailed").withArgs(vaultNonce, amanaVault.address, nonEvmAddress, amount);
  });

  it("should handle _switchStrategyFailed in onRevert", async function () {
    const {
      gatewaySigner,
      withdrawHelper,
      amanaVault,
      amanaRegistry,
      txConfig,
      user1,
      strategyConfig,
      vaultAsset
    } = await loadFixture(setupVaultFixture);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_switchStrategyFailed", strategyConfig.address, 0, user1.address, txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
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
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, withdrawHelper, amanaRegistry, vaultAsset, depositSwapData } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const txId = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData
    )
    // Simulate _crossChainInvest reverting
    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_crossChainInvestFailed", strategyConfig.address, txConfig.crossChainDepositAmount1, await user1.getAddress(), txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    // the abort will send back some vault asset
    await setTokenBalance(vaultAsset.address, withdrawHelper.address, txConfig.crossChainDepositAmount1, 3);
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
      pythContract,
      vaultAsset,
      depositSwapData, withdrawSwapData
    } = await loadFixture(setupVaultFixture);

    const txId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, txConfig.crossChainDepositAmount1, 0, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_divestConnectedChainStrategyFailed", strategyConfig.address, userMaxRedeem, user1.address, txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
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
      amanaRegistry,
      strategyConfig,
      vaultAsset
    } = await loadFixture(setupVaultFixture);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_returnFundsToUserFailed", strategyConfig.address, txConfig.crossChainDepositAmount1, user1.address, txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
    );

    const tx = await withdrawHelper.connect(gatewaySigner).onAbort({
      sender: ethers.constants.AddressZero,
      asset: vaultConfig.asset,
      amount: txConfig.crossChainDepositAmount1,
      outgoing: true,
      chainID: txConfig.originChainId,
      revertMessage: revertMessage,
    });

    const receipt = await tx.wait();
    console.log("Gas used by onAbort():", receipt.gasUsed.toString());

    // Manually verify the event if needed
    const event = receipt.events?.find((e) => e.event === "ReturnFundsToUserFailed");
    expect(event).to.not.be.undefined;
    expect(event?.args?.[0]).to.equal(vaultNonce);
    expect(event?.args?.[1]).to.equal(amanaVault.address);
    expect(event?.args?.[2]).to.equal(nonEvmAddress);
    expect(event?.args?.[3]).to.equal(txConfig.crossChainDepositAmount1);

  });

  it("should handle _switchStrategyFailed in onAbort", async function () {
    const {
      gatewaySigner,
      withdrawHelper,
      amanaVault,
      amanaRegistry,
      txConfig,
      vaultAsset,
      user1,
      strategyConfig
    } = await loadFixture(setupVaultFixture);

    const vaultNonce = 1;
    const nonEvmAddress = "0x";
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "address", "uint256", "address", "address", "address", "address", "address", "uint256", "bytes"],
      ["_switchStrategyFailed", strategyConfig.address, 0, user1.address, txConfig.originZRC20Input, txConfig.originERC20Input, vaultAsset.address, amanaVault.address, vaultNonce, nonEvmAddress]
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
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank, withdrawHelper, depositSwapData, withdrawSwapData } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData
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
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, maxRedeemAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage)
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const totalAssets = await amanaVault.convertToAssets(totalShares);
    await expect(simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, maxRedeemAmount, totalAssets, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken))
      .to.emit(withdrawHelper, "ReturnFundsToUserSent")
      .to.emit(amanaVault, "Withdrawn");
  });

  it("should fail to withdraw more than the user balance", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, txConfig, strategyConfig, owner, gasTank, depositSwapData, withdrawSwapData } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData
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

    await expect(simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, excessiveWithdrawAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage))
      .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
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
    expect(finalAssets).to.equal(1); // Vault should only have 1 virtual asset unit left
    // Step 4: Ensure further withdrawals fail
    await expect(
      amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](1, 0, await user1.getAddress(), await user1.getAddress())
    ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
  });

  it("should handle zero balances without errors", async function () {
    const { user1, vaultAsset, amanaVault, pythContract, gatewaySigner, txConfig, withdrawSwapData } = await loadFixture(setupVaultFixture);

    // Simulate a withdrawal for a user with zero balance
    const zeroAmount = BigNumber.from(0);
    await expect(amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    await expect(amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    await expect(simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, zeroAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage)).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    // Deposit and then withdraw entire balance
    await vaultAsset.connect(user1).approve(amanaVault.address, zeroAmount);
    await expect(amanaVault.connect(user1)["deposit(uint256,uint256,address)"](zeroAmount, 0, await user1.getAddress()))
      .to.be.revertedWithCustomError(amanaVault, "AmountCantBeZero");
  });

  it("should distribute and claim rewards (time-based)", async function () {
    const { user1, rewardToken, amanaVault, owner, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);

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

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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
    const { user1, user2, rewardToken, amanaVault, owner, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, gasTank, depositSwapData } = await loadFixture(setupVaultFixture);

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

    const tx = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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

    const tx2 = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount2, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage, depositSwapData);
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

  it("should handle a mixed sequence of all transaction types with confirmations", async function () {
    const {
      amanaVault,
      gatewaySigner,
      user1,
      pythContract,
      vaultConfig,
      txConfig,
      strategyConfig,
      owner,
      gasTank,
      depositSwapData, withdrawSwapData
    } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(1000), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount.mul(10), 3);

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);
    const topic = iface.getEventTopic("CrossChainInvestSent");

    let vaultNonce = 1;
    let totalAssets = BigNumber.from(0);
    const txAmounts: BigNumber[] = [];

    // Step 1: Deposit #1
    const tx1 = await simulateDepositCallFromConnChain(
      amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input,
      txConfig.originChainId, txConfig.slippage, depositSwapData
    );
    const receipt1 = await tx1.wait();
    const log1 = receipt1.logs.find((log) => log.topics[0] === topic);
    const decoded1 = iface.decodeEventLog("CrossChainInvestSent", log1!.data, log1!.topics);
    const depositAmount1 = decoded1.amount;
    txAmounts.push(depositAmount1);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, depositAmount1, 0, vaultNonce, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    totalAssets = totalAssets.add(depositAmount1);

    // Step 2: Update #1
    const updateAmount1 = totalAssets.add(depositAmount1.div(10)); // Add 10% of the deposit amount
    await simulateConfirmAssetUpdate(amanaVault, gatewaySigner, updateAmount1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken, vaultNonce++);
    totalAssets = updateAmount1;
    expect(await amanaVault.totalAssets()).to.equal(updateAmount1);

    // Step 3: Deposit #2
    const tx2 = await simulateDepositCallFromConnChain(
      amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input,
      txConfig.originChainId, txConfig.slippage, depositSwapData
    );
    const receipt2 = await tx2.wait();
    const log2 = receipt2.logs.find((log) => log.topics[0] === topic);
    const decoded2 = iface.decodeEventLog("CrossChainInvestSent", log2!.data, log2!.topics);
    const depositAmount2 = decoded2.amount;
    txAmounts.push(depositAmount2);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, depositAmount2, totalAssets, vaultNonce++, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    totalAssets = totalAssets.add(depositAmount2);

    // Step 4: Withdraw #1
    const shares = await amanaVault.balanceOf(await user1.getAddress());
    const halfShares = shares.div(2);
    const expectedOut1 = await amanaVault.convertToAssets(halfShares);

    await simulateWithdrawCallFromConnChain(
      amanaVault, gatewaySigner, user1, halfShares,
      pythContract, txConfig.originZRC20Input, txConfig.originChainId,
      txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage
    );
    await simulateConfirmWithdrawToConnChain(
      amanaVault, gatewaySigner, expectedOut1, totalAssets,
      vaultNonce++, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken
    );
    totalAssets = totalAssets.sub(expectedOut1);

    // Step 5: Strategy switch #1
    const newStrategy1 = ethers.Wallet.createRandom().address;
    await amanaVault.connect(owner).switchStrategy(newStrategy1, 0, 0);
    await simulateConfirmSwitch(
      amanaVault,
      gatewaySigner,
      totalAssets,
      newStrategy1,
      vaultNonce,
      strategyConfig.chainId,
      strategyConfig.gasToken
    );
    expect(await amanaVault.strategyAddress()).to.equal(newStrategy1);

    // Step 6: Update #2
    const updateAmount2 = totalAssets.add(depositAmount1.div(5)); // Add 20% of the deposit amount
    await simulateConfirmAssetUpdate(amanaVault, gatewaySigner, updateAmount2, newStrategy1, strategyConfig.chainId, strategyConfig.gasToken, vaultNonce++);
    totalAssets = updateAmount2;

    // Step 7: Withdraw #2
    const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
    const expectedOut2 = await amanaVault.convertToAssets(remainingShares);

    await simulateWithdrawCallFromConnChain(
      amanaVault, gatewaySigner, user1, remainingShares,
      pythContract, txConfig.originZRC20Input, txConfig.originChainId,
      txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage
    );
    await simulateConfirmWithdrawToConnChain(
      amanaVault, gatewaySigner, expectedOut2, totalAssets,
      vaultNonce++, vaultConfig.asset, newStrategy1, strategyConfig.chainId, strategyConfig.gasToken
    );
    totalAssets = totalAssets.sub(expectedOut2);
    expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(0);

    // Step 8: Strategy switch #2
    const newStrategy2 = ethers.Wallet.createRandom().address;
    await amanaVault.connect(owner).switchStrategy(newStrategy2, 0, 0);
    await simulateConfirmSwitch(
      amanaVault,
      gatewaySigner,
      totalAssets,
      newStrategy2,
      vaultNonce++,
      strategyConfig.chainId,
      strategyConfig.gasToken
    ); expect(await amanaVault.strategyAddress()).to.equal(newStrategy2);
  });

  it("should correctly handle out-of-sequence confirmations with multiple users", async function () {
    const {
      amanaVault,
      gatewaySigner,
      user1,
      user2,
      pythContract,
      vaultConfig,
      txConfig,
      strategyConfig,
      owner,
      gasTank,
      depositSwapData, withdrawSwapData
    } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(1000), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount.mul(10), 3);

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)"
    ]);
    const topic = iface.getEventTopic("CrossChainInvestSent");

    let vaultNonce = 1;
    let totalAssets = BigNumber.from(0);

    // Step 1: User1 Deposit #1 (confirmed)
    const tx1 = await simulateDepositCallFromConnChain(
      amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input,
      txConfig.originChainId, txConfig.slippage, depositSwapData
    );
    const receipt1 = await tx1.wait();
    const log1 = receipt1.logs.find((log) => log.topics[0] === topic)!;
    const depositAmount1 = iface.decodeEventLog("CrossChainInvestSent", log1.data, log1.topics).amount;
    const nonce1 = vaultNonce++;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, depositAmount1, 0, nonce1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    totalAssets = totalAssets.add(depositAmount1);

    // Step 2: User2 Deposit #1 (not confirmed yet)
    const tx2 = await simulateDepositCallFromConnChain(
      amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input,
      txConfig.originChainId, txConfig.slippage, depositSwapData
    );
    const receipt2 = await tx2.wait();
    const log2 = receipt2.logs.find((log) => log.topics[0] === topic)!;
    const depositAmount2 = iface.decodeEventLog("CrossChainInvestSent", log2.data, log2.topics).amount;
    const nonce2 = vaultNonce++;

    // Step 3: User1 Withdraw #1
    const shares1 = await amanaVault.balanceOf(await user1.getAddress());
    const halfShares1 = shares1.div(2);
    const expectedOut1 = await amanaVault.convertToAssets(halfShares1);
    await simulateWithdrawCallFromConnChain(
      amanaVault, gatewaySigner, user1, halfShares1,
      pythContract, txConfig.originZRC20Input, txConfig.originChainId,
      txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage
    );
    const nonce3 = vaultNonce++;

    // Step 4: User1 Deposit #2 (not confirmed yet)
    const tx3 = await simulateDepositCallFromConnChain(
      amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input,
      txConfig.originChainId, txConfig.slippage, depositSwapData
    );
    const receipt3 = await tx3.wait();
    const log3 = receipt3.logs.find((log) => log.topics[0] === topic)!;
    const depositAmount3 = iface.decodeEventLog("CrossChainInvestSent", log3.data, log3.topics).amount;
    const nonce4 = vaultNonce++;

    // Step 5: Confirm User2's deposit now
    await simulateConfirmDeposit(amanaVault, gatewaySigner, depositAmount2, depositAmount1, nonce2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    totalAssets = totalAssets.add(depositAmount2);

    // Step 6: User2 Withdraw #1
    const shares2 = await amanaVault.balanceOf(await user2.getAddress());
    const expectedOut2 = await amanaVault.convertToAssets(shares2);
    await simulateWithdrawCallFromConnChain(
      amanaVault, gatewaySigner, user2, shares2,
      pythContract, txConfig.originZRC20Input, txConfig.originChainId,
      txConfig.originGasToken, txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage
    );
    const nonce5 = vaultNonce++;

    // Step 7: Confirm User1's Withdraw #1
    await simulateConfirmWithdrawToConnChain(
      amanaVault, gatewaySigner, expectedOut1, depositAmount1.add(depositAmount2),
      nonce3, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken
    );
    totalAssets = totalAssets.sub(expectedOut1);

    // Step 8: Confirm User1's Deposit #2
    await simulateConfirmDeposit(amanaVault, gatewaySigner, depositAmount3, depositAmount1.add(depositAmount2).sub(expectedOut1), nonce4, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    totalAssets = totalAssets.add(depositAmount3);

    // Step 9: Confirm User2's Withdraw #1
    const totalBeforeUser2Withdraw = depositAmount1.add(depositAmount2).sub(expectedOut1).add(depositAmount3);
    await simulateConfirmWithdrawToConnChain(
      amanaVault, gatewaySigner, expectedOut2, totalBeforeUser2Withdraw,
      nonce5, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken
    );
    totalAssets = totalAssets.sub(expectedOut2);

    expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1.add(depositAmount3).sub(expectedOut1));
    expect(await amanaVault.balanceOf(await user2.getAddress())).to.equal(0);
  });

  it("should handle a withdraw initiated before a large deposit is confirmed", async function () {
    const {
      amanaVault,
      gatewaySigner,
      user1,
      pythContract,
      vaultConfig,
      txConfig,
      strategyConfig,
      owner,
      gasTank,
      depositSwapData, withdrawSwapData
    } = await loadFixture(setupVaultFixture);

    await setTokenBalance(
      txConfig.originZRC20Input,
      await owner.getAddress(),
      txConfig.crossChainDepositAmount1.mul(1000),
      3
    );
    await setTokenBalance(
      strategyConfig.gasToken,
      gasTank.address,
      strategyConfig.gasTankAmount.mul(10),
      3
    );

    const iface = new ethers.utils.Interface([
      "event CrossChainInvestSent(uint256 indexed vaultNonce, address vault, address receiver, uint256 amount)",
    ]);
    const topic = iface.getEventTopic("CrossChainInvestSent");

    let vaultNonce = 1;
    let totalAssets = BigNumber.from(0);
    // Step 1: Deposit #1 (confirmed)
    const tx1 = await simulateDepositCallFromConnChain(
      amanaVault,
      gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract,
      txConfig.originZRC20Input,
      txConfig.originERC20Input,
      txConfig.originChainId,
      txConfig.slippage,
      depositSwapData
    );
    const receipt1 = await tx1.wait();
    const log1 = receipt1.logs.find((log) => log.topics[0] === topic)!;
    const depositAmount1 = iface.decodeEventLog("CrossChainInvestSent", log1.data, log1.topics).amount;
    const nonce1 = vaultNonce++;

    await simulateConfirmDeposit(
      amanaVault,
      gatewaySigner,
      depositAmount1,
      0,
      nonce1,
      strategyConfig.address,
      strategyConfig.chainId,
      strategyConfig.gasToken
    );
    totalAssets = totalAssets.add(depositAmount1);
    // Step 2: Deposit #2 (not confirmed yet, 10x bigger)
    const largeDepositAmount = txConfig.crossChainDepositAmount1.mul(10);
    const tx2 = await simulateDepositCallFromConnChain(
      amanaVault,
      gatewaySigner,
      user1,
      largeDepositAmount,
      pythContract,
      txConfig.originZRC20Input,
      txConfig.originERC20Input,
      txConfig.originChainId,
      txConfig.slippage,
      depositSwapData
    );
    const receipt2 = await tx2.wait();
    const log2 = receipt2.logs.find((log) => log.topics[0] === topic)!;
    const depositAmount2 = iface.decodeEventLog("CrossChainInvestSent", log2.data, log2.topics).amount;
    const nonce2 = vaultNonce++;

    // Step 3: Withdraw initiated before confirming deposit #2
    const userShares = await amanaVault.balanceOf(await user1.getAddress());

    const userAssets = await amanaVault.convertToAssets(userShares);

    const assetsToWithdraw = userAssets.div(2);
    await simulateWithdrawCallFromConnChain(
      amanaVault,
      gatewaySigner,
      user1,
      assetsToWithdraw,
      pythContract,
      txConfig.originZRC20Input,
      txConfig.originChainId,
      txConfig.originGasToken,
      txConfig.originNonEvmUserAddress, withdrawSwapData, txConfig.slippage
    );
    const nonce3 = vaultNonce++;

    // Step 4: Confirm deposit #2
    await simulateConfirmDeposit(
      amanaVault,
      gatewaySigner,
      depositAmount2,
      depositAmount1,
      nonce2,
      strategyConfig.address,
      strategyConfig.chainId,
      strategyConfig.gasToken
    );
    totalAssets = totalAssets.add(depositAmount2);
    // Step 5: Confirm withdraw
    const totalBeforeWithdraw = totalAssets; // Deposit #2 not counted yet at time of withdraw
    await simulateConfirmWithdrawToConnChain(
      amanaVault,
      gatewaySigner,
      assetsToWithdraw,
      totalBeforeWithdraw,
      nonce3,
      vaultConfig.asset,
      strategyConfig.address,
      strategyConfig.chainId,
      strategyConfig.gasToken
    );
    totalAssets = totalAssets.sub(assetsToWithdraw);

    const actualUserShares = await amanaVault.balanceOf(await user1.getAddress());
    const actualAssets = await amanaVault.convertToAssets(actualUserShares);

    // Validate user’s final position
    expect(actualAssets.add(assetsToWithdraw)).to.be.closeTo(depositAmount1.add(depositAmount2), 10); // rounding
  });






});

