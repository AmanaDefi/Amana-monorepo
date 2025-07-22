// test/intelligent/intelligentStrategy.test.ts

import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { intelligentStrategyConfigs } from "../config/intelligentStrategy.config";
import { deployIntelligentStrategyFixture, IntelligentStrategyTestContext } from "./setupIntelligentStrategyTest";
import { setTokenBalance } from "../utils";
import { ethers } from "hardhat";

intelligentStrategyConfigs.forEach((config) => {
  describe(`${config.name}`, function () {
    let ctx: IntelligentStrategyTestContext;

    async function strategyFixture() {
      return await deployIntelligentStrategyFixture(config);
    }

    beforeEach(async () => {
      ctx = await loadFixture(strategyFixture);
    });

    it("should deploy and hold deposit tokens", async function () {
      const { gatewaySigner, strategy, inputToken, config } = ctx;

      // Fund gateway signer with tokens
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), config.depositAmount, config.inputTokenStorageSlot, config.isNative);
      await inputToken.connect(gatewaySigner).approve(strategy.address, config.depositAmount);

      await inputToken.connect(gatewaySigner).transfer(strategy.address, config.depositAmount);

      const balance = await inputToken.balanceOf(strategy.address);
      expect(balance).to.equal(config.depositAmount);
    });

    it("should allow the owner to set valid module allocations", async function () {
      const { owner, strategy, moduleContracts } = ctx;

      const allocations = [
        {
          module: moduleContracts[0].address,
          bps: 10000
        }
      ];

      await expect(strategy.connect(owner).setAllocations(allocations))
        .to.not.be.reverted;

      const result1 = await strategy.getAllocations();
      expect(result1.length).to.equal(1);
      expect(result1[0].module).to.equal(moduleContracts[0].address);
      expect(result1[0].bps).to.equal(10000);


      const result = await strategy.getAllocations();
      expect(result.length).to.equal(1);
      expect(result[0].module).to.equal(moduleContracts[0].address);
      expect(result[0].bps).to.equal(10000);
    });

    it("should revert if allocation total bps != 10000", async function () {
      const { owner, strategy, moduleContracts } = ctx;

      const allocations = [
        {
          module: moduleContracts[0].address,
          bps: 9000
        }
      ];

      await expect(strategy.connect(owner).setAllocations(allocations)).to.be.revertedWith("Total allocation must be 10000 bps");
    });

    it("should revert if allocation contains zero address", async function () {
      const { owner, strategy } = ctx;

      const allocations = [
        {
          module: ethers.constants.AddressZero,
          bps: 10000
        }
      ];

      await expect(strategy.connect(owner).setAllocations(allocations)).to.be.revertedWith("Invalid module");
    });

    it("should execute a deposit rebalance successfully", async function () {
      const { gatewaySigner, strategy, moduleContracts, inputToken, config } = ctx;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), config.depositAmount, config.inputTokenStorageSlot, config.isNative);
      await inputToken.connect(gatewaySigner).approve(strategy.address, config.depositAmount);
      await inputToken.connect(gatewaySigner).transfer(strategy.address, config.depositAmount);
      console.log("Deposit amount:", config.depositAmount.toString());
      await strategy.setAllocations([
        {
          module: moduleContracts[0].address,
          bps: 10000
        }
      ]);

      const rebalanceInstructions = [
        {
          module: moduleContracts[0].address,
          inputToken: config.inputTokenAddress,
          amount: config.depositAmount,
          minOut: 0,
          action: 0 // Deposit
        }
      ];
      console.log("Rebalance instructions:", rebalanceInstructions);
      await expect(strategy.rebalance(rebalanceInstructions)).to.emit(strategy, "RebalanceExecuted");
    });

    it("should revert deposit rebalance if not enough balance", async function () {
      const { strategy, moduleContracts, config } = ctx;

      await strategy.setAllocations([
        {
          module: moduleContracts[0].address,
          bps: 10000
        }
      ]);

      const rebalanceInstructions = [
        {
          module: moduleContracts[0].address,
          inputToken: config.inputTokenAddress,
          amount: config.depositAmount, // too high
          minOut: 0,
          action: 0 // Deposit
        }
      ];

      await expect(strategy.rebalance(rebalanceInstructions)).to.be.revertedWith("Insufficient balance for deposit");
    });

    it("should call claimAllRewards on all modules", async function () {
      const { strategy, owner, moduleContracts } = ctx;

      await strategy.connect(owner).setAllocations([
        {
          module: moduleContracts[0].address,
          bps: 10000
        }
      ]);

      await expect(strategy.connect(owner).claimAllRewards()).to.not.be.reverted;
    });

    it("should include uninvested funds in totalUnderlyingAssets()", async function () {
      const { gatewaySigner, strategy, inputToken, config } = ctx;

      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), config.depositAmount, config.inputTokenStorageSlot, config.isNative);
      await inputToken.connect(gatewaySigner).approve(strategy.address, config.depositAmount);
      await inputToken.connect(gatewaySigner).transfer(strategy.address, config.depositAmount);

      const result = await strategy.totalUnderlyingAssets();
      expect(result).to.equal(config.depositAmount);
    });

    it("should set allocations for two modules", async function () {
      const { strategy, moduleContracts, owner } = ctx;

      const allocations = [
        { module: moduleContracts[0].address, bps: 6000 },
        { module: moduleContracts[1].address, bps: 4000 }
      ];

      await expect(strategy.connect(owner).setAllocations(allocations))
        .to.not.be.reverted;

      const onchainAllocations = await strategy.getAllocations();
      expect(onchainAllocations.length).to.equal(2);
      expect(onchainAllocations[0].bps).to.equal(6000);
      expect(onchainAllocations[1].bps).to.equal(4000);
    });

    it("should rebalance deposits across both modules", async function () {
      const { strategy, moduleContracts, inputToken, gatewaySigner, config, owner } = ctx;

      const allocations = [
        { module: moduleContracts[0].address, bps: 5000 },
        { module: moduleContracts[1].address, bps: 5000 }
      ];
      await strategy.connect(owner).setAllocations(allocations);

      // Fund the strategy with deposit tokens
      await setTokenBalance(config.inputTokenAddress, await gatewaySigner.getAddress(), config.depositAmount, config.inputTokenStorageSlot, config.isNative);
      await inputToken.connect(gatewaySigner).transfer(strategy.address, config.depositAmount);

      // Send rebalance instructions
      const amountPerModule = config.depositAmount.div(2);
      const instructions = [
        {
          module: moduleContracts[0].address,
          inputToken: config.inputTokenAddress,
          amount: amountPerModule,
          minOut: 1,
          action: 0 // Deposit
        },
        {
          module: moduleContracts[1].address,
          inputToken: config.inputTokenAddress,
          amount: amountPerModule,
          minOut: 1,
          action: 0 // Deposit
        }
      ];

      await expect(strategy.connect(owner).rebalance(instructions))
        .to.emit(strategy, "RebalanceExecuted");
    });

    it("should withdraw funds via rebalance from one module", async function () {
      const { strategy, moduleContracts, inputToken, owner, config, gatewaySigner } = ctx;

      // Allocate 100% to the first module
      const allocations = [
        { module: moduleContracts[0].address, bps: 10000 }
      ];
      await strategy.connect(owner).setAllocations(allocations);

      // Fund strategy with input tokens
      await setTokenBalance(
        config.inputTokenAddress,
        await gatewaySigner.getAddress(),
        config.depositAmount,
        config.inputTokenStorageSlot,
        config.isNative
      );

      await inputToken.connect(gatewaySigner).transfer(strategy.address, config.depositAmount);

      // Rebalance: deposit into module
      const depositInstr = [{
        module: moduleContracts[0].address,
        inputToken: config.inputTokenAddress,
        amount: config.depositAmount,
        minOut: 1,
        action: 0 // Deposit
      }];

      await strategy.connect(owner).rebalance(depositInstr);

      const balanceBefore = await inputToken.balanceOf(strategy.address);

      // Rebalance: withdraw from module
      const withdrawInstr = [{
        module: moduleContracts[0].address,
        inputToken: config.inputTokenAddress,
        amount: config.depositAmount, // explicitly match the deposit amount
        minOut: 1,
        action: 1 // Withdraw
      }];

      await expect(strategy.connect(owner).rebalance(withdrawInstr))
        .to.emit(strategy, "RebalanceExecuted");

      const balanceAfter = await inputToken.balanceOf(strategy.address);

      // Confirm that strategy received the withdrawn funds
      expect(balanceAfter.sub(balanceBefore)).to.be.gte(config.minAmountOut);
    });

    it("should call claimAllRewards on all modules", async function () {
      const { strategy, owner } = ctx;

      await expect(strategy.connect(owner).claimAllRewards())
        .to.not.be.reverted;
    });

    it("should revert if total allocation BPS is not 10000", async function () {
      const { strategy, moduleContracts, owner } = ctx;

      const invalidAllocations = [
        { module: moduleContracts[0].address, bps: 3000 },
        { module: moduleContracts[1].address, bps: 3000 } // totals 6000
      ];

      await expect(strategy.connect(owner).setAllocations(invalidAllocations))
        .to.be.revertedWith("Total allocation must be 10000 bps");
    });

  });
});
