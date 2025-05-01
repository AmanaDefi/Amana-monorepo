// This test simulates a vault with ETH.ETH as the vault assets
// Cross chain deposits and withdrawals are simulated to be coming from Base

import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance } from "../utils";
import { simulateConfirmDeposit, simulateConfirmAssetUpdate, simulateConfirmDirectWithdraw, simulateConfirmRedeemToAnyToken, simulateConfirmSwitch, simulateConfirmWithdrawToConnChain, simulateDepositCallFromConnChain, simulateWithdrawCallFromConnChain } from "../utils";
import { setupVaultFixture } from "./setupVaultTest";

import {
  ZC_ETH_BASE_ADDRESS,
  ZC_USDC_ETH_ADDRESS
} from "../../../constants";

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
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(txConfig.directDepositAmount1, ERROR_MARGIN);
  });

  it("should execute a ZapContract deposit with ERC20", async function () {
    const { user1, amanaVault, otherZRC20, zapContract, gatewaySigner, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);
    await setTokenBalance(txConfig.otherZRC20Input, await user1.getAddress(), txConfig.directDepositAmount3, 3);

    await otherZRC20.connect(user1).approve(zapContract.address, txConfig.directDepositAmount3);
    await expect(zapContract.connect(user1).zapDeposit(txConfig.otherZRC20Input, amanaVault.address, vaultConfig.asset, txConfig.directDepositAmount3, txConfig.minSharesOut3, await user1.getAddress(), 10000))
      .to.emit(amanaVault, "CrossChainInvestSent");

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount3, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(txConfig.directDepositAmount3, ERROR_MARGIN);
  });

  it("should execute a ZapContract deposit with ZETA", async function () {
    const { user1, amanaVault, zapContract, gatewaySigner, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);

    await expect(zapContract.connect(user1).zapDeposit(ethers.constants.AddressZero, amanaVault.address, vaultConfig.asset, txConfig.directDepositAmount3, txConfig.minSharesOut3, await user1.getAddress(), 10000, { value: txConfig.directDepositAmount3 }))
      .to.emit(amanaVault, "CrossChainInvestSent");

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount3, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(txConfig.directDepositAmount3, ERROR_MARGIN);
  });

  it("should execute a basic cross chain deposit", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, owner, gasTank, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);

    // supply the owner address with an amount of origin chain input ZRC20 token, so they can make deposits
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(txConfig.crossChainDepositAmount1, ERROR_MARGIN);
  });

  it("should execute a basic direct withdraw of max amount", async function () {
    const { user1, amanaVault, pythContract, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const userMaxWithdraw = await amanaVault.maxWithdraw(await user1.getAddress());
    const userVaultSharesBurnt = await amanaVault.convertToShares(userMaxWithdraw);

    await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](userMaxWithdraw, minAmountOut, await user1.getAddress(), await user1.getAddress());

    await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userMaxWithdraw, userVaultSharesBurnt, txConfig.crossChainDepositAmount1, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance = await vaultAsset.balanceOf(await user1.getAddress());
    expect(totalShares).to.eq(0);
    expect(userBalance).to.eq(userMaxWithdraw);
  });

  it("should execute a basic cross chain withdraw", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    const userExpectedAmountWithdrawn = await amanaVault.convertToAssets(userMaxRedeem);
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken);
    await simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, user1, userExpectedAmountWithdrawn, userMaxRedeem, txConfig.crossChainDepositAmount1, 2, 2, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originERC20Input, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken, txConfig.slippage);
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    expect(totalShares).to.eq(0);

  });

  it("should execute a basic direct redeem", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultAsset, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
    const userExpectedAmountWithdrawn = await amanaVault.convertToAssets(userMaxRedeem);

    amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](userMaxRedeem, minAmountOut, await user1.getAddress(), await user1.getAddress());

    await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userExpectedAmountWithdrawn, userMaxRedeem, txConfig.crossChainDepositAmount1, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

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

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const withdrawToken = txConfig.originZRC20Input;
    await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 500);
    const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
    await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, user1, withdrawToken, expectedAmountWithdrawn, totalShares, txConfig.crossChainDepositAmount1, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.eq(0);
  });

  it("should execute a basic direct redeemToAnyToken to ZETA", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);
    const minAmountOut = txConfig.crossChainDepositAmount1.mul(1000).div(1001);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());

    const userBalance1 = await ethers.provider.getBalance(await user1.getAddress());

    const withdrawToken = ethers.constants.AddressZero;
    await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 10000);
    const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
    // console.log("expectedAmountWithdrawn: ", expectedAmountWithdrawn.toString());
    await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, user1, withdrawToken, txConfig.crossChainDepositAmount1, expectedAmountWithdrawn, txConfig.crossChainDepositAmount1, 2, 2, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId);

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

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);
    await expect(
      amanaVault.connect(owner).switchStrategy(newStrategyAddress, 0, 0)
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

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    const initialTotalAssets = txConfig.crossChainDepositAmount1;
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    // Step 2: Simulate a deposit by User2
    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    const profit = txConfig.crossChainDepositAmount1.div(10); // 10% profit

    // The confirmation from the second deposit shows that user1 has made a profit already
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount1, txConfig.crossChainDepositAmount1.add(profit), 2, 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    const updatedTotalAssets = initialTotalAssets.add(txConfig.crossChainDepositAmount1).add(profit);

    // Step 3: Perform a withdrawal and calculate the fee
    const expectedFee = profit.mul(vaultConfig.feeRate).div(10000);
    const withdrawAmount = txConfig.crossChainDepositAmount1.add(profit); // Withdraw everything except the fee
    const totalSharesUser1 = await amanaVault.balanceOf(await user1.getAddress());
    const sharesToWithdraw = totalSharesUser1;

    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, sharesToWithdraw, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken);
    await expect(simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, user1, withdrawAmount, sharesToWithdraw, updatedTotalAssets, 3, 3, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originERC20Input, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken, txConfig.slippage))
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
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    const txId = await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    console.log("Cross chain call simulated")
    // Simulate _crossChainInvest reverting
    const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "bytes32", "uint256", "address", "address", "address", "uint32"],
      ["_crossChainInvestFailed", txId, txConfig.crossChainDepositAmount1, await user1.getAddress(), txConfig.originZRC20Input, ethers.constants.AddressZero, txConfig.originChainId]
    );

    // the revert will send back some vault asset
    await setTokenBalance(vaultConfig.asset, amanaVault.address, txConfig.crossChainDepositAmount1, 3);
    console.log("Amount sent back to vault: ", txConfig.crossChainDepositAmount1.mul(95).div(100).toString());
    await expect(
      amanaVault.connect(gatewaySigner).onRevert({
        sender: strategyConfig.address,
        asset: vaultConfig.asset,
        revertMessage: mockRevertMessage,
        amount: txConfig.crossChainDepositAmount1,
      })
    ).to.emit(amanaVault, "CrossChainInvestFailed").withArgs(txId, await user1.getAddress(), txConfig.crossChainDepositAmount1);
  });

  it("should reject unauthorized registry updates", async function () {
    const { amanaVault, user1 } = await loadFixture(setupVaultFixture);

    const newRegistryAddress = ethers.Wallet.createRandom().address;
    await expect(
      amanaVault.connect(user1).setRegistry(newRegistryAddress)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should withdraw the maximum amount possible for a user", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, vaultConfig, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1,
      pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken)

    // Withdraw the maximum amount
    const maxRedeemAmount = await amanaVault.maxRedeem(await user1.getAddress());
    await simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, maxRedeemAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken)
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());
    await expect(simulateConfirmWithdrawToConnChain(amanaVault, gatewaySigner, user1, maxRedeemAmount, totalShares, txConfig.crossChainDepositAmount1, 2, 2, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originERC20Input, vaultConfig.asset, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken, txConfig.slippage))
      .to.emit(amanaVault, "ReturnFundsToUserSent")
      .to.emit(amanaVault, "Withdrawn");
  });

  it("should fail to withdraw more than the user balance", async function () {
    const { user1, amanaVault, pythContract, gatewaySigner, txConfig, strategyConfig, owner, gasTank } = await loadFixture(setupVaultFixture);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner,
      user1,
      txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage
    )
    simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    // Attempt to withdraw more than balance
    const excessiveWithdrawAmount = txConfig.crossChainDepositAmount1.mul(2); // Double the deposited amount

    await expect(simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, excessiveWithdrawAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken))
      .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
  });

  it("should update user shares correctly after multiple deposits and withdrawals", async function () {
    const { user1, user2, amanaVault, vaultAsset, gatewaySigner, vaultConfig, txConfig, strategyConfig } = await loadFixture(setupVaultFixture);

    await setTokenBalance(vaultConfig.asset, await user1.getAddress(), txConfig.directDepositAmount1, 3);

    await vaultAsset.connect(user1).approve(amanaVault.address, txConfig.directDepositAmount1);
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount1, txConfig.minSharesOut1, await user1.getAddress());

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    await setTokenBalance(vaultConfig.asset, await user2.getAddress(), txConfig.directDepositAmount2, 3);

    await vaultAsset.connect(user2).approve(amanaVault.address, txConfig.directDepositAmount2);
    await amanaVault.connect(user2)["deposit(uint256,uint256,address)"](txConfig.directDepositAmount2, txConfig.minSharesOut2, await user2.getAddress());

    const totalDeposits = txConfig.directDepositAmount1.add(txConfig.directDepositAmount2);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user2, txConfig.directDepositAmount2, txConfig.directDepositAmount1, 2, 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

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

    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

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

    await expect(simulateWithdrawCallFromConnChain(amanaVault, gatewaySigner, user1, zeroAmount, pythContract, txConfig.originZRC20Input, txConfig.originChainId, txConfig.originGasToken)).to.be
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

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);

    // Confirm the deposit for User1
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.directDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

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

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, txConfig.crossChainDepositAmount1, 0, 1, 1, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

    await setTokenBalance(txConfig.originZRC20Input, await owner.getAddress(), txConfig.crossChainDepositAmount1.mul(200).div(1), 3);
    await setTokenBalance(strategyConfig.gasToken, gasTank.address, strategyConfig.gasTankAmount, 3);

    await simulateDepositCallFromConnChain(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount2, pythContract, txConfig.originZRC20Input, txConfig.originERC20Input, txConfig.originChainId, txConfig.slippage);
    await simulateConfirmDeposit(amanaVault, gatewaySigner, user2, txConfig.crossChainDepositAmount2, txConfig.crossChainDepositAmount1, 2, 2, strategyConfig.address, strategyConfig.chainId, strategyConfig.gasToken);

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

  it("should execute a direct ERC20 multi-hop swap using exactInput on Uniswap V3 Router", async function () {
    const { user1, vaultConfig, txConfig } = await loadFixture(setupVaultFixture);

    // Uniswap V3 Router Address
    const swapRouter = await ethers.getContractAt("ISwapRouter", UNISWAP_V3_ROUTER);

    // Define input and output tokens
    const inputToken = await ethers.getContractAt("IERC20", txConfig.originZRC20Input);  // Example ERC20 token
    const outputToken = await ethers.getContractAt("IERC20", vaultConfig.asset); // Example ERC20 token

    // Set the amount to swap
    const swapAmount = ethers.utils.parseUnits("0.0001", 18);

    // Fund the user with enough input tokens
    await setTokenBalance(txConfig.originZRC20Input, await user1.getAddress(), swapAmount, 3);
    // Approve Uniswap Router to spend user's tokens
    await inputToken.connect(user1).approve(UNISWAP_V3_ROUTER, swapAmount);

    // Construct the path for the swap (inputToken -> outputToken with a 0.3% fee)
    const fee1 = 3000;
    const fee2 = 500;
    const encodedPath = ethers.utils.solidityPack(
      ["address", "uint24", "address", "uint24", "address"],
      [txConfig.originZRC20Input, fee1, ZC_USDC_ETH_ADDRESS, fee2, vaultConfig.asset]
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
    const { user1 } = await loadFixture(setupVaultFixture);

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

