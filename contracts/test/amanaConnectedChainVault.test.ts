import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaConnectedChainVault, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";

import {
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
} from "../../constants";

describe("AmanaConnectedChainVault Tests", function () {
  let amanaVault: AmanaConnectedChainVault;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ethBaseSepolia: IERC20;
  let ethSepolia: IERC20;
  let usdt: IERC20;
  let withdrawZRC20: string;

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
  const SYSTEM_CONTRACT_ADDRESS = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
  const VAULT_ASSET = ZC_TEST_ETH_SEPOLIA_ADDRESS;

  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from

  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
  const STRATEGY_CHAIN_ID = 11155111;

  before(async () => {
    // Use this function if you need global setup before tests
  });

  async function setup() {
    [owner, user1, user2] = await ethers.getSigners();

    ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
    ethSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_SEPOLIA_ADDRESS);

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
        1000,
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

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20).div(1));
    await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(200).div(1));

    return { owner, user1, user2, depositAmount1, ethBaseSepolia, usdt, amanaVault, gatewayZEVM, withdrawZRC20 };
  }

  describe("Cross-Chain Deposit and Withdraw Workflow", function () {
    it("should correctly initialize the vault", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      expect(await amanaVault.name()).to.equal("AaveV3EthVault");
      expect(await amanaVault.symbol()).to.equal("AVU");
      expect(await amanaVault.asset()).to.equal(ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
      expect(await amanaVault.owner()).to.equal(await owner.getAddress());
      expect(await amanaVault.performanceFee()).to.equal(FeeRate);
    });

    it("should reject unauthorized access to setStrategy", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      await expect(
        amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should reject unauthorized access to setPerformanceFee", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      const newFeeRate = ethers.BigNumber.from(1500); // 15%
      await expect(amanaVault.connect(user1).setPerformanceFee(newFeeRate)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should update performance fee correctly", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      const newFeeRate = ethers.BigNumber.from(1500); // 15%
      await amanaVault.connect(owner).setPerformanceFee(newFeeRate);

      expect(await amanaVault.performanceFee()).to.equal(newFeeRate);
    });

    it("should calculate performance fee correctly", async function () {
      const { user1, depositAmount1, amanaVault, ethBaseSepolia } = await loadFixture(setup);

      // Simulate deposit
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Increase time and simulate profit
      const profit = depositAmount1.div(10); // 10% profit
      await ethBaseSepolia.transfer(amanaVault.address, profit);

      const totalAssets = await amanaVault.totalAssets();
      const expectedFee = profit.mul(FeeRate).div(10000);

      expect(totalAssets).to.be.closeTo(depositAmount1.add(profit).sub(expectedFee), errorMargin);
    });

    it("should handle emergency withdrawal by the owner", async function () {
      const { amanaVault, owner, ethBaseSepolia } = await loadFixture(setup);

      // Simulate deposits
      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await ethBaseSepolia.transfer(amanaVault.address, depositAmount);

      const balanceBefore = await ethBaseSepolia.balanceOf(await owner.getAddress());
      await amanaVault.connect(owner).emergencyWithdraw(ZC_TEST_ETH_BASESEPOLIA_ADDRESS);

      const balanceAfter = await ethBaseSepolia.balanceOf(await owner.getAddress());
      expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
    });

    it("should reject unauthorized emergency withdrawal", async function () {
      const { amanaVault, user1, ethBaseSepolia } = await loadFixture(setup);

      // Simulate deposits
      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      await ethBaseSepolia.transfer(amanaVault.address, depositAmount);

      await expect(
        amanaVault.connect(user1).emergencyWithdraw(ZC_TEST_ETH_BASESEPOLIA_ADDRESS)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should correctly handle withdraws during cross-chain failures", async function () {
      const { user1, amanaVault, ethBaseSepolia } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.05", 18);

      // Simulate deposit
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount);
      await amanaVault.connect(user1).deposit(depositAmount, await user1.getAddress());

      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [ZC_TEST_ETH_BASESEPOLIA_ADDRESS, depositAmount]
      );

      // Simulate withdrawal failure from strategy
      const mockRevertMessage = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        ["_returnFundsToUserFailed"]
      );

      await expect(
        amanaVault.onRevert({
          origin: "strategy_chain",
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
          revertMessage: mockRevertMessage,
          amount: depositAmount,
        })
      ).to.emit(amanaVault, "ReturnFundsToUserFailed");
    });

    it("should reject deposits exceeding max deposit limit", async function () {
      const { user1, depositAmount1, amanaVault, ethBaseSepolia } = await loadFixture(setup);

      const maxDepositLimit = depositAmount1.div(2); // Mocked limit
      await amanaVault.connect(owner).setMaxDepositLimit(maxDepositLimit);

      await expect(
        amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())
      ).to.be.revertedWith("ERC4626ExceededMaxDeposit");
    });

    it("should allow setting treasury address by the owner", async function () {
      const { amanaVault, owner } = await loadFixture(setup);

      const newTreasuryAddress = ethers.Wallet.createRandom().address;
      await amanaVault.connect(owner).updateTreasuryAddress(newTreasuryAddress);

      expect(await amanaVault.treasury()).to.equal(newTreasuryAddress);
    });

    it("should reject unauthorized treasury updates", async function () {
      const { amanaVault, user1 } = await loadFixture(setup);

      const newTreasuryAddress = ethers.Wallet.createRandom().address;
      await expect(amanaVault.connect(user1).updateTreasuryAddress(newTreasuryAddress)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("should calculate rewards correctly after multiple deposits", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault, usdt } = await loadFixture(setup);

      // User1 deposits
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // User2 deposits
      await ethBaseSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      // Set rewards
      const totalDeposits = depositAmount1.add(depositAmount2);
      const rewardAmount = ethers.utils.parseUnits("200", 6);
      await usdt.transfer(await amanaVault.address, rewardAmount);

      // Claim rewards
      await amanaVault.claimRewards(await user1.getAddress());
      const user1Reward = await usdt.balanceOf(await user1.getAddress());

      expect(user1Reward).to.be.closeTo(rewardAmount.mul(depositAmount1).div(totalDeposits), errorMargin);
    });

    it("should handle deposits from two different users and distribute rewards", async function () {
      const { user1, user2, depositAmount1, ethBaseSepolia, amanaVault, gatewayZEVM } = await loadFixture(setup);

      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();

      // Simulate deposit for User1
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user1Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount1,
        "0x"
      );

      // Confirmation for User1
      const confirmMessage1 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [user1Address, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 1]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage1
      );

      // Simulate deposit for User2
      const depositAmount2 = ethers.utils.parseUnits("0.005", 18);
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount2);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user2Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount2,
        "0x"
      );

      // Confirmation for User2
      const confirmMessage2 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [user2Address, ethers.constants.AddressZero, depositAmount2, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount2, 2]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage2
      );

      // Check user balances
      expect(await amanaVault.balanceOf(user1Address)).to.equal(depositAmount1);
      expect(await amanaVault.balanceOf(user2Address)).to.equal(depositAmount2);

      // Simulate time passing and claim rewards
      const rewardsPerSecond = ethers.utils.parseUnits("1", 18);
      await amanaVault.setRewardsInterval(
        Math.floor(Date.now() / 1000),
        Math.floor(Date.now() / 1000) + 3600,
        rewardsPerSecond.mul(3600)
      );

      await ethers.provider.send("evm_increaseTime", [1800]); // Simulate 30 minutes
      await ethers.provider.send("evm_mine", []);

      await amanaVault.claimRewards(user1Address);
      await amanaVault.claimRewards(user2Address);

      const reward1 = rewardsPerSecond.mul(1800).mul(depositAmount1).div(depositAmount1.add(depositAmount2));
      const reward2 = rewardsPerSecond.mul(1800).mul(depositAmount2).div(depositAmount1.add(depositAmount2));

      expect(await ethBaseSepolia.balanceOf(user1Address)).to.be.closeTo(reward1, ethers.utils.parseUnits("0.01", 18));
      expect(await ethBaseSepolia.balanceOf(user2Address)).to.be.closeTo(reward2, ethers.utils.parseUnits("0.01", 18));
    });

    it("should withdraw the maximum amount possible for a user", async function () {
      const { user1, depositAmount1, amanaVault, ethBaseSepolia } = await loadFixture(setup);

      const user1Address = await user1.getAddress();

      // Simulate deposit for User1
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user1Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount1,
        "0x"
      );

      // Confirm deposit
      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [user1Address, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 1]
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

      // Withdraw the maximum amount
      const maxWithdrawAmount = await amanaVault.maxWithdraw(user1Address);
      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [ZC_TEST_ETH_BASESEPOLIA_ADDRESS, maxWithdrawAmount]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user1Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        0,
        withdrawMessage
      );

      expect(await ethBaseSepolia.balanceOf(user1Address)).to.be.closeTo(maxWithdrawAmount, ethers.utils.parseUnits("0.01", 18));
    });

    it("should fail to withdraw more than the user balance", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      const user1Address = await user1.getAddress();

      // Simulate deposit for User1
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user1Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount1,
        "0x"
      );

      // Confirm deposit
      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [user1Address, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 1]
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

      // Attempt to withdraw more than balance
      const excessiveWithdrawAmount = depositAmount1.mul(2); // Double the deposited amount
      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [ZC_TEST_ETH_BASESEPOLIA_ADDRESS, excessiveWithdrawAmount]
      );

      await expect(
        amanaVault.onCall(
          {
            origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
            sender: user1Address,
            chainID: ORIGIN_CHAIN_ID,
          },
          ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
          0,
          withdrawMessage
        )
      ).to.be.revertedWith("ERC4626: withdrawal amount exceeds maximum");
    });

    it("should handle slippage on deposits correctly", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      const user1Address = await user1.getAddress();

      // Simulate deposit with slippage
      const slippageAmount = depositAmount1.mul(95).div(100); // 5% slippage
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, slippageAmount);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user1Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        slippageAmount,
        "0x"
      );

      // Confirm deposit
      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [user1Address, ethers.constants.AddressZero, slippageAmount, 0, ORIGIN_CHAIN_ID, true, 0, slippageAmount, 1]
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

      expect(await amanaVault.balanceOf(user1Address)).to.be.closeTo(slippageAmount, ethers.utils.parseUnits("0.01", 18));
    });

    it("should prevent reentrancy attacks during withdrawals", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      const user1Address = await user1.getAddress();

      // Simulate deposit for User1
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: user1Address,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount1,
        "0x"
      );

      // Confirm deposit
      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [user1Address, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 1]
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

      // Simulate malicious reentrant withdrawal
      const maliciousWithdrawAmount = depositAmount1;
      const maliciousWithdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [ZC_TEST_ETH_BASESEPOLIA_ADDRESS, maliciousWithdrawAmount]
      );

      await expect(
        amanaVault.onCall(
          {
            origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
            sender: user1Address,
            chainID: ORIGIN_CHAIN_ID,
          },
          ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
          0,
          maliciousWithdrawMessage
        )
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });

    it("should handle reentrancy attacks gracefully", async function () {
      const { user1, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);

      // Simulate deposit
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // Simulate malicious contract attempting reentrancy
      const MaliciousContract = await ethers.getContractFactory("MaliciousContract");
      const malicious = await MaliciousContract.deploy(amanaVault.address);

      await ethBaseSepolia.connect(user1).approve(malicious.address, depositAmount1);
      await expect(malicious.connect(user1).attemptReentrancy(depositAmount1)).to.be.revertedWith(
        "ReentrancyGuard: reentrant call"
      );
    });

    it("should calculate slippage correctly during deposit", async function () {
      const { user1, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);

      // Mock slippage by adjusting the expected output amount in the strategy
      const slippageAdjustedAmount = depositAmount1.mul(95).div(100); // Assume 5% slippage
      const message = ethers.utils.defaultAbiCoder.encode(["uint256"], [slippageAdjustedAmount]);

      // Mock onCall from the strategy chain
      await amanaVault.onCall(
        { origin: "strategy_chain", sender: STRATEGY_ADDRESS, chainID: STRATEGY_CHAIN_ID },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        slippageAdjustedAmount,
        message
      );

      // Simulate deposit
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.be.closeTo(slippageAdjustedAmount, errorMargin);
    });

    it("should enforce maximum deposit limits per user", async function () {
      const { user1, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);

      // Set a mock maximum deposit limit
      const maxDepositLimit = depositAmount1.div(2);

      // Attempt to deposit more than the limit
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await expect(amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress())).to.be.revertedWith(
        "ERC4626ExceededMaxDeposit"
      );

      // Deposit within the limit
      await amanaVault.connect(user1).deposit(maxDepositLimit, await user1.getAddress());
      expect(await amanaVault.balanceOf(await user1.getAddress())).to.equal(maxDepositLimit);
    });

    it("should update user shares correctly after multiple deposits and withdrawals", async function () {
      const { user1, user2, depositAmount1, depositAmount2, ethBaseSepolia, amanaVault } = await loadFixture(setup);

      // User1 deposits
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // User2 deposits
      await ethBaseSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      // User1 withdraws part of their deposit
      const withdrawAmount1 = depositAmount1.div(2);
      await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress());

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
        .revertedWith("ERC4626: withdrawal amount exceeds balance");

      // Deposit and then withdraw entire balance
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, zeroAmount);
      await amanaVault.connect(user1).deposit(zeroAmount, await user1.getAddress());
      await amanaVault.connect(user1).withdraw(zeroAmount, await user1.getAddress(), await user1.getAddress());
    });

    it("should correctly distribute rewards proportional to user shares", async function () {
      const { user1, user2, depositAmount1, depositAmount2, ethBaseSepolia, usdt, amanaVault } = await loadFixture(setup);

      // User1 and User2 deposits
      await ethBaseSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await ethBaseSepolia.connect(user2).approve(amanaVault.address, depositAmount2);

      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      // Set rewards
      const totalDeposits = depositAmount1.add(depositAmount2);
      const user1Share = depositAmount1.mul(100).div(totalDeposits);
      const user2Share = depositAmount2.mul(100).div(totalDeposits);

      const rewardDistribution = rewardAmount.mul(user1Share).div(100);
      await usdt.transfer(await amanaVault.address, rewardAmount);
      await amanaVault.claimRewards(await user1.getAddress());

      expect(await usdt.balanceOf(await user1.getAddress())).to.be.closeTo(rewardDistribution, errorMargin);
    });


    // Additional tests for withdrawals, slippage, reentrancy, and fees can be added similarly.
  });
});
