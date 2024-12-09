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
    withdrawAmount: any,
    totalAssetsBefore: any,
    executionNonce: any,
    crossChainTxId: any
  ): Promise<void> {
    const confirmMessage2 = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint256"],
      [await user.getAddress(), ZC_TEST_ETH_BASESEPOLIA_ADDRESS, withdrawAmount, 0, ORIGIN_CHAIN_ID, false, totalAssetsBefore, totalAssetsBefore.sub(withdrawAmount), executionNonce, crossChainTxId]
    );
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, withdrawAmount);

    await amanaVault.onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: STRATEGY_ADDRESS,
        chainID: STRATEGY_CHAIN_ID,
      },
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      confirmMessage2
    )
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

    return { owner, user1, user2, depositAmount1, depositAmount2, rewardAmount, ethBaseSepolia, usdcBSC, amanaVault, gatewayZEVM, withdrawZRC20 };
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

    it("should calculate performance fee correctly", async function () {
      const { user1, depositAmount1, amanaVault, ethBaseSepolia } = await loadFixture(setup);

      // Simulate deposit
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1.mul(20).div(1));

      await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      console.log("Deposited")
      // Increase time and simulate profit
      const profit = depositAmount1.div(10); // 10% profit
      await ethSepolia.connect(user1).transfer(amanaVault.address, profit);
      console.log("Transferred")
      const totalAssets = await amanaVault.totalAssets(); // But totalAssets won't update until we do a deposit or withdrawal!? What about a claim?
      const expectedFee = profit.mul(FEE_RATE).div(10000);

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
      ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
    });

    it("should correctly handle _crossChainInvest revert during cross-chain deposits", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      const depositAmount = ethers.utils.parseUnits("0.1", 18);

      // Simulate deposit for User1
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

    it("should calculate rewards correctly after multiple deposits", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault, usdcBSC } = await loadFixture(setup);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user2.getAddress(), depositAmount2);

      // User1 deposits
      await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

      // User2 deposits
      await ethSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      // Set rewards TODO - create some actual rewards in the vault through settings - see old test
      const totalDeposits = depositAmount1.add(depositAmount2);
      const rewardAmount = ethers.utils.parseUnits("200", 6);
      await usdcBSC.transfer(amanaVault.address, rewardAmount);

      // Claim rewards
      await amanaVault.claimRewards(await user1.getAddress());
      const user1Reward = await usdcBSC.balanceOf(await user1.getAddress());

      expect(user1Reward).to.be.closeTo(rewardAmount.mul(depositAmount1).div(totalDeposits), errorMargin);
    });

    it("should handle deposits from two different users and distribute rewards", async function () {
      const { user1, user2, depositAmount1, ethBaseSepolia, amanaVault } = await loadFixture(setup);

      const user1Address = await user1.getAddress();
      const user2Address = await user2.getAddress();

      // Simulate deposit for User1
      await simulateDepositCallFromBase(
        user1,
        depositAmount1
      )

      // Confirmation for User1
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0)

      // Simulate deposit for User2
      const depositAmount2 = ethers.utils.parseUnits("0.005", 18);
      await simulateDepositCallFromBase(
        user2,
        depositAmount2
      )

      // Confirmation for User2
      await simulateConfirmDeposit(user2, depositAmount2, depositAmount1, 2, 1)

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
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      const user1Address = await user1.getAddress();

      // Simulate deposit for User1
      await simulateDepositCallFromBase(
        user1,
        depositAmount1
      )

      // Confirm deposit
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0)

      // Withdraw the maximum amount
      const maxWithdrawAmount = await amanaVault.maxWithdraw(user1Address);
      console.log("Max withdraw amount: ", maxWithdrawAmount.toString());
      await simulateWithdrawCallFromBase(user1, maxWithdrawAmount)
      console.log("got here");
      // Confirm deposit
      await expect(simulateConfirmWithdraw(user1, maxWithdrawAmount, depositAmount1, 2, 1))
        .to.emit(amanaVault, "ReturnFundsToUserSent")
        .to.emit(amanaVault, "Withdrawn");
    });

    it("should fail to withdraw more than the user balance", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);


      // Simulate deposit for User1
      await simulateDepositCallFromBase(
        user1,
        depositAmount1
      )

      // Confirm deposit
      simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0);

      // Attempt to withdraw more than balance
      const excessiveWithdrawAmount = depositAmount1.mul(2); // Double the deposited amount

      // Interesting - what would this do? It's in withdrawFromConnectedChain...
      await expect(simulateWithdrawCallFromBase(user1, excessiveWithdrawAmount))
        .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
    });

    it("should update user shares correctly after multiple deposits and withdrawals", async function () {
      const { user1, user2, depositAmount1, depositAmount2, amanaVault } = await loadFixture(setup);
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, 0);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);
      const initialTotalAssets = await amanaVault.totalAssets();
      console.log("Initial total assets: ", initialTotalAssets.toString());
      // User1 deposits
      await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
      await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());
      const TotalAssetsAfterDeposit1 = await amanaVault.totalAssets();
      console.log("Total assets after deposit1: ", TotalAssetsAfterDeposit1.toString());
      // Confirmation for User1
      await simulateConfirmDeposit(user1, depositAmount1, 0, 1, 0);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user2.getAddress(), depositAmount2);

      // User2 deposits
      await ethSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
      await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

      const totalDeposits = depositAmount1.add(depositAmount2);
      // Confirmation for User1
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

    it("should correctly distribute rewards proportional to user shares", async function () {
      const { user1, user2, depositAmount1, depositAmount2, ethBaseSepolia, usdcBSC, amanaVault } = await loadFixture(setup);

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
      await usdcBSC.transfer(amanaVault.address, rewardAmount);
      await amanaVault.claimRewards(await user1.getAddress());

      expect(await usdcBSC.balanceOf(await user1.getAddress())).to.be.closeTo(rewardDistribution, errorMargin);
    });
  });
});

