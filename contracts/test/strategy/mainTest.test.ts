// test/strategy.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { strategyConfigs, StrategyTestConfig } from "../config/strategy.config";
import { deployStrategyFixture, StrategyTestContext } from "./setupStrategyTest";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance, simulateDepositCallFromVaultToStrategy, simulateWithdrawCallFromVaultToStrategy, simulateSwitchCallFromVaultToStrategy } from "../utils";
import { GATEWAY_ADDRESS, WITHDRAW_HELPER_ADDRESS } from "../config/constants";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { Event } from "ethers";

const ERROR_MARGIN = ethers.BigNumber.from("2"); // 0.01% error margin or similar

strategyConfigs.forEach((config: StrategyTestConfig) => {
  describe(`${config.name}`, function () {
    let ctx: StrategyTestContext;

    beforeEach(async () => {
      ctx = await loadFixture(() => deployStrategyFixture(config));
    });

    // 🧠 Destructure useful things for each test case from `ctx`
    const getCtx = () => {
      if (!ctx) throw new Error("Test context not initialized");
      return ctx;
    };

    it("should revert if a non-gateway address tries to call onCall", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        config
      } = getCtx();

      const depositAmount = ethers.utils.parseEther("1");
      const slippage = 10000;
      const minSharesOut = ethers.utils.parseEther("0");

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      await expect(simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        owner, // put in non gateway signer
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      )).to.be.revertedWithCustomError(strategy, "OnlyGateway");

      // Attempt withdraw from a non-gateway address
      const withdrawAmountInShares = ethers.utils.parseEther("0.5");
      const minAmountOut = ethers.utils.parseEther("0.51");
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);

      const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);


      await expect(simulateWithdrawCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        owner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId
      )).to.be.revertedWithCustomError(strategy, "OnlyGateway");
    });

    it("should revert if the original sender of a deposit or withdrawal is not amanaVault", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        config
      } = getCtx();

      const depositAmount = ethers.utils.parseEther("1");
      const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);
      const minSharesOut = ethers.utils.parseEther("0.99");
      const slippage = 10000;

      const invalidSenderAddress = await owner.getAddress();

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      await expect(simulateDepositCallFromVaultToStrategy(
        invalidSenderAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      )).to.be.revertedWithCustomError(strategy, "OnlyVault");

      // Attempt a withdrawal from a non-vault sender
      const withdrawAmountInShares = ethers.utils.parseEther("0.5");
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);
      const minAmountOut = ethers.utils.parseEther("0.51");

      await expect(simulateWithdrawCallFromVaultToStrategy(
        await owner.getAddress(),
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId
      )).to.be.revertedWithCustomError(strategy, "OnlyVault");
    });

    it("should allow Gateway to invest ERC20", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        config
      } = getCtx();

      const depositAmount = ethers.BigNumber.from("1000000");
      const minSharesOut = ethers.BigNumber.from("0");
      const slippage = 10000;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      );

      let strategyBalance;

      strategyBalance = await receiptTokenContract.balanceOf(strategy.address);

      expect(strategyBalance).to.be.closeTo(depositAmount, ERROR_MARGIN);
    });

    it("should allow Gateway to withdraw ERC20", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        config
      } = getCtx();

      const depositAmount = ethers.BigNumber.from("1000000");
      const minSharesOut = ethers.BigNumber.from("0");
      const slippage = 10000;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      )
      const shares = await receiptTokenContract.balanceOf(strategy.address);
      expect(shares).to.be.gt(0); // Ensure shares were received
      const withdrawAmountInShares = ethers.utils.parseEther("1"); // represents full amount
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);

      const minAmountOut = ethers.BigNumber.from("0");

      await simulateWithdrawCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId
      );
      let strategyBalance;

      strategyBalance = await receiptTokenContract.balanceOf(strategy.address);

      expect(strategyBalance).to.equal(0);

    });

    it("should succesfully harvest when withdrawing after accumulating rewards", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        rewardsContract,
        config
      } = getCtx();

      const depositAmount = ethers.BigNumber.from("1000000");
      const minSharesOut = ethers.BigNumber.from("0");
      const slippage = 10000;

      // Step 1: Set Token Balance and Approve Strategy
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      // Step 2: Simulate Deposit
      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      );

      // Step 3: Check Initial Shares in  Pool
      const initialShares = await receiptTokenContract.balanceOf(strategy.address);
      expect(initialShares).to.be.gt(0); // Ensure shares were received

      // Step 4: Simulate Time Passing for Rewards Accumulation
      const timeToSimulate = 7 * 24 * 60 * 60; // Simulate 7 days of staking rewards
      await ethers.provider.send("evm_increaseTime", [timeToSimulate]); // Fast-forward time
      await ethers.provider.send("evm_mine", []); // Mine a new block

      const reward = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
      expect(reward.owed).to.be.gt(0); // Ensure rewards were received

      // Step 5: Check Claimable Rewards
      console.log(`Claimable Rewards: ${ethers.utils.formatUnits(reward.owed, 18)} COMP`);
      expect(reward.owed).to.be.gt(0); // Ensure some rewards have accrued

      // Step 6: Simulate Withdrawal
      const withdrawAmountInShares = initialShares; // Represents full amount
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(withdrawAmountInShares);
      const minAmountOut = ethers.BigNumber.from("0");

      await simulateWithdrawCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId
      );

      // Step 7: Check Strategy Balance After Withdrawal
      let strategyBalance;

      strategyBalance = await receiptTokenContract.balanceOf(strategy.address);
      expect(strategyBalance).to.equal(0); // Ensure strategy balance is zero

      // Step 8: Check that Rewards Were Claimed (Optional)
      const finalClaimableRewards = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
      console.log(`Final Claimable Rewards: ${ethers.utils.formatUnits(finalClaimableRewards.owed, 18)} COMP`);
      expect(finalClaimableRewards.owed).to.be.lt(reward.owed); // Rewards should have been claimed
    });

    it("should allow owner to perform emergencyWithdraw", async function () {
      const {
        inputToken,
        strategy,
        config
      } = getCtx();


      await setTokenBalance(config.inputTokenAddress, strategy.address, ethers.utils.parseEther("1"), 0);

      const initialBalance = await inputToken.balanceOf(strategy.address);
      expect(initialBalance).to.be.gt(0);

      await strategy.emergencyWithdraw(inputToken.address);

      const finalBalance = await inputToken.balanceOf(strategy.address);
      expect(finalBalance).to.equal(0);
    });

    it("should emit events on failed invest confirmation", async function () {
      const {
        gatewaySigner,
        strategy
      } = getCtx();

      const revertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string", "bytes32", "uint256", "uint256", "address", "uint256"],
        ["_investConfirmFailed", ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32), 0, 0, ethers.constants.AddressZero, 0]
      );

      const revertContext = {
        sender: strategy.address,
        asset: ethers.constants.AddressZero,
        revertMessage,
        amount: 0,
      };

      await expect(strategy.connect(gatewaySigner).onRevert(revertContext))
        .to.emit(strategy, "InvestConfirmFailed")
        .withArgs(ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32));
    });

    it("should emit event and re-invest ERC20 on _returnFundsFromStrategyFailed revert", async function () {
      const {
        gatewaySigner,
        strategy,
        receiptTokenContract,
        config
      } = getCtx();

      const revertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string", "bytes32", "uint256", "uint256", "address", "uint256"],
        ["_returnFundsFromStrategyFailed", ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32), 0, 0, ethers.constants.AddressZero, 0]
      );

      const withdrawPlusFee = ethers.BigNumber.from("1000000");

      // Fund the strategy contract with the required ERC20
      await setTokenBalance(config.inputTokenAddress, strategy.address, withdrawPlusFee, 0);

      let initialBalance;

      initialBalance = await receiptTokenContract.balanceOf(strategy.address);

      const revertContext = {
        sender: strategy.address,
        asset: config.inputTokenAddress, // the ERC20 that we were trying to do depositAndCall with
        revertMessage,
        amount: withdrawPlusFee,
      };

      await expect(strategy.connect(gatewaySigner).onRevert(revertContext))
        .to.emit(strategy, "ReturnFundsFromStrategyFailed")
        .withArgs(ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32));
    });

    it("should emit the TotalUnderlyingAssetsSent event", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        config
      } = getCtx();

      const depositAmount = ethers.BigNumber.from("1000000");

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      const minSharesOut = ethers.BigNumber.from("0");
      const slippage = 10000;

      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      );
      const shares = await receiptTokenContract.balanceOf(strategy.address);
      // Call the function
      const tx = await strategy.sendTotalUnderlyingAssetsToVault();
      await expect(tx)
        .to.emit(strategy, "TotalUnderlyingAssetsSent")
        .withArgs(
          config.amanaVaultAddress, // Exact match for vault address
          anyValue, // Use `anyValue` placeholder for the deposit amount
          (await ethers.provider.getBlockNumber()), // Expected block number
          (await ethers.provider.getBlock("latest")).timestamp // Expected block timestamp
        );

      // Capture event logs
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: Event) => e.event === "TotalUnderlyingAssetsSent");

      // Check if the event was found
      expect(event, "TotalUnderlyingAssetsSent event not found").to.not.be.undefined;
      expect(event?.args, "TotalUnderlyingAssetsSent event has no args").to.not.be.undefined;

      const emittedDepositAmount = event!.args![1]; // Second argument is the deposit amount

      // Allow some deviation from `depositAmount` (e.g., ±1%)
      const tolerance = depositAmount.div(100); // 1% tolerance
      expect(emittedDepositAmount).to.be.closeTo(depositAmount, tolerance);

    });

    it("should call GatewayEVM on manualResendConfirmation and emit an event", async function () {
      const {
        owner,
        strategy,
        config
      } = getCtx();

      // Mock data for the test
      const userAddress = await owner.getAddress();
      const amount = ethers.utils.parseEther("1000"); // 1000 tokens
      const totalUnderlyingAssetsAfter = ethers.utils.parseEther("6000");
      const executionNonce = 1;
      const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);

      // Construct the payload (outgoingMessage)
      const payload = ethers.utils.defaultAbiCoder.encode(
        [
          "address", // userAddress
          "address", // receiverAddress
          "address", // address(0) (ZRC20 token address)
          "address", // address (0) (ERC20 token address on withdraws)
          "uint256", // amount
          "uint256", // fractionOfTotalShares
          "uint32",  // withdrawChainId
          "bool",    // isInvest
          "uint256", // totalUnderlyingAssetsAfter
          "uint256", // executionNonce
          "bytes32",  // crossChainTxId
          "uint16"
        ],
        [
          ethers.constants.AddressZero,
          userAddress,
          strategy.address,
          ethers.constants.AddressZero,
          amount,
          0,
          0,
          true,
          totalUnderlyingAssetsAfter,
          executionNonce,
          crossChainTxId,
          0
        ]
      );

      // Construct the revertOptions
      const revertOptions = [
        strategy.address, // revertAddress
        false,            // callOnRevert
        strategy.address, // abortAddress
        ethers.utils.defaultAbiCoder.encode(
          ["string", "bytes32"], // Revert handler function name and crossChainTxId
          ["_investConfirmFailed", crossChainTxId]
        ),                         // revertMessage
        ethers.BigNumber.from("1000000") // onRevertGasLimit
      ];

      const gatewayEVM = await ethers.getContractAt(
        GatewayEVMABI.abi,
        GATEWAY_ADDRESS
      );

      // Call the function as the owner
      await expect(
        strategy.manualResendInvestConfirmation(
          userAddress,
          amount,
          totalUnderlyingAssetsAfter,
          executionNonce,
          crossChainTxId
        )
      )
        .to.emit(gatewayEVM, "Called") // Replace with the actual event name
      // .withArgs(
      //   strategy.address,       // From address
      //   config.amanaVaultAddress,    // Destination vault address
      //   payload,                // The encoded outgoingMessage
      //   revertOptions           // The constructed revertOptions
      // );
    });

    it("should call GatewayEVM on manualResendFundsAndDivestConfirmation and emit an event", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        config
      } = getCtx();

      // Mock data for the test
      const userAddress = await owner.getAddress();
      const withdrawZRC20 = config.withdrawZRC20; // ETH or replace with actual ZRC20 token address
      const amount = ethers.utils.parseEther("1000"); // 1000 tokens
      const fractionOfTotalShares = ethers.utils.parseEther("0.2");
      const withdrawChainId = config.originChainId; // Example chain ID
      const totalUnderlyingAssetsAfter = ethers.utils.parseEther("4000");
      const executionNonce = 1;
      const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);
      const slippage = 200;

      // Construct the payload (outgoingMessage)
      const payload = ethers.utils.defaultAbiCoder.encode(
        [
          "address", // userAddress
          "address", // receiverAddress
          "address", // withdrawZRC20
          "address", // withdrawERC20
          "uint256", // amount
          "uint256", // fractionOfTotalShares
          "uint32",  // withdrawChainId
          "bool",    // isInvest (false for divestment)
          "uint256", // totalUnderlyingAssetsAfter
          "uint256", // executionNonce
          "bytes32",  // crossChainTxId
          "uint16" // slippage
        ],
        [
          userAddress,
          userAddress,
          withdrawZRC20,
          ethers.constants.AddressZero,
          amount,
          fractionOfTotalShares,
          withdrawChainId,
          false,
          totalUnderlyingAssetsAfter,
          executionNonce,
          crossChainTxId,
          slippage
        ]
      );

      // Construct the revertOptions
      const revertOptions = [
        strategy.address, // revertAddress
        true,             // callOnRevert
        strategy.address, // abortAddress
        ethers.utils.defaultAbiCoder.encode(
          ["string", "bytes32"], // Revert handler function name and crossChainTxId
          ["_returnFundsFromStrategyFailed", crossChainTxId]
        ),                         // revertMessage
        ethers.BigNumber.from("1000000") // onRevertGasLimit
      ];

      const gatewayEVM = await ethers.getContractAt(
        GatewayEVMABI.abi,
        GATEWAY_ADDRESS
      );

      await setTokenBalance(config.inputTokenAddress, strategy.address, ethers.utils.parseEther("1010"), 0);
      // await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      // Call the function as the owner
      await expect(
        strategy.manualResendFundsAndDivestConfirmation(
          userAddress,
          userAddress,
          withdrawZRC20,
          ethers.constants.AddressZero,
          amount,
          fractionOfTotalShares,
          withdrawChainId,
          totalUnderlyingAssetsAfter,
          executionNonce,
          crossChainTxId,
          slippage
        )
      )
        .to.emit(gatewayEVM, "DepositedAndCalled") // Replace with the actual event name
      // .withArgs(
      //   strategy.address,       // From address
      //   config.amanaVaultAddress,    // Destination vault address
      //   amount,             // Amount to be deposited
      //   config.inputTokenAddress, // ZRC20 token address
      //   payload,                // The encoded outgoingMessage
      //   revertOptions           // The array-formatted revertOptions
      // );
    });

    it("should transfer Assets to new strategy on strategy switch via onCall", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        swapHelper,
        receiptTokenContract,
        config
      } = getCtx();

      const depositAmount = ethers.BigNumber.from("1000000");
      const minSharesOut = ethers.BigNumber.from("0");
      const slippage = 10000;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
      );
      const oldStrategyInitialBalance = await receiptTokenContract.balanceOf(strategy.address);

      const StrategyFactory = await ethers.getContractFactory("ERC20_Compound_Strategy");

      const newStrategy = await StrategyFactory.deploy(
        "ERC20_Compound_Strategy",
        config.amanaVaultAddress,
        config.inputTokenAddress,
        config.receiptTokenAddress,
        GATEWAY_ADDRESS,
        WITHDRAW_HELPER_ADDRESS,
        swapHelper.address
      );
      await newStrategy.deployed();

      await newStrategy.connect(owner).setOldStrategy(strategy.address);

      await expect(simulateSwitchCallFromVaultToStrategy(
        config.amanaVaultAddress,
        gatewaySigner,
        strategy,
        newStrategy.address
      )).to.emit(strategy, "AssetsTransferredToNewStrategy")
        .to.emit(newStrategy, "FundsInvested");

      const oldStrategyBalance = await receiptTokenContract.balanceOf(strategy.address);
      expect(oldStrategyBalance).to.equal(0);
      const newStrategyBalance = await receiptTokenContract.balanceOf(newStrategy.address);
      expect(newStrategyBalance).to.be.closeTo(oldStrategyInitialBalance, ethers.utils.parseUnits("0.001", 18));
    });

    it("should harvest and reinvest rewards when called externally", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        rewardsContract,
        config
      } = getCtx();

      const depositAmount = ethers.utils.parseUnits("1000000", 6); // USDC has 6 decimals
      const slippage = 10000;
      const minSharesOut = ethers.BigNumber.from("0");

      // Step 1: Set Token Balance and Approve
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      // Step 2: Deposit
      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId
      );

      // Step 3: Accumulate Rewards
      const timeToSimulate = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [timeToSimulate]);
      await ethers.provider.send("evm_mine", []);

      const preHarvestReward = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
      expect(preHarvestReward.owed).to.be.gt(0);

      // Step 4: Call harvest externally
      const tx = await strategy.connect(gatewaySigner).harvest();
      await tx.wait();

      // Step 5: Confirm Rewards Harvested Event
      const receipt = await tx.wait();
      const event = receipt.events?.find((e: Event) => e.event === "RewardsHarvested");
      expect(event).to.not.be.undefined;

      if (!event) {
        throw new Error("Event not found");
      }

      const [compAmount, , usdcReceived] = event.args!;
      console.log("COMP harvested:", ethers.utils.formatEther(compAmount));
      console.log("USDC reinvested:", ethers.utils.formatUnits(usdcReceived, 6));

      expect(compAmount).to.be.gt(0);
      expect(usdcReceived).to.be.gt(0);
    });

    it("should claim rewards when claimRewards is called externally", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        rewardsContract,
        config
      } = getCtx();

      const depositAmount = ethers.utils.parseUnits("1000000", 6);
      const slippage = 10000;
      const minSharesOut = ethers.BigNumber.from("0");

      // Step 1: Set Token Balance and Approve
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, 0);
      await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

      // Step 2: Deposit
      await simulateDepositCallFromVaultToStrategy(
        config.amanaVaultAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId
      );

      // Step 3: Accumulate Rewards
      const timeToSimulate = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [timeToSimulate]);
      await ethers.provider.send("evm_mine", []);

      const rewardBeforeClaim = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
      expect(rewardBeforeClaim.owed).to.be.gt(0);

      // Step 4: Call claimRewards externally
      const claimedAmount = await strategy.connect(gatewaySigner).callStatic.claimRewards();
      console.log("Claimed COMP amount:", ethers.utils.formatEther(claimedAmount));
      expect(claimedAmount).to.be.gt(0);

      // Step 5: Execute for real and verify COMP balance
      await strategy.connect(gatewaySigner).claimRewards();
      if (!config.rewardsTokenAddress) {
        throw new Error("Rewards token address is not defined in the config");
      }
      const rewardsToken = await ethers.getContractAt("IERC20", config.rewardsTokenAddress, gatewaySigner);
      const rewardsTokenBalance = await rewardsToken.balanceOf(strategy.address);
      expect(rewardsTokenBalance).to.be.gte(claimedAmount);
    });


    // Add more shared tests here (or conditionally based on strategy type)
  });
});
