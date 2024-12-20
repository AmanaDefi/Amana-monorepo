import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
// import {
//   AmanaZetachainVault,
//   IERC20,
//   Mock4626ZetachainStrategy,
//   Mock4626,
// } from "../typechain";
import { setTokenBalance } from "./utils";
import {
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_USDC_BSC_ADDRESS,
} from "../../constants";
import dotenv from "dotenv";
dotenv.config();

const ZETACHAIN_TESTNET_CHAIN_ID = 7001;
const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
const SYSTEM_CONTRACT_ADDRESS = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
const VAULT_ASSET = ZC_TEST_ETH_SEPOLIA_ADDRESS;
const FEE_RATE = 1000;
const ORIGIN_CHAIN_ID = 84532;
const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
const STRATEGY_CHAIN_ID = 11155111;
const ERROR_MARGIN = ethers.utils.parseUnits("0.00015", 18);

async function setupGatewaySigner() {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [ZEVM_GATEWAY_ADDRESS],
  });

  const gatewaySigner = await ethers.getSigner(ZEVM_GATEWAY_ADDRESS);
  await network.provider.send("hardhat_setBalance", [
    ZEVM_GATEWAY_ADDRESS,
    ethers.utils.parseEther("10").toHexString(),
  ]);

  return gatewaySigner;
}

async function setup() {
  await network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: `https://zetachain-testnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
          blockNumber: 8063787,
        },
      },
    ]
  });

  const [owner, user1, user2] = await ethers.getSigners();

  const gatewaySigner = await setupGatewaySigner();

  const GasTank = await ethers.getContractFactory("GasTank");
  const gasTank = await GasTank.deploy();
  await gasTank.deployed();

  const Vault = await ethers.getContractFactory("AmanaZetachainVault", owner);
  const vaultDeployTransaction = await upgrades.deployProxy(
    Vault,
    [
      "Mock4626ZetachainERC20Vault",
      "AVU",
      VAULT_ASSET,
      await owner.getAddress(),
      FEE_RATE,
      SYSTEM_CONTRACT_ADDRESS,
      gasTank.address,
    ],
    { initializer: "initialize" }
  );
  const amanaVault = await vaultDeployTransaction.deployed();

  await gasTank.authorizeVault(amanaVault.address);

  const VaultFactory = await ethers.getContractFactory("Mock4626", owner);
  const mockVault = await VaultFactory.deploy(VAULT_ASSET);
  await mockVault.deployed();

  const StrategyFactory = await ethers.getContractFactory("Mock4626ZetachainStrategy", owner);
  const strategy = await StrategyFactory.deploy(
    "Mock Strategy",
    amanaVault.address,
    VAULT_ASSET,
    mockVault.address,
    ZEVM_GATEWAY_ADDRESS
  );
  await strategy.deployed();

  await amanaVault.setStrategy(strategy.address, ZETACHAIN_TESTNET_CHAIN_ID);

  const usdcBSC = await ethers.getContractAt("IERC20", ZC_TEST_USDC_BSC_ADDRESS);
  const ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
  const ethSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_SEPOLIA_ADDRESS);

  const depositAmount1 = ethers.utils.parseUnits("0.01", 18);
  const depositAmount2 = ethers.utils.parseUnits("0.005", 18);
  const rewardAmount = ethers.utils.parseUnits("1000", 18);

  await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20));
  await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20));
  await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await owner.getAddress(), depositAmount1.mul(20));
  await setTokenBalance(ZC_TEST_USDC_BSC_ADDRESS, await owner.getAddress(), depositAmount1.mul(200));

  async function simulateDepositCallFromBase(
    user: Signer,
    depositAmount: BigNumber
  ): Promise<void> {
    // Set token balance for the vault
    await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount);
    // Execute the onCall function to simulate a deposit
    await amanaVault.connect(gatewaySigner).onCall(
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

  async function simulateWithdrawCallFromBase(
    user: Signer,
    withdrawAmount: BigNumber
  ): Promise<any> {
    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [ZC_TEST_ETH_BASESEPOLIA_ADDRESS, withdrawAmount]
    );
    const tx = await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
      0,
      withdrawMessage
    );
    return tx;
  }


  return {
    owner,
    user1,
    user2,
    gatewaySigner,
    usdcBSC,
    ethBaseSepolia,
    ethSepolia,
    amanaVault,
    gasTank,
    mockVault,
    strategy,
    depositAmount1,
    depositAmount2,
    rewardAmount,
    simulateDepositCallFromBase,
    simulateWithdrawCallFromBase,
  };
}

describe("AmanaZetachainVault Tests", function () {
  it("should correctly initialize the vault", async function () {
    const { amanaVault, owner } = await loadFixture(setup);

    expect(await amanaVault.name()).to.equal("Mock4626ZetachainERC20Vault");
    expect(await amanaVault.symbol()).to.equal("AVU");
    expect(await amanaVault.asset()).to.equal(VAULT_ASSET);
    expect(await amanaVault.owner()).to.equal(await owner.getAddress());
    expect(await amanaVault.getPerfFee()).to.equal(FEE_RATE);
  });

  it("should reject unauthorized access to setStrategy", async function () {
    const { user1, amanaVault } = await loadFixture(setup);

    await expect(
      amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should handle strategy switching", async function () {
    const { amanaVault, owner, mockVault, ethSepolia } = await loadFixture(setup);
    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await ethSepolia.approve(amanaVault.address, depositAmount);
    await amanaVault.deposit(depositAmount, await owner.getAddress());

    const StrategyFactory = await ethers.getContractFactory("Mock4626ZetachainStrategy", owner);
    const strategy2 = await StrategyFactory.deploy(
      "Mock Strategy",
      amanaVault.address,
      VAULT_ASSET,
      mockVault.address,
      ZEVM_GATEWAY_ADDRESS
    );
    await strategy2.deployed();
    const newStrategyAddress = strategy2.address;
    // const newChainId = STRATEGY_CHAIN_ID;

    // Switch the vault strategy
    await expect(amanaVault.connect(owner).switchStrategy(newStrategyAddress, 7001))
      .to.emit(amanaVault, "StrategyUpdated")
      .withArgs(newStrategyAddress, 7001);

    // Validate that the strategy and chain ID are updated
    const [strategyAddress, chainId] = await amanaVault.getStrategy();
    expect(strategyAddress).to.equal(newStrategyAddress);
    expect(chainId).to.equal(7001);

    const totalAssetsNewStrategy = await amanaVault.totalAssets();
    expect(totalAssetsNewStrategy).to.equal(depositAmount.add(1)); // add 1 for virtual share / asset
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
    const { user1, depositAmount1, amanaVault, ethSepolia, mockVault } = await loadFixture(setup);

    // Step 1: Simulate a deposit by User1
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);
    await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

    const initialTotalAssets = depositAmount1;

    // Step 2: Simulate a deposit by User2
    // await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user2.getAddress(), depositAmount1);
    // await ethSepolia.connect(user2).approve(amanaVault.address, depositAmount1);
    // await amanaVault.connect(user2).deposit(depositAmount1, await user2.getAddress());
    const profit = depositAmount1.div(10); // 10% profit
    await ethSepolia.transfer(mockVault.address, profit);
    const updatedTotalAssets = initialTotalAssets.add(profit);

    // Step 3: Perform a withdrawal and calculate the fee

    const withdrawAmount = depositAmount1 //.div(2); // Withdraw everything except the fee
    // const adjustedFeeRate = FEE_RATE / (10000 - FEE_RATE);
    const profitWithdrawn = withdrawAmount.sub(withdrawAmount.mul(depositAmount1).div(updatedTotalAssets));
    const expectedFee = profitWithdrawn.mul(FEE_RATE).div(10000).sub(1);

    await expect(amanaVault.connect(user1).withdraw(withdrawAmount, await user1.getAddress(), await user1.getAddress()))
      .to.emit(amanaVault, "PerformanceFeePaid")
      .withArgs(await user1.getAddress(), expectedFee);
  });

  it("should handle emergency withdrawal by the owner", async function () {
    const { amanaVault, owner, ethSepolia } = await loadFixture(setup);

    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await owner.getAddress(), depositAmount);
    await ethSepolia.transfer(amanaVault.address, depositAmount);

    const balanceBefore = await ethSepolia.balanceOf(await owner.getAddress());
    await amanaVault.connect(owner).emergencyWithdraw(VAULT_ASSET);

    const balanceAfter = await ethSepolia.balanceOf(await owner.getAddress());
    expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
  });

  it("should reject unauthorized emergency withdrawal", async function () {
    const { amanaVault, user1, ethSepolia } = await loadFixture(setup);

    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount);

    await ethSepolia.transfer(amanaVault.address, depositAmount);

    await expect(
      amanaVault.connect(user1).emergencyWithdraw(VAULT_ASSET)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should reject unauthorized treasury updates", async function () {
    const { amanaVault, user1 } = await loadFixture(setup);

    const newTreasuryAddress = ethers.Wallet.createRandom().address;
    await expect(
      amanaVault.connect(user1).updateTreasuryAddress(newTreasuryAddress)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should withdraw the maximum amount possible for a user", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase, simulateWithdrawCallFromBase } = await loadFixture(setup);

    await simulateDepositCallFromBase(
      user1,
      depositAmount1
    )

    // Withdraw the maximum amount
    const maxWithdrawAmount = await amanaVault.maxWithdraw(await user1.getAddress());
    const tx = await simulateWithdrawCallFromBase(user1, maxWithdrawAmount);

    await expect(tx)
      .to.emit(amanaVault, "ReturnFundsToUserSent")
    // .to.emit(amanaVault, "Withdrawn");
  });

  it("should fail to withdraw more than the user balance", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase, simulateWithdrawCallFromBase } = await loadFixture(setup);

    await simulateDepositCallFromBase(
      user1,
      depositAmount1
    )

    const maxWithdrawAmount = await amanaVault.maxWithdraw(await user1.getAddress());

    // Attempt to withdraw more than balance
    const excessiveWithdrawAmount = maxWithdrawAmount.mul(2); // Double the maxWithdraw amount

    await expect(amanaVault.withdraw(excessiveWithdrawAmount, await user1.getAddress(), await user1.getAddress()))
      .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
  });

  it("should update user shares correctly after multiple deposits and withdrawals", async function () {
    const { user1, user2, depositAmount1, depositAmount2, amanaVault, ethSepolia } = await loadFixture(setup);
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, 0);

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);

    await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user2.getAddress(), depositAmount2);

    await ethSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
    await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

    const totalDeposits = depositAmount1.add(depositAmount2);

    // User1 withdraws part of their deposit
    const withdrawAmount1 = depositAmount1.div(2);
    await amanaVault.connect(user1).withdraw(withdrawAmount1, await user1.getAddress(), await user1.getAddress());

    // Validate the remaining shares for User1
    const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
    const expectedShares = depositAmount1.sub(withdrawAmount1);
    expect(remainingShares).to.be.closeTo(expectedShares, ERROR_MARGIN);
  });

  it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
    const { user1, depositAmount1, amanaVault, ethSepolia } = await loadFixture(setup);

    // Step 1: Deposit into the vault
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);
    await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

    const initialShares = await amanaVault.balanceOf(await user1.getAddress());
    const initialAssets = await amanaVault.convertToAssets(initialShares);
    expect(initialAssets).to.be.closeTo(depositAmount1, ERROR_MARGIN);

    // Step 2: Perform multiple withdrawals
    const withdrawAmounts = [
      initialAssets.div(3), // Withdraw 1/3 of the total balance
      initialAssets.div(3), // Withdraw another 1/3
      initialAssets.sub(initialAssets.div(3).mul(2)), // Withdraw the remaining balance
    ];

    let totalAssetsBefore = depositAmount1;
    let executionNonce = 2;
    let crossChainTxId = 1;
    for (const withdrawAmount of withdrawAmounts) {
      // Perform withdrawal
      await amanaVault.connect(user1).withdraw(
        withdrawAmount,
        await user1.getAddress(),
        await user1.getAddress()
      );

      totalAssetsBefore = totalAssetsBefore.sub(withdrawAmount);
      executionNonce++;
      crossChainTxId++;
    }

    // Step 3: Validate final state
    const finalShares = await amanaVault.balanceOf(await user1.getAddress());
    const finalAssets = await amanaVault.totalAssets();

    expect(finalShares).to.equal(0); // User should have no shares left
    expect(finalAssets).to.equal(1); // Vault should only have 1 virtual share left

    // Step 4: Ensure further withdrawals fail
    await expect(
      amanaVault.connect(user1).withdraw(1, await user1.getAddress(), await user1.getAddress())
    ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
  });

  it("should handle zero balances without errors", async function () {
    const { user1, ethBaseSepolia, amanaVault } = await loadFixture(setup);

    // Simulate a withdrawal for a user with zero balance
    const zeroAmount = BigNumber.from(0);
    await expect(amanaVault.connect(user1).withdraw(zeroAmount, await user1.getAddress(), await user1.getAddress())).to.be
      .revertedWithCustomError(amanaVault, "WithdrawCantBeZero");

    // Deposit and then withdraw entire balance
    await ethBaseSepolia.connect(user1).approve(amanaVault.address, zeroAmount);
    await expect(amanaVault.connect(user1).deposit(zeroAmount, await user1.getAddress()))
      .to.be.revertedWithCustomError(amanaVault, "DepositCantBeZero");
  });

  it("should distribute and claim rewards (time-based)", async function () {
    const { user1, depositAmount1, usdcBSC, amanaVault, owner, simulateDepositCallFromBase } = await loadFixture(setup);

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
    expect(userRewardBalance).to.be.closeTo(expectedReward, ethers.utils.parseUnits("1", 18)); // Allow a small margin for rounding
  });

  it("should correctly distribute rewards proportional to user shares", async function () {
    const { user1, user2, depositAmount1, depositAmount2, usdcBSC, amanaVault, owner, ethSepolia } = await loadFixture(setup);

    const rewardAmount = ethers.utils.parseUnits("1000", 18);
    const rewardDuration = 3600; // 1 hour in seconds

    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock.timestamp;

    const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds later
    const endTimestamp = startTimestamp + rewardDuration;

    await amanaVault.connect(owner).setRewardToken(usdcBSC.address);
    await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

    await setTokenBalance(ZC_TEST_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount);

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user1.getAddress(), depositAmount1);
    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, await user2.getAddress(), depositAmount2);

    await ethSepolia.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1).deposit(depositAmount1, await user1.getAddress());

    await ethSepolia.connect(user2).approve(amanaVault.address, depositAmount2);
    await amanaVault.connect(user2).deposit(depositAmount2, await user2.getAddress());

    const elapsedSeconds = 1800; // 30 minutes
    await ethers.provider.send("evm_increaseTime", [elapsedSeconds]); // Increase time by 30 minutes
    await ethers.provider.send("evm_mine", []);

    const totalDeposits = depositAmount1.add(depositAmount2);
    const elapsedRewardAmount = rewardAmount.mul(elapsedSeconds - 600).div(rewardDuration); // Proportional rewards based on elapsed time
    const user1Share = depositAmount1.mul(elapsedRewardAmount).div(totalDeposits);
    const user2Share = depositAmount2.mul(elapsedRewardAmount).div(totalDeposits);

    await amanaVault.connect(user1).claimRewards(await user1.getAddress());
    const user1Reward = await usdcBSC.balanceOf(await user1.getAddress());

    await amanaVault.connect(user2).claimRewards(await user2.getAddress());
    const user2Reward = await usdcBSC.balanceOf(await user2.getAddress());

    expect(user1Reward).to.be.closeTo(user1Share, ethers.utils.parseUnits("2", 18));
    expect(user2Reward).to.be.closeTo(user2Share, ethers.utils.parseUnits("2", 18));
  });

});


