// This test simulates a vault with ETH.ETH as the vault assets
// Cross chain deposits and withdrawals are simulated to be coming from Base

import { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance } from "../utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";
import dotenv from "dotenv";
import { generateTransactionId } from "../utils";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";
import { setupVaultFixture } from "./setup";
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
} from "../../../constants";

describe("AmanaConnectedChainVault Tests", function () {

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

  let depositAmount1 = ethers.utils.parseUnits("100", 18);
  let depositAmount2 = ethers.utils.parseUnits("50", 18);
  let rewardAmount = BigNumber.from(1000);

  before(async () => {
  });

  describe("Cross-Chain Deposit and Withdraw Workflow", function () {
    it("should correctly initialize the vault", async function () {
      const { amanaVault, owner } = await loadFixture(setupVaultFixture);

      expect(await amanaVault.name()).to.equal("AaveV3EthVault");
      expect(await amanaVault.symbol()).to.equal("AVU");
      expect(await amanaVault.asset()).to.equal(VAULT_ASSET);
      expect(await amanaVault.owner()).to.equal(await owner.getAddress());
      expect(await amanaVault.perfFee()).to.equal(FEE_RATE);
    });

    it("should reject unauthorized access to setStrategy", async function () {
      const { user1, amanaVault } = await loadFixture(setupVaultFixture);

      await expect(
        amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should execute a basic direct deposit", async function () {
      const { user1, depositAmount1, amanaVault, vaultAsset, gatewaySigner } = await loadFixture(setupVaultFixture);
      // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

      await setTokenBalance(VAULT_ASSET, await user1.getAddress(), depositAmount1, 3);

      await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      const minSharesOut = depositAmount1.mul(1000).div(1001);
      await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount1, ERROR_MARGIN);
    });

    it("should execute a ZapContract deposit with ERC20", async function () {
      const { user1, depositAmount1, amanaVault, otherZRC20, zapContract, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minSharesOut = 0; // depositAmount1.mul(1000).div(1100);
      const depositAmount3 = ethers.utils.parseUnits("1", 18);
      await setTokenBalance(OTHER_ZRC20, await user1.getAddress(), depositAmount3, 3);

      await otherZRC20.connect(user1).approve(zapContract.address, depositAmount3);
      await expect(zapContract.connect(user1).zapDeposit(OTHER_ZRC20, amanaVault.address, VAULT_ASSET, depositAmount3, minSharesOut, await user1.getAddress(), 10000))
        .to.emit(amanaVault, "CrossChainInvestSent");

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount3, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount3, ERROR_MARGIN);
    });

    it("should execute a ZapContract deposit with ZETA", async function () {
      const { user1, depositAmount1, amanaVault, zapContract, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minSharesOut = 0; // depositAmount1.mul(1000).div(1001);
      const depositAmount3 = ethers.utils.parseUnits("1", 18);

      await expect(zapContract.connect(user1).zapDeposit(ethers.constants.AddressZero, amanaVault.address, VAULT_ASSET, depositAmount3, minSharesOut, await user1.getAddress(), 10000, { value: depositAmount3 }))
        .to.emit(amanaVault, "CrossChainInvestSent");

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount3, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount3, ERROR_MARGIN);
    });

    it("should execute a basic cross chain deposit", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.closeTo(depositAmount1, ERROR_MARGIN);
    });

    it("should execute a basic direct withdraw of max amount", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, vaultAsset, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      const userMaxWithdraw = await amanaVault.maxWithdraw(await user1.getAddress());
      const userVaultSharesBurnt = await amanaVault.convertToShares(userMaxWithdraw);

      await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](userMaxWithdraw, minAmountOut, await user1.getAddress(), await user1.getAddress());

      await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userMaxWithdraw, userVaultSharesBurnt, depositAmount1, 2, 2);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const userBalance = await vaultAsset.balanceOf(await user1.getAddress());
      expect(totalShares).to.eq(0);
      expect(userBalance).to.eq(userMaxWithdraw);
    });

    it("should execute a basic cross chain withdraw", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
      const userExpectedAmountWithdrawn = await amanaVault.convertToAssets(userMaxRedeem);

      await simulateWithdrawCallFromEthereum(amanaVault, gatewaySigner, user1, userMaxRedeem, pythContract);
      await simulateConfirmWithdrawToEthereum(amanaVault, gatewaySigner, user1, userExpectedAmountWithdrawn, userMaxRedeem, depositAmount1, 2, 2);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());
      expect(totalShares).to.eq(0);

    });

    it("should execute a basic direct redeem", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner, vaultAsset } = await loadFixture(setupVaultFixture);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const userMaxRedeem = await amanaVault.maxRedeem(await user1.getAddress());
      const userExpectedAmountWithdrawn = await amanaVault.convertToAssets(userMaxRedeem);

      amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](userMaxRedeem, minAmountOut, await user1.getAddress(), await user1.getAddress());

      await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, userExpectedAmountWithdrawn, userMaxRedeem, depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const userBalance = await vaultAsset.balanceOf(await user1.getAddress());

      expect(totalShares).to.eq(0);
      expect(userBalance).to.eq(userExpectedAmountWithdrawn);
      expect(userBalance).to.be.closeTo(depositAmount1, ERROR_MARGIN);
    });

    it("should execute a basic direct redeemToAnyToken", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const withdrawToken = ORIGIN_CHAIN_ZRC20_INPUT;
      await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 500);
      const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
      await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, user1, withdrawToken, expectedAmountWithdrawn, totalShares, depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());

      expect(totalShares).to.be.eq(0);
    });

    it("should execute a basic direct redeemToAnyToken to ZETA", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minAmountOut = depositAmount1.mul(1000).div(1001);
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      let totalShares = await amanaVault.balanceOf(await user1.getAddress());

      const userBalance1 = await ethers.provider.getBalance(await user1.getAddress());

      const withdrawToken = ethers.constants.AddressZero;
      await amanaVault.connect(user1).redeemToAnyToken(totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 10000);
      const expectedAmountWithdrawn = await amanaVault.convertToAssets(totalShares);
      await simulateConfirmRedeemToAnyToken(amanaVault, gatewaySigner, user1, withdrawToken, depositAmount1, expectedAmountWithdrawn, depositAmount1, 2, 2);

      totalShares = await amanaVault.balanceOf(await user1.getAddress());
      const userBalance2 = await ethers.provider.getBalance(await user1.getAddress());
      expect(totalShares).to.eq(0);
      expect(userBalance2).to.equal(userBalance1.add(expectedAmountWithdrawn));
    });

    it("should initiate switch to a new strategy successfully", async function () {
      const { amanaVault, owner, gatewayZEVM, user1, depositAmount1, vaultAsset, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);
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
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);
      await expect(
        amanaVault.connect(owner).switchStrategy(newStrategyAddress, 0, 0)
      )
        .to.emit(gatewayZEVM, "Called");
      // .withArgs(newStrategyAddress);
      await simulateConfirmSwitch(amanaVault, gatewaySigner, depositAmount1, newStrategyAddress, 2, 2);
      const updatedStrategy = await amanaVault.strategyAddress();

      expect(updatedStrategy).to.equal(newStrategyAddress);
    });

    it("should process a totalAssets update confirmation successfully", async function () {
      const { amanaVault, gatewaySigner } = await loadFixture(setupVaultFixture);
      const totalAssetsAmount = ethers.utils.parseUnits("0.1", 18);
      const receipt = await simulateConfirmAssetUpdate(amanaVault, gatewaySigner, totalAssetsAmount);
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
      const { user1, user2, depositAmount1, amanaVault, vaultAsset, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

      // Step 1: Simulate a deposit by User1
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);
      const initialTotalAssets = depositAmount1;
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      // Step 2: Simulate a deposit by User2
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user2, depositAmount1, pythContract);

      const profit = depositAmount1.div(10); // 10% profit

      // The confirmation from the second deposit shows that user1 has made a profit already
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user2, depositAmount1, depositAmount1.add(profit), 2, 2);

      const updatedTotalAssets = initialTotalAssets.add(depositAmount1).add(profit);

      // Step 3: Perform a withdrawal and calculate the fee
      const expectedFee = profit.mul(FEE_RATE).div(10000);
      const withdrawAmount = depositAmount1.add(profit); // Withdraw everything except the fee
      const totalSharesUser1 = await amanaVault.balanceOf(await user1.getAddress());
      const sharesToWithdraw = totalSharesUser1;

      await simulateWithdrawCallFromEthereum(amanaVault, gatewaySigner, user1, sharesToWithdraw, pythContract);
      await expect(simulateConfirmWithdrawToEthereum(amanaVault, gatewaySIgner, user1, withdrawAmount, sharesToWithdraw, updatedTotalAssets, 3, 3))
        .to.emit(amanaVault, "PerformanceFeePaid")
        .withArgs(await user1.getAddress(), expectedFee);
    });

    it("should handle emergency withdrawal by the owner", async function () {
      const { amanaVault, owner, otherZRC20 } = await loadFixture(setupVaultFixture);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await setTokenBalance(OTHER_ZRC20, amanaVault.address, depositAmount, 3);

      const balanceBefore = await otherZRC20.balanceOf(await owner.getAddress());
      await amanaVault.connect(owner).emergencyWithdraw(OTHER_ZRC20);

      const balanceAfter = await otherZRC20.balanceOf(await owner.getAddress());
      expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
    });

    it("should reject unauthorized emergency withdrawal", async function () {
      const { amanaVault, user1, otherZRC20 } = await loadFixture(setupVaultFixture);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await setTokenBalance(OTHER_ZRC20, amanaVault.address, depositAmount, 3);

      await expect(
        amanaVault.connect(user1).emergencyWithdraw(OTHER_ZRC20)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should correctly handle _crossChainInvest revert during cross-chain deposits", async function () {
      const { user1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);
      const depositAmount = ethers.utils.parseUnits("100", 18);
      const txId = await simulateDepositCallFromEthereum(amanaVault, gatewaySigner,
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
      const { amanaVault, user1 } = await loadFixture(setupVaultFixture);

      const newRegistryAddress = ethers.Wallet.createRandom().address;
      await expect(
        amanaVault.connect(user1).setRegistry(newRegistryAddress)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should withdraw the maximum amount possible for a user", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner,
        user1,
        depositAmount1,
        pythContract
      )
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1)

      // Withdraw the maximum amount
      const maxRedeemAmount = await amanaVault.maxRedeem(await user1.getAddress());
      await simulateWithdrawCallFromEthereum(amanaVault, gatewaySigner, user1, maxRedeemAmount, pythContract)
      const totalShares = await amanaVault.balanceOf(await user1.getAddress());
      await expect(simulateConfirmWithdrawToEthereum(amanaVault, gatewaySigner, user1, maxRedeemAmount, totalShares, depositAmount1, 2, 2))
        .to.emit(amanaVault, "ReturnFundsToUserSent")
        .to.emit(amanaVault, "Withdrawn");
    });

    it("should fail to withdraw more than the user balance", async function () {
      const { user1, depositAmount1, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner,
        user1,
        depositAmount1, pythContract
      )
      simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      // Attempt to withdraw more than balance
      const excessiveWithdrawAmount = depositAmount1.mul(2); // Double the deposited amount

      await expect(simulateWithdrawCallFromEthereum(amanaVault, gatewaySigner, user1, excessiveWithdrawAmount, pythContract))
        .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxRedeem");
    });

    it("should update user shares correctly after multiple deposits and withdrawals", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault, vaultAsset, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minSharesOut = depositAmount1.mul(1000).div(1001);

      await setTokenBalance(VAULT_ASSET, await user1.getAddress(), depositAmount1, 3);

      await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      await setTokenBalance(VAULT_ASSET, await user2.getAddress(), depositAmount2, 3);

      await vaultAsset.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2)["deposit(uint256,uint256,address)"](depositAmount2, minSharesOut, await user2.getAddress());

      const totalDeposits = depositAmount1.add(depositAmount2);
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user2, depositAmount2, depositAmount1, 2, 2);

      const totalShares = await amanaVault.balanceOf(await user1.getAddress());
      // User1 withdraws part of their deposit
      const sharesToWithdraw1 = totalShares.div(2);
      const minAmountOut = sharesToWithdraw1.mul(1000).div(1001);
      await amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"]
        (sharesToWithdraw1, minAmountOut, await user1.getAddress(), await user1.getAddress());

      await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, depositAmount1.div(2), sharesToWithdraw1, totalDeposits, 3, 3);

      // Validate the remaining shares for User1
      const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
      const expectedShares = totalShares.sub(sharesToWithdraw1);
      expect(remainingShares).to.eq(expectedShares);
    });

    it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
      const { user1, depositAmount1, amanaVault, vaultAsset, gatewaySigner } = await loadFixture(setupVaultFixture);
      const minSharesOut = depositAmount1.mul(1000).div(1001);
      // Step 1: Deposit into the vault
      await setTokenBalance(VAULT_ASSET, await user1.getAddress(), depositAmount1, 3);
      await vaultAsset.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      const initialShares = await amanaVault.balanceOf(await user1.getAddress());
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
      for (const withdrawShareAmount of withdrawShareAmounts) {
        // Perform withdrawal
        await amanaVault.connect(user1).redeemToAnyToken(
          withdrawShareAmount,
          withdrawShareAmount.mul(1000).div(1001),
          await user1.getAddress(),
          await user1.getAddress(),
          VAULT_ASSET,
          500
        );
        await simulateConfirmDirectWithdraw(amanaVault, gatewaySigner, user1, depositAmount1.div(3), withdrawShareAmount, totalAssetsBefore, executionNonce, crossChainTxId);
        totalAssetsBefore = totalAssetsBefore.sub(depositAmount1.div(3));
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
      const { user1, vaultAsset, amanaVault, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

      // Simulate a withdrawal for a user with zero balance
      const zeroAmount = BigNumber.from(0);
      await expect(amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
        .revertedWithCustomError(amanaVault, "AmountCantBeZero");

      await expect(amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
        .revertedWithCustomError(amanaVault, "AmountCantBeZero");

      await expect(simulateWithdrawCallFromEthereum(amanaVault, gatewaySigner, user1, zeroAmount, pythContract)).to.be
        .revertedWithCustomError(amanaVault, "AmountCantBeZero");

      // Deposit and then withdraw entire balance
      await vaultAsset.connect(user1).approve(amanaVault.address, zeroAmount);
      await expect(amanaVault.connect(user1)["deposit(uint256,uint256,address)"](zeroAmount, 0, await user1.getAddress()))
        .to.be.revertedWithCustomError(amanaVault, "AmountCantBeZero");
    });

    it("should distribute and claim rewards (time-based)", async function () {
      const { user1, depositAmount1, usdcBSC, amanaVault, owner, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

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
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);

      // Confirm the deposit for User1
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

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
      const { user1, user2, depositAmount1, depositAmount2, usdcBSC, amanaVault, owner, pythContract, gatewaySigner } = await loadFixture(setupVaultFixture);

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
      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user1, depositAmount1, pythContract);
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user1, depositAmount1, 0, 1, 1);

      await simulateDepositCallFromEthereum(amanaVault, gatewaySigner, user2, depositAmount2, pythContract);
      await simulateConfirmDeposit(amanaVault, gatewaySigner, user2, depositAmount2, depositAmount1, 2, 2);

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
      const { user1 } = await loadFixture(setupVaultFixture);

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
});

