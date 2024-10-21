import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { UpgradeableVault, ZcEddyStrategy, IERC20 } from "../typechain";

import { ZC_USDC_ETH_ADDRESS } from "../../frontend/src/constants/index";
import { ZC_USDT_ADDRESS } from "../../frontend/src/constants/index";

import { ZC_EDDY4P_ADDRESS } from "../../frontend/src/constants/index";
import { ZC_USDC_HOLDER_ADDRESS } from "../../frontend/src/constants/index";
import { ZC_USDT_HOLDER_ADDRESS } from "../../frontend/src/constants/index";

describe("Vault and ZcEddyStrategy", function () {
  let amanaVault: UpgradeableVault;
  let strategy: ZcEddyStrategy;
  let usdc: IERC20;
  let usdt: IERC20;
  let eddy4pToken: IERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 2000000;
  const FeeRate = BigInt(1000); // 10% fee
  const rewardAmount = ethers.parseUnits("100", 6);
  const withdrawPercent = BigInt(95); // 95% of the deposit amount

  // other tests:
  // - withdraw max amount
  // - withdraw amount greater than balance
  // - deposit amount greater than balance
  // - deposit amount less than minimum deposit
  // - withdraw amount less than minimum withdraw
  // - deposit and withdraw in quick succession
  //  - check for reentrancy attacks
  //  - check for slippage on deposits and withdrawals
  //  - check for gas usage on deposits and withdrawals
  //  - check for edge cases with zero balances
  //  - check for edge cases with maximum balances
  //  - check for edge cases with minimum balances
  //  - check for edge cases with maximum deposits
  //  - check for edge cases with minimum deposits
  //  - check for edge cases with maximum withdrawals
  //  - check for edge cases with minimum withdrawals
  //  - check for withdrawal in shares rather than assets

  before(async () => {


  });

  describe("ZcEddyStrategy Investment", function () {
    async function setup() {
      // Get signers
      [owner, user1, user2] = await ethers.getSigners();

      // Forked USDC contract and Eddy Pool
      usdc = await ethers.getContractAt("IERC20", ZC_USDC_ETH_ADDRESS);
      eddy4pToken = await ethers.getContractAt("IERC20", ZC_EDDY4P_ADDRESS);

      // Deploy the UpgradeableVault using OpenZeppelin's upgrade proxy pattern
      const Vault = await ethers.getContractFactory("UpgradeableVault", owner);
      // Use the upgrades library to deploy the proxy
      amanaVault = await upgrades.deployProxy(
        Vault,
        ["EddyUSDCVault", "EDD", ZC_USDC_ETH_ADDRESS, await owner.getAddress(), FeeRate],
        { initializer: "initialize" }
      );

      // Deploy ZcEddyStrategy contract and set the amanaVault address
      const ZcEddyStrategy = await ethers.getContractFactory("ZcEddyStrategy", owner);
      strategy = await ZcEddyStrategy.deploy("EddyUSDC", await amanaVault.getAddress(), ZC_USDC_ETH_ADDRESS, ZC_EDDY4P_ADDRESS);

      // Set the strategy address in the amanaVault
      const network = await ethers.provider.getNetwork();

      const chainId = network.chainId;
      console.log("Chain ID: ", chainId);
      await amanaVault.setStrategy(await strategy.getAddress(), chainId);

      // Impersonate USDC holder
      const usdcHolder = await ethers.getImpersonatedSigner(ZC_USDC_HOLDER_ADDRESS);

      // Set the initial balances for user1 and user2
      const depositAmount1 = ethers.parseUnits("1000", 6); // 1000 USDC for user1
      const depositAmount2 = ethers.parseUnits("500", 6); // 500 USDC for user2

      await usdc.connect(usdcHolder).transfer(await user1.getAddress(), depositAmount1);
      await usdc.connect(usdcHolder).transfer(await user2.getAddress(), depositAmount2);

      const usdtHolder = await ethers.getImpersonatedSigner(ZC_USDT_HOLDER_ADDRESS);
      usdt = await ethers.getContractAt("IERC20", ZC_USDT_ADDRESS);

      const vaultAddress = await amanaVault.getAddress();
      await usdt.connect(usdtHolder).transfer(vaultAddress, rewardAmount);
      return { owner, user1, user2, depositAmount1, depositAmount2, usdc, usdt, amanaVault };
    }
    it("should invest USDC into Eddy via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      console.log("Deposit amount: ", depositAmount1.toString());
      // Deposit USDC into the amanaVault
      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);

      // Check that the strategy has invested in Eddy
      const eddy4pUSDCBalance = await eddy4pToken.balanceOf(await strategy.getAddress());
      console.log("Eddy4pUSDC Balance: ", eddy4pUSDCBalance.toString());
      // expect(eddy4pUSDCBalance).to.be.closeTo(Number(depositAmount1) * 10 ** 12, errorMargin); // Should have 1000 aBaseUSDC tokens after investment
      expect(await amanaVault.totalAssets()).to.be.closeTo(depositAmount1, errorMargin); // Vault should have the same amount of assets
      console.log("Total Assets: ", await amanaVault.totalAssets());
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1); // User should have 1000 amanaVault shares
      console.log("User1 Shares in Vault: ", await amanaVault.balanceOf(await user1.getAddress()));
    });

    it("should withdraw USDC from Eddy via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      // Deposit USDC into the amanaVault
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      const withdrawAmount = depositAmount1 * withdrawPercent / 100n; // 1000 USDC
      console.log("Withdraw amount: ", withdrawAmount.toString());

      let eddy4pUSDCBalance = await eddy4pToken.balanceOf(await strategy.getAddress());
      console.log("Eddy4pUSDC Balance before withdrawal: ", eddy4pUSDCBalance.toString());
      let USDCbalanceBeforeWithdrawal = await usdc.balanceOf(await user1.getAddress());
      console.log("User1 USDC Balance before withdrawal: ", USDCbalanceBeforeWithdrawal.toString());
      // Withdraw USDC from the strategy
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount);
      eddy4pUSDCBalance = await eddy4pToken.balanceOf(await strategy.getAddress());
      console.log("Eddy4pUSDC Balance after withdrawal: ", eddy4pUSDCBalance.toString());
      const USDCbalanceAfterWithdrawal = await usdc.balanceOf(await user1.getAddress());
      console.log("User1 USDC Balance after withdrawal: ", USDCbalanceAfterWithdrawal.toString());
      console.log("Change in USDC balance: ", (USDCbalanceAfterWithdrawal - USDCbalanceBeforeWithdrawal).toString());
      console.log("Total Assets: ", await amanaVault.totalAssets());
      console.log("User1 Vault Balance: ", await amanaVault.balanceOf(await user1.getAddress()));
    });

    it("should handle deposits from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);

      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);

      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);
      expect(await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress())).to.changeTokenBalance(usdc, user2, depositAmount2);

      // Check total assets and user balances
      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1 + depositAmount2, errorMargin);

      const user1VaultBalance = await amanaVault.balanceOf(await user1.getAddress());
      const user2VaultBalance = await amanaVault.balanceOf(await user2.getAddress());

      expect(user1VaultBalance).to.equal(depositAmount1);
      expect(user2VaultBalance).to.be.closeTo(depositAmount2, errorMargin);
    });

    it("should handle withdrawals from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);
      // User1 and User2 approve and deposit
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const withdrawAmount1 = depositAmount1 * withdrawPercent / 100n; // 1000 USDC
      const withdrawAmount2 = depositAmount2 * withdrawPercent / 100n; // 500 USDC

      // Withdraw for both users
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount1);
      expect(await amanaVault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress())).to.changeTokenBalance(usdc, user2, withdrawAmount2);

      // const vaultAssets = await amanaVault.totalAssets();
      // expect(vaultAssets).to.be.closeTo(0, errorMargin); // Vault should have no assets after withdrawals
    });

    it("should pay a fee to the owner upon withdrawal", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      // Deposit USDC into the amanaVault
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Increase time by 1 week, allowing interest to accumulate
      const ONE_WEEK_IN_SECONDS = 604800;
      await network.provider.send("evm_increaseTime", [ONE_WEEK_IN_SECONDS]);
      await network.provider.send("evm_mine"); // Mine a block after increasing time

      // Withdraw USDC from the strategy
      const withdrawAmount = depositAmount1 * withdrawPercent / 100n; // 1000 USDC
      const vaultAssetsBeforeWithdraw = await amanaVault.totalAssets();
      const profitAmount = vaultAssetsBeforeWithdraw - depositAmount1;
      const feeAmount = profitAmount * FeeRate / BigInt(10000);
      console.log(feeAmount.toString());
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, owner, feeAmount);
    });

    it("should distribute and claim rewards (time-based)", async function () {
      const { user1, depositAmount1, usdc, usdt, amanaVault, owner } = await loadFixture(setup);

      // Get the current block timestamp to calculate the reward period
      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;

      const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds (10 minutes) later
      const rewardDuration = 3600; // Reward duration: 1 hour (3600 seconds)
      const endTimestamp = startTimestamp + rewardDuration; // End rewards after 1 hour

      // Set reward token, reward duration, and reward amount
      await amanaVault.connect(owner).setRewardToken(usdt.getAddress()); // Set USDT as the reward token for testing
      await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

      // User1 deposits 1000 USDC
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Simulate time passing during the reward period
      const halfwayTime = startTimestamp + (rewardDuration / 2);
      const secondsToSimulate = halfwayTime - currentTimestamp;
      await ethers.provider.send("evm_increaseTime", [secondsToSimulate]); // Increase time by half of the reward duration
      await ethers.provider.send("evm_mine", []); // Trigger a block to update the blockchain timestamp

      const newBlock = await ethers.provider.getBlock("latest");
      const newTimestamp = newBlock.timestamp;

      // Calculate expected rewards halfway through the campaign
      const expectedRewardPerSecond = rewardAmount / BigInt(rewardDuration); // Reward per second

      const timeElapsed = newTimestamp - startTimestamp;

      const expectedReward = expectedRewardPerSecond * BigInt(timeElapsed);

      // User1 should now have accumulated rewards halfway through the campaign
      await amanaVault.connect(user1).claimRewards(user1); // Claim the rewards

      // Check the rewards balance for user1
      expect(await usdt.balanceOf(await user1.getAddress())).to.be.closeTo(expectedReward, ethers.parseUnits("1", 6)); // Allow a small margin for rounding
    });
    it("should revert on invalid strategy or treasury addresses", async function () {
      const { owner } = await loadFixture(setup);

      // Invalid strategy address
      await expect(amanaVault.setStrategy(ethers.ZeroAddress, 1))
        .to.be.revertedWithCustomError(amanaVault, "InvalidStrategyAddress");

      // Invalid treasury address
      await expect(amanaVault.updateTreasuryAddress(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(amanaVault, "InvalidTreasuryAddress");
    });

    it("should handle deposits and withdrawals of zero", async function () {
      const { user1, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), 0);

      // Deposit 0 USDC should revert
      await expect(amanaVault.connect(user1).deposit(0, await user1.getAddress()))
        .to.be.reverted;

      // Withdraw 0 USDC should revert
      await expect(amanaVault.connect(user1).withdraw(0, await user1.getAddress(), await user1.getAddress()))
        .to.be.reverted;
    });

    it("should handle vault switching", async function () {
      const { owner } = await loadFixture(setup);

      // Deploy another strategy and switch to it
      const newStrategy = await (await ethers.getContractFactory("ZcEddyStrategy", owner))
        .deploy("NewStrategy", await amanaVault.getAddress(), ZC_USDC_ETH_ADDRESS, ZC_EDDY4P_ADDRESS);

      await amanaVault.switchStrategy(newStrategy.getAddress(), 1); // Use a new chainId (for example, 1)

      const [strategyAddress, chainId] = await amanaVault.getStrategy();
      expect(strategyAddress).to.equal(await newStrategy.getAddress());
      expect(chainId).to.equal(1);
    });

    it("should handle performance fee calculation on withdrawals", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      const withdrawAmount = depositAmount1 * withdrawPercent / 100n;

      const vaultAssetsBeforeWithdraw = await amanaVault.totalAssets();
      const profitAmount = vaultAssetsBeforeWithdraw - depositAmount1;
      const feeAmount = profitAmount * FeeRate / BigInt(10000);

      // Withdraw
      await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress());

      // Check fee has been applied and treasury balance has increased
      const treasuryBalance = await usdc.balanceOf(await owner.getAddress());
      expect(treasuryBalance).to.be.closeTo(feeAmount, errorMargin);
    });

    it("should handle emergency withdrawals", async function () {
      const { owner, usdc, amanaVault, user1 } = await loadFixture(setup);

      // Transfer USDC directly to the vault
      const transferAmount = ethers.parseUnits("1000", 6); // 1000 USDC
      const vaultAddress = await amanaVault.getAddress();
      await usdc.connect(user1).transfer(vaultAddress, transferAmount); // Transfer from user1 to the vault

      // Check USDC balance in the vault before the emergency withdraw
      const vaultBalanceBefore = await usdc.balanceOf(vaultAddress);
      expect(vaultBalanceBefore).to.equal(transferAmount);

      // Owner calls emergency withdraw
      await amanaVault.connect(owner).emergencyWithdraw(usdc.getAddress());

      // Check USDC balance in the vault after the emergency withdraw
      const vaultBalanceAfter = await usdc.balanceOf(vaultAddress);
      expect(vaultBalanceAfter).to.equal(0); // Vault should be emptied

      // Check USDC balance in the owner's wallet after the emergency withdraw
      const ownerBalanceAfter = await usdc.balanceOf(await owner.getAddress());
      expect(ownerBalanceAfter).to.equal(transferAmount); // Owner should receive the withdrawn amount
    });


    it("should spend allowance correctly on withdrawals", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      // Approve and deposit
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Approve only part of the deposit amount for withdrawal
      const allowance = depositAmount1 / 2n;
      await amanaVault.connect(user1).approve(await amanaVault.getAddress(), allowance);

      // Try to withdraw more than the approved amount
      const withdrawAmount = depositAmount1;
      await expect(amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress()))
        .to.be.reverted;
    });

    it("should calculate total assets correctly", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      // Deposit assets
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Total assets in the vault should equal deposit amount
      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1, errorMargin);
    });

    it("should handle multiple deposits and withdrawals proportionally", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdc, amanaVault } = await loadFixture(setup);

      // Deposit for both users
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      await usdc.connect(user2).approve(await amanaVault.getAddress(), depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalAssetsBefore = await amanaVault.totalAssets();
      const totalSharesBefore = await amanaVault.totalSupply();

      // Withdraw for both users
      const withdrawAmount1 = depositAmount1 / 2n;
      const withdrawAmount2 = depositAmount2 / 2n;

      await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress());
      await amanaVault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress());

      const totalAssetsAfter = await amanaVault.totalAssets();
      const totalSharesAfter = await amanaVault.totalSupply();

      expect(totalAssetsAfter).to.be.lessThan(totalAssetsBefore);
      expect(totalSharesAfter).to.be.lessThan(totalSharesBefore);
    });
    it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      // Approve and deposit USDC to the vault
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Define an acceptable error margin
      const errorMargin = ethers.parseUnits("1", 6); // e.g., 1 USDC

      // Get the user's vault share balance and total assets after deposit
      const user1BalanceInitialBalance = await amanaVault.convertToAssets(await amanaVault.balanceOf(await user1.getAddress()));
      let totalAssets = await amanaVault.totalAssets();

      // Ensure initial balance and total assets are correct (with margin for small losses)
      expect(totalAssets).to.be.closeTo(depositAmount1, errorMargin);
      expect(user1BalanceInitialBalance).to.be.closeTo(depositAmount1, errorMargin);

      // First withdrawal: 1/3 of the user's current vault balance
      const firstWithdrawAmount = user1BalanceInitialBalance / 3n;
      await expect(
        amanaVault.connect(user1).withdraw(firstWithdrawAmount, await user1.getAddress(), await user1.getAddress())
      ).to.changeTokenBalance(usdc, user1, firstWithdrawAmount);

      // Second withdrawal: 1/3 of the remaining balance
      let user1Balance = await amanaVault.convertToAssets(await amanaVault.balanceOf(await user1.getAddress()));
      const secondWithdrawAmount = user1Balance / 2n;
      await expect(
        amanaVault.connect(user1).withdraw(secondWithdrawAmount, await user1.getAddress(), await user1.getAddress())
      ).to.changeTokenBalance(usdc, user1, secondWithdrawAmount);

      // Third withdrawal: Withdraw the rest of the user's balance
      user1Balance = await amanaVault.convertToAssets(await amanaVault.balanceOf(await user1.getAddress()));
      const thirdWithdrawAmount = user1Balance; // Withdraw the entire remaining balance
      console.log("Third Withdraw Amount: ", thirdWithdrawAmount.toString());
      await expect(
        amanaVault.connect(user1).withdraw(thirdWithdrawAmount, await user1.getAddress(), await user1.getAddress())
      ).to.changeTokenBalance(usdc, user1, thirdWithdrawAmount);

      // Final checks: Ensure vault is empty and user has no more shares
      const finalTotalAssets = await amanaVault.totalAssets();
      const user1FinalBalance = await amanaVault.balanceOf(await user1.getAddress());

      expect(finalTotalAssets).to.be.closeTo(0, errorMargin); // Vault should be empty (or close to empty)
      expect(user1FinalBalance).to.be.closeTo(0, errorMargin); // User should have no shares left

      const totalAssetsWithdrawn = firstWithdrawAmount + secondWithdrawAmount + thirdWithdrawAmount;
      expect(user1BalanceInitialBalance).to.be.closeTo(totalAssetsWithdrawn, 200); // User should have withdrawn the total balance
      // Trying to withdraw more should revert
      await expect(
        amanaVault.connect(user1).withdraw(1, await user1.getAddress(), await user1.getAddress())
      ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw"); // Replace with your actual error
    });
  });
});
