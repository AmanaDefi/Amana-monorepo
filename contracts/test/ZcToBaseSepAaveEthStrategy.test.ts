import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaVault, BaseSepAaveEthStrategy, IERC20 } from "../typechain";

import { ZC_TEST_WETH_ADDRESS } from "../../constants";
import { BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS } from "../../constants";
import { ZC_TEST_ETH_BASESEPOLIA_HOLDER_ADDRESS } from "../../constants";
import { ZC_TEST_WETH_HOLDER_ADDRESS } from "../../constants";
import { ZC_TEST_ETH_BASESEPOLIA_ADDRESS } from "../../constants";

describe("Vault and BaseSepAaveEthStrategy", function () {
  let amanaVault: AmanaVault;
  let strategy: BaseSepAaveEthStrategy;
  let ethBaseSepolia: IERC20;
  let usdt: IERC20;
  let aaveToken: IERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 5;
  const FeeRate = BigNumber.from(1000); // 10% fee
  const rewardAmount = ethers.utils.parseUnits("100", 6);
  const BASE_CHAIN_ID = 8453;

  before(async () => {
    // Use this function if you need global setup before tests
  });

  describe("BaseSepAaveEthStrategy Investment", function () {
    async function setup() {
      // Get signers
      [owner, user1, user2] = await ethers.getSigners();

      // Forked USDC contract and Aave Pool
      ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
      aaveToken = await ethers.getContractAt("IERC20", BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS);

      // Deploy the AmanaVault using OpenZeppelin's upgrade proxy pattern
      const Vault = await ethers.getContractFactory("AmanaVault", owner);
      amanaVault = await upgrades.deployProxy(
        Vault,
        ["AaveV3EthVault", "AVU", ZC_TEST_ETH_BASESEPOLIA_ADDRESS, await owner.getAddress(), FeeRate],
        { initializer: "initialize" }
      );

      // Impersonate a holder
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ZC_TEST_ETH_BASESEPOLIA_HOLDER_ADDRESS],
      });
      const ethHolder = await ethers.getSigner(ZC_TEST_ETH_BASESEPOLIA_HOLDER_ADDRESS);

      // Set initial balances
      const depositAmount1 = ethers.utils.parseUnits("0.01", 18);
      const depositAmount2 = ethers.utils.parseUnits("0.05", 18);

      await ethBaseSepolia.connect(ethHolder).transfer(await user1.getAddress(), depositAmount1.mul(2));
      await ethBaseSepolia.connect(ethHolder).transfer(await user2.getAddress(), depositAmount2.mul(2));
      await ethBaseSepolia.connect(ethHolder).transfer(await amanaVault.address, depositAmount1.mul(2));

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ZC_TEST_WETH_HOLDER_ADDRESS],
      });
      const usdtHolder = await ethers.getSigner(ZC_TEST_WETH_HOLDER_ADDRESS);
      usdt = await ethers.getContractAt("IERC20", ZC_TEST_WETH_ADDRESS);

      await usdt.connect(usdtHolder).transfer(amanaVault.address, rewardAmount);
      return { owner, user1, user2, depositAmount1, depositAmount2, ethBaseSepolia, usdt, amanaVault };
    }

    it("should invest USDC into Aave via the strategy", async function () {
      const { user1, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(depositAmount1);
    });

    it("should withdraw USDC from Aave via the strategy", async function () {
      const { user1, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      const withdrawAmount = depositAmount1;
      await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress());
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(0);
    });

    it("should handle deposits from two different users", async function () {
      const { user1, user2, depositAmount1, depositAmount2, ethBaseSepolia, amanaVault } = await loadFixture(setup);
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await ethBaseSepolia.connect(user2).approve(amanaVault.address, depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(depositAmount1.add(depositAmount2), errorMargin);
    });

    it("should pay a fee to the owner upon withdrawal", async function () {
      const { user1, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      const ONE_WEEK_IN_SECONDS = 604800;
      await network.provider.send("evm_increaseTime", [ONE_WEEK_IN_SECONDS]);
      await network.provider.send("evm_mine");

      const withdrawAmount = depositAmount1;
      const vaultAssetsBeforeWithdraw = await amanaVault.totalAssets();
      const profitAmount = vaultAssetsBeforeWithdraw.sub(depositAmount1);
      const feeAmount = profitAmount.mul(FeeRate).div(BigNumber.from(10000));

      expect(await amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress())).to.changeTokenBalance(ethBaseSepolia, await owner.getAddress(), feeAmount);
    });
  });
});
