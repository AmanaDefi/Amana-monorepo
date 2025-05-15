// test/strategy.test.ts
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { strategyConfigs, StrategyTestConfig } from "../config/strategy.config";
import { deployStrategyFixture, StrategyTestContext, deployStrategyFromConfig } from "./setupStrategyTest";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance, simulateDepositCallFromVaultToStrategy, simulateWithdrawCallFromVaultToStrategy, simulateSwitchCallFromVaultToStrategy, isConvexStrategy } from "../utils";
import { AMANA_VAULT_ADDRESS } from "../config/constants";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import type { Event } from "ethers";

const ERROR_MARGIN = ethers.BigNumber.from("2"); // 0.01% error margin or similar

strategyConfigs.forEach((config: StrategyTestConfig) => {
  describe(`${config.name}`, function () {
    let ctx: StrategyTestContext;

    // 👇 Define a named fixture wrapper
    async function strategyFixture() {
      return await deployStrategyFixture(config);
    }

    beforeEach(async () => {
      ctx = await loadFixture(strategyFixture);
    });

    it("should revert if a non-gateway address tries to call onCall", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        config
      } = ctx;

      const depositAmount = config.depositAmount;
      const slippage = config.slippage;
      const minSharesOut = config.minSharesOut;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }
      console.log("1")
      await expect(simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        owner, // put in non gateway signer
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      )).to.be.revertedWithCustomError(strategy, "OnlyGateway");
      console.log("2")
      // Attempt withdraw from a non-gateway address
      const withdrawAmountInShares = config.withdrawAmount;
      const minAmountOut = config.minAmountOut;
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);

      const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);


      await expect(simulateWithdrawCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        owner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId,
        2
      )).to.be.revertedWithCustomError(strategy, "OnlyGateway");
    });

    it("should revert if the original sender of a deposit or withdrawal is not amanaVault", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        config
      } = ctx;

      const depositAmount = config.depositAmount;
      const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);
      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      const invalidSenderAddress = await owner.getAddress();

      if (!config.isNative) {
        await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      await expect(simulateDepositCallFromVaultToStrategy(
        invalidSenderAddress,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      )).to.be.revertedWithCustomError(strategy, "OnlyVault");

      // Attempt a withdrawal from a non-vault sender
      const withdrawAmountInShares = config.withdrawAmount;
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);
      const minAmountOut = config.minAmountOut;

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
        config.originChainId,
        2
      )).to.be.revertedWithCustomError(strategy, "OnlyVault");
    });

    it("should allow Gateway to invest ERC20", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        rewardsContract,
        config
      } = ctx;

      const depositAmount = config.depositAmount;
      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      let strategyBalanceBefore;
      if (isConvexStrategy(config.strategyContractName)) {
        strategyBalanceBefore = await rewardsContract.balanceOf(strategy.address);
      } else {
        strategyBalanceBefore = await receiptTokenContract.balanceOf(strategy.address);
      }

      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );

      let strategyBalanceAfter;
      if (isConvexStrategy(config.strategyContractName)) {
        strategyBalanceAfter = await rewardsContract.balanceOf(strategy.address);
      } else {
        strategyBalanceAfter = await receiptTokenContract.balanceOf(strategy.address);
      }

      expect(strategyBalanceAfter).to.be.gt(strategyBalanceBefore);
    });

    it("should allow Gateway to withdraw ERC20", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        rewardsContract,
        config
      } = ctx;

      const depositAmount = config.depositAmount;
      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      )
      let shares;
      if (isConvexStrategy(config.strategyContractName)) {
        shares = await rewardsContract.balanceOf(strategy.address);
      } else {
        shares = await receiptTokenContract.balanceOf(strategy.address);
      }
      expect(shares).to.be.gt(0); // Ensure shares were received
      const withdrawAmountInShares = config.withdrawAmount;
      const withdrawFractionOfTotalShares = ethers.utils.parseEther("1"); // represents full amount

      const minAmountOut = config.minAmountOut;

      await simulateWithdrawCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId,
        2
      );
      let strategyBalance;

      strategyBalance = await receiptTokenContract.balanceOf(strategy.address);
      let rewardsContractBalance;
      if (isConvexStrategy(config.strategyContractName)) {
        rewardsContractBalance = await rewardsContract.balanceOf(strategy.address);
        expect(rewardsContractBalance).to.equal(0);

      }
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
      } = ctx;
      if (config.rewardsContractAddress === undefined) {
        console.info("Skipping test as rewardsContractAddress is not defined");
        this.skip(); // Skip the test if rewardsContractAddress is not defined
      }
      const depositAmount = config.depositAmount;
      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      // Step 1: Set Token Balance and Approve Strategy
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      // Step 2: Simulate Deposit
      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );

      // Step 3: Check Initial Shares in  Pool
      let initialShares;
      if (isConvexStrategy(config.strategyContractName)) {
        initialShares = await rewardsContract.balanceOf(strategy.address);
      } else {
        initialShares = await receiptTokenContract.balanceOf(strategy.address);
      }

      expect(initialShares).to.be.gt(0); // Ensure shares were received

      // Step 4: Simulate Time Passing for Rewards Accumulation
      const timeToSimulate = 7 * 24 * 60 * 60; // Simulate 7 days of staking rewards
      await ethers.provider.send("evm_increaseTime", [timeToSimulate]); // Fast-forward time
      await ethers.provider.send("evm_mine", []); // Mine a new block

      // Step 5: Check Claimable Rewards
      let reward;
      if (config.strategyContractName === "ERC20_Compound_Strategy") {
        reward = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
        reward = reward.owed;
      } else if (config.strategyContractName === "ConvexERC20StrategyArbitrum") {
        await rewardsContract.earned(strategy.address);
        // This is needed to update the internal state of the contract
        // before calling claimable_reward
        reward = await rewardsContract.claimable_reward(config.rewardsTokenAddress, strategy.address);
      } else {
        reward = await strategy.checkRewards();
      }

      // Step 6: Simulate Withdrawal
      const withdrawAmountInShares = initialShares; // Represents full amount - note this is just vault shares - withdrawal is determined by fraction
      const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(withdrawAmountInShares);
      const minAmountOut = config.minAmountOut;

      await simulateWithdrawCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        config.withdrawZRC20,
        withdrawAmountInShares,
        withdrawFractionOfTotalShares,
        minAmountOut,
        slippage,
        config.originChainId,
        2
      );

      // Step 7: Check Strategy Balance After Withdrawal
      let strategyBalance;
      if (isConvexStrategy(config.strategyContractName)) {
        strategyBalance = await rewardsContract.balanceOf(strategy.address);
      } else {
        strategyBalance = await receiptTokenContract.balanceOf(strategy.address);
      }
      expect(strategyBalance).to.equal(0); // Ensure strategy balance is zero

      // Step 8: Check that Rewards Were Claimed (Optional)
      let finalClaimableRewards;
      if (config.strategyContractName === "ERC20_Compound_Strategy") {
        finalClaimableRewards = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
        finalClaimableRewards = finalClaimableRewards.owed;
      } else if (config.strategyContractName === "ConvexERC20StrategyArbitrum") {
        await rewardsContract.earned(strategy.address);
        // This is needed to update the internal state of the contract
        // before calling claimable_reward
        finalClaimableRewards = await rewardsContract.claimable_reward(config.rewardsTokenAddress, strategy.address);
      } else {
        finalClaimableRewards = await strategy.checkRewards();
      }
      expect(finalClaimableRewards).to.be.lt(reward); // Rewards should have been claimed
    });

    it("should allow owner to perform emergencyWithdraw", async function () {
      const {
        strategy,
        config
      } = ctx;


      await setTokenBalance(config.otherErc20Address, strategy.address, ethers.BigNumber.from("1000000"), config.otherErc20BalanceStorageSlot, false);
      const otherERC20Contract = await ethers.getContractAt("IERC20", config.otherErc20Address);
      const initialBalance = await otherERC20Contract.balanceOf(strategy.address);
      expect(initialBalance).to.be.gt(0);

      await strategy.emergencyWithdraw(config.otherErc20Address);

      const finalBalance = await otherERC20Contract.balanceOf(strategy.address);
      expect(finalBalance).to.equal(0);
    });

    it("should emit events on failed invest confirmation", async function () {
      const {
        gatewaySigner,
        strategy
      } = ctx;

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
      } = ctx;

      const revertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string", "bytes32", "uint256", "uint256", "address", "uint256"],
        ["_returnFundsFromStrategyFailed", ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32), 0, 0, ethers.constants.AddressZero, 0]
      );

      const withdrawPlusFee = config.depositAmount;

      // Fund the strategy contract with the required ERC20
      await setTokenBalance(config.inputTokenAddress, strategy.address, withdrawPlusFee, config.inputTokenStorageSlot, config.isNative);

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
      } = ctx;

      const depositAmount = config.depositAmount;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );
      // Call the function
      const tx = await strategy.sendTotalUnderlyingAssetsToVault();
      await expect(tx)
        .to.emit(strategy, "TotalUnderlyingAssetsSent")
        .withArgs(
          AMANA_VAULT_ADDRESS, // Exact match for vault address
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
      } = ctx;

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
        config.depositAmount // onRevertGasLimit
      ];

      const gatewayEVM = await ethers.getContractAt(
        GatewayEVMABI.abi,
        config.gatewayAddress
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
      //   AMANA_VAULT_ADDRESS,    // Destination vault address
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
      } = ctx;

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
        config.depositAmount // onRevertGasLimit
      ];

      const gatewayEVM = await ethers.getContractAt(
        GatewayEVMABI.abi,
        config.gatewayAddress
      );

      await setTokenBalance(config.inputTokenAddress, strategy.address, ethers.utils.parseEther("1010"), config.inputTokenStorageSlot, config.isNative);
      // if (!config.isNative) {
      //   await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      // }

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
      //   AMANA_VAULT_ADDRESS,    // Destination vault address
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
        rewardsContract,
        config
      } = ctx;

      const depositAmount = config.depositAmount;
      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );
      let oldStrategyInitialBalance;
      if (isConvexStrategy(config.strategyContractName)) {
        oldStrategyInitialBalance = await rewardsContract.balanceOf(strategy.address);
      } else {
        oldStrategyInitialBalance = await receiptTokenContract.balanceOf(strategy.address);
      }
      const newStrategy = await deployStrategyFromConfig(config, swapHelper);

      await newStrategy.connect(owner).setOldStrategy(strategy.address);

      await expect(simulateSwitchCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        gatewaySigner,
        strategy,
        newStrategy.address,
        2
      )).to.emit(strategy, "AssetsTransferredToNewStrategy")
        .to.emit(newStrategy, "AssetsReceivedFromOldStrategy");
      let oldStrategyBalance;
      if (isConvexStrategy(config.strategyContractName)) {
        oldStrategyBalance = await rewardsContract.balanceOf(strategy.address);
      } else {
        oldStrategyBalance = await receiptTokenContract.balanceOf(strategy.address);
      }

      expect(oldStrategyBalance).to.equal(0);

      let newStrategyBalance;
      if (isConvexStrategy(config.strategyContractName)) {
        newStrategyBalance = await rewardsContract.balanceOf(newStrategy.address);
      } else {
        newStrategyBalance = await receiptTokenContract.balanceOf(newStrategy.address);
      }
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
      } = ctx;
      if (config.rewardsContractAddress === undefined) {
        console.info("Skipping test as rewardsContractAddress is not defined");
        this.skip(); // Skip the test if rewardsContractAddress is not defined
      }
      const depositAmount = config.depositAmount; // USDC has 6 decimals
      const slippage = config.slippage;
      const minSharesOut = config.minSharesOut;

      // Step 1: Set Token Balance and Approve
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      // Step 2: Deposit
      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );

      // Step 3: Accumulate Rewards
      const timeToSimulate = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [timeToSimulate]);
      await ethers.provider.send("evm_mine", []);
      let preHarvestReward;
      if (config.strategyContractName === "ERC20_Compound_Strategy") {
        preHarvestReward = await rewardsContract.callStatic.getRewardOwed(config.receiptTokenAddress, strategy.address);
        preHarvestReward = preHarvestReward.owed;
        console.log("preHarvestReward", preHarvestReward.toString());
      } else if (config.strategyContractName === "ConvexERC20StrategyArbitrum") {
        await rewardsContract.earned(strategy.address);
        // This is needed to update the internal state of the contract
        // before calling claimable_reward
        preHarvestReward = await rewardsContract.claimable_reward(config.rewardsTokenAddress, strategy.address);
      } else {
        preHarvestReward = await strategy.checkRewards();
      }
      expect(preHarvestReward).to.be.gt(0);

      // Step 4: Call harvest externally
      const tx = await strategy.connect(gatewaySigner).harvest();
      await tx.wait();

      // Step 5: Confirm Rewards Harvested Event
      const receipt = await tx.wait();
      console.log("receipt", receipt);
      const event = receipt.events?.find((e: Event) => e.event === "RewardsHarvested");
      expect(event).to.not.be.undefined;

      if (!event) {
        throw new Error("Event not found");
      }

      const [, claimedAmount, usdcReceived] = event.args!;

      expect(claimedAmount).to.be.gt(0);
      expect(usdcReceived).to.be.gt(0);
    });

    it("should claim rewards when claimRewards is called externally", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        config
      } = ctx;
      if (config.rewardsContractAddress === undefined || config.rewardsTokenAddress === undefined) {
        console.info("Skipping test as rewardsContractAddress is not defined");
        this.skip(); // Skip the test if rewardsContractAddress is not defined
      }
      const depositAmount = config.depositAmount;
      const slippage = config.slippage;
      const minSharesOut = config.minSharesOut;

      // Step 1: Set Token Balance and Approve
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      // Step 2: Deposit
      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );
      // Step 3: Accumulate Rewards
      const timeToSimulate = 7 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [timeToSimulate]);
      await ethers.provider.send("evm_mine", []);

      const rewardsToken = await ethers.getContractAt("IERC20", config.rewardsTokenAddress, gatewaySigner);
      const rewardsTokenBalanceBefore = await rewardsToken.balanceOf(strategy.address);
      expect(rewardsTokenBalanceBefore).to.eq(0);

      // Step 5: Execute for real and verify RewardToken balance
      await strategy.claimRewards();
      if (!config.rewardsTokenAddress) {
        throw new Error("Rewards token address is not defined in the config");
      }
      const rewardsTokenBalanceAfter = await rewardsToken.balanceOf(strategy.address);
      expect(rewardsTokenBalanceAfter).to.be.gte(rewardsTokenBalanceBefore);
    });

    it("should return 0 shares when calling convertToShares with 0 assets and no deposits", async function () {
      const { strategy } = ctx;

      const shares = await strategy.convertToShares(0);
      expect(shares).to.equal(0);
    });

    it("should return 0 assets when calling convertToAssets with 0 shares and no deposits", async function () {
      const { strategy } = ctx;

      const assets = await strategy.convertToAssets(0);
      expect(assets).to.equal(0);
    });

    it("should return correct shares and assets after deposit", async function () {
      const {
        gatewaySigner,
        owner,
        inputToken,
        strategy,
        receiptTokenContract,
        config
      } = ctx;

      const depositAmount = config.depositAmount;
      const minSharesOut = config.minSharesOut;
      const slippage = config.slippage;

      // Fund and approve
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), depositAmount, config.inputTokenStorageSlot, config.isNative);
      if (!config.isNative) {
        await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
      }

      // Simulate deposit
      await simulateDepositCallFromVaultToStrategy(
        AMANA_VAULT_ADDRESS,
        await owner.getAddress(),
        gatewaySigner,
        strategy,
        depositAmount,
        minSharesOut,
        slippage,
        config.originChainId,
        1
      );

      // Run convertToShares
      const expectedShares = await strategy.convertToShares(depositAmount);
      expect(expectedShares).to.be.gt(0);

      // Run convertToAssets
      const expectedAssets = await strategy.convertToAssets(expectedShares);
      expect(expectedAssets).to.be.closeTo(depositAmount, depositAmount.div(100)); // 1% tolerance
    });

    // Add more shared tests here (or conditionally based on strategy type)
  });
});
