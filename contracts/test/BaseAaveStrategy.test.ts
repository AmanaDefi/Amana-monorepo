import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { AmanaVault, BaseAaveStrategy, IERC20 } from "../typechain";

import { BASE_USDC_ADDRESS } from "../../constants";
import { BASE_USDT_ADDRESS } from "../../constants";

import { BASE_AAVE_RECEIPT_TOKEN_ADDRESS } from "../../constants";
import { BASE_USDC_HOLDER_ADDRESS } from "../../constants";
import { BASE_USDT_HOLDER_ADDRESS } from "../../constants";

describe("Vault and BaseAaveStrategy", function () {
  let amanaVault: AmanaVault;
  let strategy: BaseAaveStrategy;
  let usdc: IERC20;
  let usdt: IERC20;
  let aaveToken: IERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 5;
  const FeeRate = BigInt(1000); // 10% fee
  const rewardAmount = ethers.parseUnits("100", 6);
  const BASE_CHAIN_ID = 8453;

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

  describe("BaseAaveStrategy Investment", function () {
    async function setup() {
      // Get signers
      [owner, user1, user2] = await ethers.getSigners();

      // Forked USDC contract and Aave Pool
      usdc = await ethers.getContractAt("IERC20", BASE_USDC_ADDRESS);
      aaveToken = await ethers.getContractAt("IERC20", BASE_AAVE_RECEIPT_TOKEN_ADDRESS);

      // Deploy the AmanaVault using OpenZeppelin's upgrade proxy pattern
      const Vault = await ethers.getContractFactory("AmanaVault", owner);
      // Use the upgrades library to deploy the proxy
      amanaVault = await upgrades.deployProxy(
        Vault,
        ["AaveV3USDCVault", "AVU", BASE_USDC_ADDRESS, await owner.getAddress(), FeeRate],
        { initializer: "initialize" }
      );

      // Deploy BaseAaveStrategy contract and set the amanaVault address
      const BaseAaveStrategy = await ethers.getContractFactory("BaseAaveStrategy", owner);
      strategy = await BaseAaveStrategy.deploy("AaveV3USDC", await amanaVault.getAddress(), BASE_USDC_ADDRESS, BASE_AAVE_RECEIPT_TOKEN_ADDRESS);

      // Set the strategy address in the amanaVault
      const network = await ethers.provider.getNetwork();

      const chainId = network.chainId;
      console.log("Chain ID: ", chainId);
      await amanaVault.setStrategy(await strategy.getAddress(), chainId);

      // Impersonate USDC holder
      const usdcHolder = await ethers.getImpersonatedSigner(BASE_USDC_HOLDER_ADDRESS);

      // Set the initial balances for user1 and user2
      const depositAmount1 = ethers.parseUnits("1000", 6); // 1000 USDC for user1
      const depositAmount2 = ethers.parseUnits("500", 6); // 500 USDC for user2

      await usdc.connect(usdcHolder).transfer(await user1.getAddress(), depositAmount1);
      await usdc.connect(usdcHolder).transfer(await user2.getAddress(), depositAmount2);

      const usdtHolder = await ethers.getImpersonatedSigner(BASE_USDT_HOLDER_ADDRESS);
      usdt = await ethers.getContractAt("IERC20", BASE_USDT_ADDRESS);

      const vaultAddress = await amanaVault.getAddress();
      await usdt.connect(usdtHolder).transfer(vaultAddress, rewardAmount);
      return { owner, user1, user2, depositAmount1, depositAmount2, usdc, usdt, amanaVault };
    }
    it("should invest USDC into Aave via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);

      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      // Deposit USDC into the amanaVault
      expect(await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.changeTokenBalance(usdc, user1, depositAmount1);

      // Check that the strategy has invested in Aave
      const aBaseUSDCBalance = await aaveToken.balanceOf(await strategy.getAddress());

      expect(aBaseUSDCBalance).to.be.closeTo(depositAmount1, errorMargin); // Should have 1000 aBaseUSDC tokens after investment
      expect(await amanaVault.totalAssets()).to.be.closeTo(depositAmount1, errorMargin); // Vault should have the same amount of assets
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1); // User should have 1000 amanaVault shares
    });

    it("should withdraw USDC from Aave via the strategy", async function () {
      const { user1, depositAmount1, usdc, amanaVault } = await loadFixture(setup);
      await usdc.connect(user1).approve(await amanaVault.getAddress(), depositAmount1);

      // Deposit USDC into the amanaVault
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      const withdrawAmount = depositAmount1; // 1000 USDC

      let aBaseUSDCBalance = await aaveToken.balanceOf(await strategy.getAddress());
      // Withdraw USDC from the strategy
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount);
      aBaseUSDCBalance = await aaveToken.balanceOf(await strategy.getAddress());

      // Check that USDC is back in the amanaVault
      expect(aBaseUSDCBalance).to.be.closeTo(0, errorMargin); // Should have 0 aBaseUSDC tokens after investment
      expect(await amanaVault.totalAssets()).to.be.closeTo(0, errorMargin); // Vault should have close to 0 assets (small amount of interest)
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(0); // User should have 0 amanaVault shares
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

      const withdrawAmount1 = depositAmount1; // 1000 USDC
      const withdrawAmount2 = depositAmount2; // 500 USDC

      // Withdraw for both users
      expect(await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(usdc, user1, withdrawAmount1);
      expect(await amanaVault.connect(user2).withdraw(withdrawAmount2, await user2.getAddress(), await user2.getAddress())).to.changeTokenBalance(usdc, user2, withdrawAmount2);

      const vaultAssets = await amanaVault.totalAssets();
      expect(vaultAssets).to.be.closeTo(0, errorMargin); // Vault should have no assets after withdrawals
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
      const withdrawAmount = depositAmount1; // 1000 USDC
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

  });
});
