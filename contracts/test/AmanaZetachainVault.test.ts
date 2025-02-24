// This test is for a vault on Zetachain with a vault asset of ZC_ETH_ETH_ADDRESS, into a mock strategy on Zetachain 
// The simulated deposits and withdrawals come from Base chain

import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer, BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { setTokenBalance, generateTransactionId } from "./utils";

import {
  ZC_ETH_ETH_ADDRESS,
  ZC_ETH_BASE_ADDRESS,
  ZC_USDC_BSC_ADDRESS,
} from "../../constants";
import dotenv from "dotenv";
dotenv.config();

const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";
const VAULT_ASSET = ZC_ETH_ETH_ADDRESS;
const FEE_RATE = 1500;
const ORIGIN_CHAIN_ID = 8453;
const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
const ERROR_MARGIN = ethers.utils.parseUnits("0.00015", 18);
const WITHDRAWAL_RECEIVER = "0xD2f84247ac3462cD52cb380fda0d95D19501e130";
const GAS_LIMIT_FOR_WITHDRAW_AND_CALL = 300000;
const GAS_LIMIT_FOR_CALL = 300000;
const INPUT_TOKEN = ZC_ETH_ETH_ADDRESS;
const ZAP_CONTRACT_ADDRESS = "0xDdf577F172DffDea94C1F2a227a5E87Fd82bf42C";
const FORK_BLOCK_NUMBER = 7075361;
const SWAP_HELPER_ADDRESS = "0x0b78B5c4BDBDE4E5470b88693B2f34A7290460A0";

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
          jsonRpcUrl: `https://zetachain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
          blockNumber: FORK_BLOCK_NUMBER,
        },
      },
    ]
  });

  const [owner, user1, user2] = await ethers.getSigners();

  const gatewaySigner = await setupGatewaySigner();

  const GasTank = await ethers.getContractFactory("GasTank");
  const gasTank = await GasTank.deploy();
  await gasTank.deployed();

  const Vault = await ethers.getContractFactory("AmanaZetachainVault", {
    signer: owner,  // Keep the signer as 'owner'
    libraries: {
      SwapHelperLibEddy: SWAP_HELPER_ADDRESS,  // Link the external library
    },
  });

  const vaultDeployTransaction = await upgrades.deployProxy(
    Vault,
    [
      "Mock4626ZetachainERC20Vault",
      "AVU",
      VAULT_ASSET,
      await owner.getAddress(),
      FEE_RATE,
      gasTank.address,
      WITHDRAWAL_RECEIVER,
      GAS_LIMIT_FOR_WITHDRAW_AND_CALL,
      GAS_LIMIT_FOR_CALL
    ],
    {
      initializer: "initialize", unsafeAllowLinkedLibraries: true,  // Allow linking the external library
    },

  );
  const amanaVault = await vaultDeployTransaction.deployed();
  const zapContract = await ethers.getContractAt("ZapContract", ZAP_CONTRACT_ADDRESS);

  await gasTank.authorizeVault(amanaVault.address);

  const VaultFactory = await ethers.getContractFactory("Mock4626", owner);
  const mockVault = await VaultFactory.deploy(VAULT_ASSET);
  await mockVault.deployed();

  const StrategyFactory = await ethers.getContractFactory("Mock4626ZetachainStrategy", owner);
  const strategy = await StrategyFactory.deploy(
    "Mock Strategy",
    amanaVault.address,
    VAULT_ASSET,
    mockVault.address
  );
  await strategy.deployed();

  await amanaVault.setStrategy(strategy.address);

  const usdcBSC = await ethers.getContractAt("IERC20", ZC_USDC_BSC_ADDRESS);
  const ethBase = await ethers.getContractAt("IERC20", ZC_ETH_BASE_ADDRESS);
  const ethEth = await ethers.getContractAt("IERC20", ZC_ETH_ETH_ADDRESS);

  const depositAmount1 = ethers.utils.parseUnits("0.01", 18);
  const minSharesOut1 = 0
  const depositAmount2 = ethers.utils.parseUnits("0.005", 18);
  const minSharesOut2 = 0 //depositAmount2.mul(1000).div(1001); // 0.1% slippage
  const rewardAmount = ethers.utils.parseUnits("1000", 18);

  await setTokenBalance(ZC_ETH_ETH_ADDRESS, gasTank.address, depositAmount1.mul(20), 3);
  await setTokenBalance(ZC_ETH_BASE_ADDRESS, gasTank.address, depositAmount1.mul(20), 3);
  await setTokenBalance(ZC_ETH_ETH_ADDRESS, await owner.getAddress(), depositAmount1.mul(20), 3);
  await setTokenBalance(ZC_USDC_BSC_ADDRESS, await owner.getAddress(), depositAmount1.mul(200), 3);

  async function simulateDepositCallFromBase(
    user: Signer,
    depositAmount: BigNumber
  ): Promise<void> {
    // Set token balance for the vault
    await setTokenBalance(ZC_ETH_BASE_ADDRESS, amanaVault.address, depositAmount, 3);
    const minSharesOut = 0 //depositAmount.mul(1000).div(1001); // 0.1% slippage
    const slippage = 200;
    const transactionId = generateTransactionId(await user.getAddress(), 8453)
    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256", "uint16", "bytes32"],
      [INPUT_TOKEN, minSharesOut, slippage, transactionId]
    );
    // Execute the onCall function to simulate a deposit
    await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_ETH_BASE_ADDRESS,
      depositAmount,
      depositMessage
    );
  }

  async function simulateWithdrawCallFromBase(
    user: Signer,
    withdrawAmount: BigNumber
  ): Promise<any> {
    const minAmountOut = 0 //withdrawAmount.mul(1000).div(1001); // 0.1% slippage
    const slippage = 200;
    const transactionId = generateTransactionId(await user.getAddress(), 8453)

    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes32"],
      [ZC_ETH_BASE_ADDRESS, ethers.constants.AddressZero, withdrawAmount, minAmountOut, slippage, transactionId]
    );
    const tx = await amanaVault.connect(gatewaySigner).onCall(
      {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: await user.getAddress(),
        chainID: ORIGIN_CHAIN_ID,
      },
      ZC_ETH_BASE_ADDRESS,
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
    ethBase,
    ethEth,
    amanaVault,
    gasTank,
    mockVault,
    strategy,
    depositAmount1,
    depositAmount2,
    rewardAmount,
    simulateDepositCallFromBase,
    simulateWithdrawCallFromBase,
    zapContract
  };
}

describe("AmanaZetachainVault Tests", function () {
  it("should correctly initialize the vault", async function () {
    const { amanaVault, owner } = await loadFixture(setup);

    expect(await amanaVault.name()).to.equal("Mock4626ZetachainERC20Vault");
    expect(await amanaVault.symbol()).to.equal("AVU");
    expect(await amanaVault.asset()).to.equal(VAULT_ASSET);
    expect(await amanaVault.owner()).to.equal(await owner.getAddress());
    expect(await amanaVault.perfFee()).to.equal(FEE_RATE);
  });

  it("should reject unauthorized access to setStrategy", async function () {
    const { user1, amanaVault } = await loadFixture(setup);

    await expect(
      amanaVault.connect(user1).setStrategy(STRATEGY_ADDRESS)
    ).to.be.revertedWithCustomError(amanaVault, "OwnableUnauthorizedAccount").withArgs(await user1.getAddress());
  });

  it("should handle strategy switching", async function () {
    const { amanaVault, owner, mockVault, ethEth } = await loadFixture(setup);
    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    const minSharesOut = 0 //depositAmount.mul(1000).div(1001); // 0.1% slippage
    await ethEth.approve(amanaVault.address, depositAmount);
    await amanaVault["deposit(uint256,uint256,address)"](depositAmount, minSharesOut, await owner.getAddress());

    const StrategyFactory = await ethers.getContractFactory("Mock4626ZetachainStrategy", owner);
    const strategy2 = await StrategyFactory.deploy(
      "Mock Strategy",
      amanaVault.address,
      VAULT_ASSET,
      mockVault.address
    );
    await strategy2.deployed();
    const newStrategyAddress = strategy2.address;
    // const newChainId = STRATEGY_CHAIN_ID;

    // Switch the vault strategy
    await expect(amanaVault.connect(owner).switchStrategy(newStrategyAddress, 0, 0))
      .to.emit(amanaVault, "StrategyUpdated")
      .withArgs(newStrategyAddress);

    // Validate that the strategy and chain ID are updated
    const strategyAddress = await amanaVault.strategyAddress();
    expect(strategyAddress).to.equal(newStrategyAddress);

    const totalAssetsNewStrategy = await amanaVault.totalAssets();
    expect(totalAssetsNewStrategy).to.equal(depositAmount); // add 1 for virtual share / asset
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

    expect(await amanaVault.perfFee()).to.equal(newFeeRate);
  });

  it("should execute a basic direct deposit", async function () {
    const { user1, depositAmount1, amanaVault, ethEth } = await loadFixture(setup);
    const minSharesOut = 0
    const previewDeposit = await amanaVault.previewDeposit(depositAmount1);

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1, 3);

    await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.equal(previewDeposit);
  });

  it("should execute a ZapContract deposit with ERC20", async function () {
    const { user1, depositAmount1, amanaVault, ethBase, zapContract } = await loadFixture(setup);
    const minSharesOut = 0
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

    await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user1.getAddress(), depositAmount1, 3);

    await ethBase.connect(user1).approve(ZAP_CONTRACT_ADDRESS, depositAmount1);
    await zapContract.connect(user1).zapDeposit(ZC_ETH_BASE_ADDRESS, amanaVault.address, ZC_ETH_ETH_ADDRESS, depositAmount1, minSharesOut, await user1.getAddress(), 500);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(depositAmount1, ERROR_MARGIN);
  });

  it("should execute a ZapContract deposit with ZETA", async function () {
    const { user1, depositAmount1, amanaVault, ethBase, zapContract } = await loadFixture(setup);
    const minSharesOut = 0
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

    await setTokenBalance(ZC_ETH_BASE_ADDRESS, await user1.getAddress(), depositAmount1, 3);

    await ethBase.connect(user1).approve(ZAP_CONTRACT_ADDRESS, depositAmount1);
    await zapContract.connect(user1).zapDeposit(ethers.constants.AddressZero, amanaVault.address, ZC_ETH_ETH_ADDRESS, depositAmount1, minSharesOut, await user1.getAddress(), 500, { value: depositAmount1 });

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(1191337867481, ERROR_MARGIN); // this is based on ZETA->ETH conversion rate (TODO make dynamic?)
  });

  it("should execute a basic cross chain deposit", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase } = await loadFixture(setup);
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);

    await simulateDepositCallFromBase(user1, depositAmount1);

    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(depositAmount1, ERROR_MARGIN);
  });

  it("should execute a basic direct withdraw", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase, ethEth } = await loadFixture(setup);
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
    const minAmountOut = 0;
    await simulateDepositCallFromBase(user1, depositAmount1);
    const maxWithdrawAmount = await amanaVault.maxWithdraw(await user1.getAddress());
    await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](maxWithdrawAmount, minAmountOut, await user1.getAddress(), await user1.getAddress());

    let userBalance = await ethEth.balanceOf(await user1.getAddress());
    const totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    expect(userBalance).to.be.closeTo(maxWithdrawAmount, ERROR_MARGIN);
  });

  it("should execute a basic cross chain withdraw", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase, simulateWithdrawCallFromBase } = await loadFixture(setup);
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);

    await simulateDepositCallFromBase(user1, depositAmount1);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());

    await simulateWithdrawCallFromBase(user1, totalShares);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());

    expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
  });

  it("should execute a basic direct redeem", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase, ethEth } = await loadFixture(setup);
    const minAmountOut = 0
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);

    await simulateDepositCallFromBase(user1, depositAmount1);

    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    await amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress());

    totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance = await ethEth.balanceOf(await user1.getAddress());
    expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    expect(userBalance).to.be.closeTo(depositAmount1, ERROR_MARGIN);
  });

  it("should execute a basic direct redeemToAnyToken", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase, usdcBSC } = await loadFixture(setup);
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
    const minAmountOut = 0
    await simulateDepositCallFromBase(user1, depositAmount1);
    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    let userBalance = await usdcBSC.balanceOf(await user1.getAddress());
    await amanaVault.connect(user1)["redeemToAnyToken(uint256,uint256,address,address,address,uint16)"](totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), ZC_USDC_BSC_ADDRESS, 500);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());
    userBalance = await usdcBSC.balanceOf(await user1.getAddress());
    expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    expect(userBalance).to.be.gt(0);
  });

  it("should execute a basic direct redeemToAnyToken to ZETA", async function () {
    const { user1, depositAmount1, amanaVault, simulateDepositCallFromBase } = await loadFixture(setup);
    // await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0);
    const minAmountOut = 0
    await simulateDepositCallFromBase(user1, depositAmount1);
    let totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance1 = await ethers.provider.getBalance(await user1.getAddress());
    const withdrawToken = ethers.constants.AddressZero;
    await amanaVault.connect(user1)["redeemToAnyToken(uint256,uint256,address,address,address,uint16)"](totalShares, minAmountOut, await user1.getAddress(), await user1.getAddress(), withdrawToken, 500);

    totalShares = await amanaVault.balanceOf(await user1.getAddress());
    const userBalance2 = await ethers.provider.getBalance(await user1.getAddress());
    expect(totalShares).to.be.closeTo(0, ERROR_MARGIN);
    expect(userBalance2).to.be.gt(userBalance1);
  });

  it("should calculate and deduct the performance fee on withdrawal", async function () {
    const { user1, depositAmount1, amanaVault, ethEth, mockVault } = await loadFixture(setup);
    const minSharesOut = 0;

    // Step 1: Simulate a deposit by User1
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1, 3);
    await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());
    const totalUserShares = await amanaVault.balanceOf(await user1.getAddress());

    const initialTotalAssets = depositAmount1;

    // Step 2: Simulate a deposit by User2
    const profit = depositAmount1.div(10); // 10% profit
    await ethEth.transfer(mockVault.address, profit);

    // Step 3: Perform a withdrawal and calculate the fee
    const withdrawAmount = totalUserShares.div(2); // Withdraw everything except the fee
    const expectedFee = profit.mul(FEE_RATE).div(20000);
    const minAmountOut = 0;

    // Capture the transaction
    const tx = await amanaVault.connect(user1)["redeem(uint256,uint256,address,address)"](
      withdrawAmount, minAmountOut, await user1.getAddress(), await user1.getAddress()
    );

    // Wait for transaction to be mined and get the emitted event logs
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === "PerformanceFeePaid");

    // Ensure the event was actually emitted
    expect(event, "PerformanceFeePaid event not found").to.not.be.undefined;
    expect(event?.args, "PerformanceFeePaid event has no args").to.not.be.undefined;

    // Extract the emitted fee
    const emittedFee = event!.args![1];

    // Allow a small tolerance (e.g., 1%)
    const tolerance = expectedFee.div(100); // 1% tolerance

    expect(emittedFee).to.be.closeTo(expectedFee, tolerance);
  });


  it("should handle emergency withdrawal by the owner", async function () {
    const { amanaVault, owner, ethEth } = await loadFixture(setup);

    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await owner.getAddress(), depositAmount, 3);
    await ethEth.transfer(amanaVault.address, depositAmount);

    const balanceBefore = await ethEth.balanceOf(await owner.getAddress());
    await amanaVault.connect(owner).emergencyWithdraw(VAULT_ASSET);

    const balanceAfter = await ethEth.balanceOf(await owner.getAddress());
    expect(balanceAfter.sub(balanceBefore)).to.equal(depositAmount);
  });

  it("should reject unauthorized emergency withdrawal", async function () {
    const { amanaVault, user1, ethEth } = await loadFixture(setup);

    const depositAmount = ethers.utils.parseUnits("0.1", 18);
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount, 3);

    await ethEth.transfer(amanaVault.address, depositAmount);

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

    await expect(amanaVault["withdraw(uint256,uint256,address,address)"](excessiveWithdrawAmount, 0, await user1.getAddress(), await user1.getAddress()))
      .to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
  });

  it("should update user shares correctly after multiple deposits and withdrawals", async function () {
    const { user1, user2, depositAmount1, depositAmount2, amanaVault, ethEth } = await loadFixture(setup);
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, amanaVault.address, 0, 3);

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1, 3);

    await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
    const minSharesOut1 = 0
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut1, await user1.getAddress());

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user2.getAddress(), depositAmount2, 3);

    await ethEth.connect(user2).approve(amanaVault.address, depositAmount2);
    const minSharesOut2 = 0;
    await amanaVault.connect(user2)["deposit(uint256,uint256,address)"](depositAmount2, minSharesOut2, await user2.getAddress());

    const totalDeposits = depositAmount1.add(depositAmount2);

    // User1 withdraws part of their deposit
    const withdrawAmount1 = depositAmount1.div(2);
    const minAmountOut1 = withdrawAmount1.mul(1000).div(1001); // 0.1% slippage
    await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](withdrawAmount1, minAmountOut1, await user1.getAddress(), await user1.getAddress());

    // Validate the remaining shares for User1
    const remainingShares = await amanaVault.balanceOf(await user1.getAddress());
    const expectedShares = depositAmount1.sub(withdrawAmount1);
    expect(remainingShares).to.be.closeTo(expectedShares, ERROR_MARGIN);
  });

  it("should handle multiple withdrawals up to the total amount based on user balance", async function () {
    const { user1, depositAmount1, amanaVault, ethEth } = await loadFixture(setup);
    const minSharesOut = 0
    // Step 1: Deposit into the vault
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1, 3);
    await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut, await user1.getAddress());

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
      await amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](
        withdrawAmount,
        withdrawAmount.mul(1000).div(1001), // 0.1% slippage
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
    expect(finalAssets).to.equal(0); // Vault should only have 1 virtual share left

    // Step 4: Ensure further withdrawals fail
    await expect(
      amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](1, 0, await user1.getAddress(), await user1.getAddress())
    ).to.be.revertedWithCustomError(amanaVault, "ERC4626ExceededMaxWithdraw");
  });

  it("should handle zero balances without errors", async function () {
    const { user1, ethBase, amanaVault } = await loadFixture(setup);

    // Simulate a withdrawal for a user with zero balance
    const zeroAmount = BigNumber.from(0);
    await expect(amanaVault.connect(user1)["withdraw(uint256,uint256,address,address)"](zeroAmount, 0, await user1.getAddress(), await user1.getAddress())).to.be
      .revertedWithCustomError(amanaVault, "AmountCantBeZero");

    // Deposit and then withdraw entire balance
    await ethBase.connect(user1).approve(amanaVault.address, zeroAmount);
    await expect(amanaVault.connect(user1)["deposit(uint256,uint256,address)"](zeroAmount, 0, await user1.getAddress()))
      .to.be.revertedWithCustomError(amanaVault, "AmountCantBeZero");
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

    await setTokenBalance(ZC_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount, 3); // Set the reward amount

    // User1 should now have accumulated rewards halfway through the campaign
    await amanaVault.connect(user1).claimRewards(await user1.getAddress()); // Claim the rewards

    // Check the rewards balance for User1
    const userRewardBalance = await usdcBSC.balanceOf(await user1.getAddress());
    expect(userRewardBalance).to.be.closeTo(expectedReward, ethers.utils.parseUnits("1", 18)); // Allow a small margin for rounding
  });

  it("should correctly distribute rewards proportional to user shares", async function () {
    const { user1, user2, depositAmount1, depositAmount2, usdcBSC, amanaVault, owner, ethEth } = await loadFixture(setup);

    const rewardAmount = ethers.utils.parseUnits("1000", 18);
    const rewardDuration = 3600; // 1 hour in seconds

    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock.timestamp;

    const startTimestamp = currentTimestamp + 600; // Start rewards 600 seconds later
    const endTimestamp = startTimestamp + rewardDuration;

    await amanaVault.connect(owner).setRewardToken(usdcBSC.address);
    await amanaVault.connect(owner).setRewardsInterval(startTimestamp, endTimestamp, rewardAmount);

    await setTokenBalance(ZC_USDC_BSC_ADDRESS, amanaVault.address, rewardAmount, 3);

    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user1.getAddress(), depositAmount1, 3);
    await setTokenBalance(ZC_ETH_ETH_ADDRESS, await user2.getAddress(), depositAmount2, 3);

    await ethEth.connect(user1).approve(amanaVault.address, depositAmount1);
    const minSharesOut1 = 0
    await amanaVault.connect(user1)["deposit(uint256,uint256,address)"](depositAmount1, minSharesOut1, await user1.getAddress());

    await ethEth.connect(user2).approve(amanaVault.address, depositAmount2);
    const minSharesOut2 = 0
    await amanaVault.connect(user2)["deposit(uint256,uint256,address)"](depositAmount2, minSharesOut2, await user2.getAddress());

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


