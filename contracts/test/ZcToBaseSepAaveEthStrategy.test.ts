import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaVault, IERC20, GasTank } from "../typechain";
import { setTokenBalance } from "./utils";

import { BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS } from "../../constants";
import { ZC_TEST_ETH_BASESEPOLIA_ADDRESS } from "../../constants";
require("dotenv").config();


describe("Vault and BaseSepAaveEthStrategy", function () {
  let amanaVault: AmanaVault;
  let ethBaseSepolia: IERC20;
  let gasTank: GasTank;
  let usdt: IERC20;
  let aaveToken: IERC20;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  const errorMargin = 5;
  const FeeRate = BigNumber.from(1000); // 10% fee
  const rewardAmount = ethers.utils.parseUnits("100", 6);
  const gatewayAddress = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
  const systemAddress = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
  const STRATEGY_ADDRESS = "0x8106Ca539dC8D40dD448FFf3cad41C8eD8C57BFB"; // BaseSepAaveEthStrategy address
  const STRATEGY_CHAIN_ID = 84532; // Replace with your chain ID for testnet or mainnet

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

      // Deploy a new GasTank
      const GasTank = await ethers.getContractFactory("GasTank");
      const gasTank = await GasTank.deploy();
      await gasTank.deployed();

      console.log("GasTank deployed to:", gasTank.address);

      // Deploy the AmanaVault using OpenZeppelin's upgrade proxy pattern
      const Vault = await ethers.getContractFactory("AmanaVault", owner);
      amanaVault = await upgrades.deployProxy(
        Vault,
        ["AaveV3EthVault", "AVU", ZC_TEST_ETH_BASESEPOLIA_ADDRESS, await owner.getAddress(), FeeRate, gatewayAddress, systemAddress, gasTank.address],
        {
          initializer: "initialize",
        },
      );
      console.log("AmanaVault deployed to:", amanaVault.address);

      await gasTank.authorizeVault(amanaVault.address);
      console.log("GasTank authorized for:", amanaVault.address);

      // Set the strategy in the AmanaVault contract
      await amanaVault.setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID);
      console.log("Strategy set to:", STRATEGY_ADDRESS);

      // Set initial balances
      const depositAmount1 = ethers.utils.parseUnits("0.01", 18);
      const depositAmount2 = ethers.utils.parseUnits("0.05", 18);

      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(2));
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, await user2.getAddress(), depositAmount2);

      console.log("ETH Base Sepolia balance: ", await ethBaseSepolia.balanceOf(amanaVault.address));

      return { owner, user1, user2, depositAmount1, depositAmount2, ethBaseSepolia, usdt, amanaVault };
    }

    it("should invest USDC into Aave via the strategy", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);
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
