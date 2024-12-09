import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaConnectedChainVault, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";

import {
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
  ZC_TEST_USDC_BSC_ADDRESS,
} from "../../constants";

describe("AmanaConnectedChainVault Tests", function () {
  let amanaVault: AmanaConnectedChainVault;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ethBaseSepolia: IERC20;
  let ethSepolia: IERC20;
  let usdcBSC: IERC20;
  let withdrawZRC20: string;

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
  const SYSTEM_CONTRACT_ADDRESS = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
  const VAULT_ASSET = ZC_TEST_ETH_SEPOLIA_ADDRESS;
  const FEE_RATE = 1000;
  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from

  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
  const STRATEGY_CHAIN_ID = 11155111;

  const errorMargin = ethers.utils.parseUnits("0.00015", 18);

  before(async () => {
    // Use this function if you need global setup before tests
  });

  async function simulateDepositCallFromBase(
    user: Signer,
    depositAmount: BigNumber
  ): Promise<void> {
    // Set token balance for the vault
    await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount);

    // Execute the onCall function to simulate a deposit
    await amanaVault.onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      depositAmount,
      "0x"
    );
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
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256"],
      [await user.getAddress(), ethers.constants.AddressZero, depositAmount, 0, 0, true, totalAssetsBefore, totalAssetsBeforeBN.add(depositAmountBN), executionNonce, crossChainTxId]
    );

    await amanaVault.onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      0,
      confirmMessage
    );
  }

  async function simulateWithdrawCallFromBase(
    user: Signer,
    withdrawAmount: BigNumber
  ): Promise<void> {
    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [ZC_TEST_ETH_BASESEPOLIA_ADDRESS, withdrawAmount]
    );

    await amanaVault.onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      0,
      withdrawMessage
    )
  }

  async function simulateConfirmWithdraw(
    user: Signer,
    withdrawAmount: BigNumber,
    totalAssetsBefore: BigNumber,
    executionNonce: number,
    crossChainTxId: number
  ): Promise<any> {
    const confirmMessage2 = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256"],
      [
        await user.getAddress(),
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        withdrawAmount,
        0,
        ORIGIN_CHAIN_ID,
        false,
        totalAssetsBefore,
        totalAssetsBefore.sub(withdrawAmount),
        executionNonce,
        crossChainTxId
      ]
    );

    // Mock token balance setup for the test environment
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, withdrawAmount);

    // Return the transaction object so it can be awaited or used in tests
    return await amanaVault.onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      confirmMessage2
    );
  }


  async function setup() {
    [owner, user1, user2] = await ethers.getSigners();

    ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
    ethSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_SEPOLIA_ADDRESS);
    usdcBSC = await ethers.getContractAt("IERC20", ZC_TEST_USDC_BSC_ADDRESS);

    withdrawZRC20 = ZC_TEST_ETH_BASESEPOLIA_ADDRESS;

    const gatewayZEVM = await ethers.getContractAt(
      GatewayZEVMABI.abi,
      ZEVM_GATEWAY_ADDRESS
    );

    const GasTank = await ethers.getContractFactory("GasTank");
    const gasTank = await GasTank.deploy();
    await gasTank.deployed();

    const Vault = await ethers.getContractFactory("AmanaConnectedChainVault", owner);
    const vaultDeployTransaction = await upgrades.deployProxy(
      Vault,
      [
        "AaveV3EthVault",
        "AVU",
        VAULT_ASSET,
        await owner.getAddress(),
        FEE_RATE,
        SYSTEM_CONTRACT_ADDRESS,
        gasTank.address
      ],
      { initializer: "initialize" }
    );
    amanaVault = await vaultDeployTransaction.deployed();

    const deployReceipt = await vaultDeployTransaction.deployTransaction.wait();
    console.log(
      `Gas used for deploying AmanaConnectedChainVault: ${deployReceipt.gasUsed.toString()}`
    );
    await gasTank.authorizeVault(amanaVault.address);

    await amanaVault.setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID);

    const depositAmount1 = ethers.utils.parseUnits("0.01", 18);
    const depositAmount2 = ethers.utils.parseUnits("0.005", 18);

    const rewardAmount = BigNumber.from(1000); // Example reward amount

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20).div(1));
    await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(200).div(1));

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await owner.getAddress(), depositAmount1.mul(20).div(1));
    await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, await owner.getAddress(), depositAmount1.mul(200).div(1));
    await setTokenBalance(ZC_TEST_USDC_BSC_ADDRESS, await owner.getAddress(), depositAmount1.mul(200).div(1));

    return { owner, user1, user2, depositAmount1, depositAmount2, rewardAmount, ethBaseSepolia, ethSepolia, usdcBSC, amanaVault, gatewayZEVM, withdrawZRC20 };
  }

  describe("Cross-Chain Deposit and Withdraw Workflow", function () {
    it("should correctly initialize the vault", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      expect(await amanaVault.name()).to.equal("AaveV3EthVault");
      expect(await amanaVault.symbol()).to.equal("AVU");
      expect(await amanaVault.asset()).to.equal(ZC_TEST_ETH_SEPOLIA_ADDRESS);
      expect(await amanaVault.owner()).to.equal(await owner.getAddress());
      expect(await amanaVault.getPerfFee()).to.equal(FEE_RATE);
    });

    it("should reject unauthorized access to setStrategy", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      await expect(
        amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
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

      expect(await amanaVault.getPerfFee()).to.equal(newFeeRate);
    });

    it("should calculate and deduct the performance fee on withdrawal", async function () {
      const { user1, depositAmount1, amanaVault, ethSepolia } = await loadFixture(setup);

      // Step 1: Simulate a deposit by User1
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1.mul(20).div(1));
      await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Step 2: Simulate profit generation
      const profit = depositAmount1.div(10); // 10% profit
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, profit); // Simulate profit in the vault

      // Step 3: Perform a withdrawal and calculate the fee
      const expectedFee = profit.mul(FEE_RATE).div(10000);
      const totalAssetsBeforeWithdraw = await amanaVault.totalAssets();
      const userBalanceBeforeWithdraw = await ethSepolia.balanceOf(await user1.getAddress());

      const withdrawAmount = totalAssetsBeforeWithdraw.sub(expectedFee); // Withdraw everything except the fee
      await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress());

      // Step 4: Validate fee deduction
      const userBalanceAfterWithdraw = await ethSepolia.balanceOf(await user1.getAddress());
      const actualWithdrawn = userBalanceAfterWithdraw.sub(userBalanceBeforeWithdraw);

      expect(actualWithdrawn).to.be.closeTo(depositAmount1.add(profit).sub(expectedFee), errorMargin);

      const vaultAssetsAfterWithdraw = await amanaVault.totalAssets();
      expect(vaultAssetsAfterWithdraw).to.equal(expectedFee); // Fee should remain in the vault
    });

    it("should handle emergency withdrawal by the owner", async function () {
      const { amanaVault, owner, ethBaseSepolia } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await ethBaseSepolia.transfer(amanaVault.address, depositAmount);

      const balanceBefore = await ethBaseSepolia.balanceOf(await owner.getAddress());
      await amanaVault.connect(owner).emergencyWithdraw(ZC_TEST_ETH_BASESEPOLIA_ADDRESS);

      const balanceAfter = await ethBaseSepolia.balanceOf(await owner.getAddress());
      expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
    });

    it("should reject unauthorized emergency withdrawal", async function () {
      const { amanaVault, user1, ethBaseSepolia } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await ethBaseSepolia.transfer(amanaVault.address, depositAmount);

      await expect(
        amanaVault.connect(user1).emergencyWithdraw(ZC_TEST_ETH_BASESEPOLIA_ADDRESS)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should correctly handle _crossChainInvest revert during cross-chain deposits", async function () {
      const { user1, amanaVault } = await loadFixture(setup);
      const depositAmount = ethers.utils.parseUnits("0.1", 18);

      await simulateDepositCallFromBase(
        user1,
        depositAmount
      )

      // Simulate _crossChainInvest reverting
      const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string", "uint256", "address", "address", "uint32"],
        ["_crossChainInvestFailed", 0, await user1.getAddress(), ZC_TEST_ETH_BASESEPOLIA_ADDRESS, 84532]
      );
      // the revert will send back some ETH_SEPOLIA
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, depositAmount.mul(95).div(100));

      await expect(
        amanaVault.onRevert({
          sender: STRATEGY_ADDRESS,
          asset: VAULT_ASSET,
          revertMessage: mockRevertMessage,
          amount: 100000000n,
        })
      ).to.emit(amanaVault, "CrossChainInvestFailed").withArgs(0);
    });

    it("should reject unauthorized treasury updates", async function () {
      const { amanaVault, user1 } = await loadFixture(setup);

      const newTreasuryAddress = ethers.Wallet.createRandom().address;
      await expect(
        amanaVault.connect(user1).updateTreasuryAddress(newTreasuryAddress)
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should withdraw the maximum amount possible for a user", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      await simulateDepositCallFromBase(
        user1,
        depositAmount1
      )
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0)

      // Withdraw the maximum amount
      const maxWithdrawAmount = await amanaVault.maxWithdraw(await user1.getAddress());
      await simulateWithdrawCallFromBase(user1, maxWithdrawAmount)

      await expect(simulateConfirmWithdraw(user1, maxWithdrawAmount, depositAmount1, 2, 1))
        .to.emit(amanaVault, "ReturnFundsToUserSent")
        .to.emit(amanaVault, "Withdrawn");
    });

    it("should fail to withdraw more than the user balance", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      await simulateDepositCallFromBase(
        user1,
        depositAmount1
      )
      simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0);

      // Attempt to withdraw more than balance
      const excessiveWithdrawAmount = depositAmount1.mul(2); // Double the deposited amount

      await expect(simulateWithdrawCallFromBase(user1, excessiveWithdrawAmount))
        .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
    });

    it("should update user shares correctly after multiple deposits and withdrawals", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault } = await loadFixture(setup);
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, 0);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);

      await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user2.getAddress(), depositAmount2);

      await ethSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalDeposits = depositAmount1.add(depositAmount2);
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 1);

      // User1 withdraws part of their deposit
      const withdrawAmount1 = depositAmount1.div(2);
      await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress());

      await simulateConfirmWithdraw(user1, withdrawAmount1, totalDeposits, 3, 2);

      // Validate the remaining shares for User1
      const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
      const expectedShares = depositAmount1.sub(withdrawAmount1);
      expect(remainingShares).to.be.closeTo(expectedShares, errorMargin);
    });

    it("should handle zero balances without errors", async function () {
      const { user1, ethBaseSepolia, amanaVault } = await loadFixture(setup);

      // Simulate a withdrawal for a user with zero balance
      const zeroAmount = BigNumber.from(0);
      await expect(amanaVault.connect(user1).withdraw(zeroAmount, await user1.getAddress(), await user1.getAddress())).to.be
        .revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");

      // Deposit and then withdraw entire balance
      // await ethBaseSepolia.connect(user1).approve(amanaVault.address, zeroAmount);
      // await amanaVault.connect(user1).deposit(zeroAmount, await user1.getAddress());
      // await amanaVault.connect(user1).withdraw(zeroAmount, await user1.getAddress(), await user1.getAddress());
    });

    it("should distribute and claim rewards (time-based)", async function () {
      const { user1, depositAmount1, usdcBSC, amanaVault, owner } = await loadFixture(setup);

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
      await simulateDepositCallFromBase(user1, depositAmount1);

      // Confirm the deposit for User1
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0);

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

      await setTokenBalance(ZC_TEST_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount); // Set the reward amount

      // User1 should now have accumulated rewards halfway through the campaign
      await amanaVault.connect(user1).claimRewards(await user1.getAddress()); // Claim the rewards

      // Check the rewards balance for User1
      const userRewardBalance = await usdcBSC.balanceOf(await user1.getAddress());
      console.log("User reward balance halfway through the campaign: ", userRewardBalance.toString());
      console.log("Expected reward halfway through the campaign: ", expectedReward.toString());
      expect(userRewardBalance).to.be.closeTo(expectedReward, ethers.utils.parseUnits("1", 18)); // Allow a small margin for rounding
    });

    it("should correctly distribute rewards proportional to user shares", async function () {
      const { user1, user2, depositAmount1, depositAmount2, usdcBSC, amanaVault, owner } = await loadFixture(setup);

      const rewardAmount = ethers.utils.parseUnits("1000", 18);
      const rewardDuration = 3600; // 1 hour in seconds

      const currentBlock = await ethers.provider.getBlock("latest");
      const currentTimestamp = currentBlock.timestamp;

      const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds later
      const endTimestamp = startTimestamp + rewardDuration;

      await amanaVault.connect(owner).setRewardToken(usdcBSC.address);
      await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

      await setTokenBalance(ZC_TEST_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount);

      await simulateDepositCallFromBase(user1, depositAmount1);
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0);

      await simulateDepositCallFromBase(user2, depositAmount2);
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 1);

      const elapsedSeconds = 1800; // 30 minutes
      await ethers.provider.send("evm_increaseTime", [elapsedSeconds]); // Increase time by 30 minutes
      await ethers.provider.send("evm_mine", []);

      const totalDeposits = depositAmount1.add(depositAmount2);
      const elapsedRewardAmount = rewardAmount.mul(elapsedSeconds - 593).div(rewardDuration); // Proportional rewards based on elapsed time
      const user1Share = depositAmount1.mul(elapsedRewardAmount).div(totalDeposits);
      const user2Share = depositAmount2.mul(elapsedRewardAmount).div(totalDeposits);

      await amanaVault.connect(user1).claimRewards(await user1.getAddress());
      const user1Reward = await usdcBSC.balanceOf(await user1.getAddress());

      await amanaVault.connect(user2).claimRewards(await user2.getAddress());
      const user2Reward = await usdcBSC.balanceOf(await user2.getAddress());

      expect(user1Reward).to.be.closeTo(user1Share, ethers.utils.parseUnits("1", 18));
      expect(user2Reward).to.be.closeTo(user2Share, ethers.utils.parseUnits("1", 18));
    });

  });
});

