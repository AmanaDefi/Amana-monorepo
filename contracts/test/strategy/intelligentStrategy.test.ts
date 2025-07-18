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
  });
});
