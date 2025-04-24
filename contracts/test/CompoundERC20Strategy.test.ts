import { ethers, network } from "hardhat";
import { expect } from "chai";
import { BigNumber, Signer } from "ethers";
import { ERC20_Compound_Strategy, IERC20, ICompoundVault, ICometRewards, ISwapHelper } from "../typechain";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../constants";
import { simulateDepositCallFromVaultToStrategy, simulateWithdrawCallFromVaultToStrategy, simulateSwitchCallFromVaultToStrategy, setTokenBalance } from "./utils";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

const BASE_CHAIN_ID = 8453;
const ETHEREUM_CHAIN_ID = 1;

const GATEWAY_ADDRESS = "0x48b9aacc350b20147001f88821d31731ba4c30ed";
const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const INPUT_TOKEN_ADDRESS = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; //USDT
const RECEIPT_TOKEN_ADDRESS = "0xaeB318360f27748Acb200CE616E389A6C9409a07";
const COMET_REWARDS_ADDRESS = "0x45939657d1CA34A8FA39A924B71D28Fe8431e581";
const WITHDRAW_HELPER_ADDRESS = "0x1F2C8D4A3E5B7C6D9F2A0E4B5C7F3D8E1A6B8C9F";
const COMP_TOKEN_ADDRESS = "0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c";

const FORK_BLOCK = 70004444;
const ERROR_MARGIN = BigNumber.from("2"); // 0.01% error margin

let owner: Signer;
let user1: Signer;
let user2: Signer;
let gatewaySigner: Signer;
let strategy: ERC20_Compound_Strategy;

async function setupGatewaySigner() {
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [GATEWAY_ADDRESS],
  });

  gatewaySigner = await ethers.getSigner(GATEWAY_ADDRESS);

  await network.provider.send("hardhat_setBalance", [
    GATEWAY_ADDRESS,
    ethers.utils.parseEther("10").toHexString(),
  ]);
  return gatewaySigner;
}

describe("ERC20_Compound_Strategy - Full Coverage", function () {

  let owner: Signer;
  let inputToken: IERC20;
  let gatewaySigner: Signer;
  let compoundVault: ICompoundVault;
  let cometRewardsContract: ICometRewards;
  let swapHelper: ISwapHelper;

  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: "https://137.rpc.thirdweb.com/4e74a8cc63319adbdf4ca0f672467a7c",
            blockNumber: FORK_BLOCK,
          },
        },
      ]
    });
    gatewaySigner = await setupGatewaySigner();

  });

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    inputToken = await ethers.getContractAt("IERC20", INPUT_TOKEN_ADDRESS, gatewaySigner);
    compoundVault = await ethers.getContractAt("ICompoundVault", RECEIPT_TOKEN_ADDRESS, gatewaySigner);
    cometRewardsContract = await ethers.getContractAt("ICometRewards", COMET_REWARDS_ADDRESS, gatewaySigner);

    const SwapHelperPolygon = await ethers.getContractFactory("SwapHelperPolygon");
    swapHelper = await SwapHelperPolygon.deploy();
    await swapHelper.deployed();

    const StrategyFactory = await ethers.getContractFactory("ERC20_Compound_Strategy");
    strategy = await StrategyFactory.deploy(
      "ERC20_Compound_Strategy",
      AMANA_VAULT_ADDRESS,
      INPUT_TOKEN_ADDRESS,
      RECEIPT_TOKEN_ADDRESS,
      GATEWAY_ADDRESS,
      WITHDRAW_HELPER_ADDRESS,
      swapHelper.address
    );
    await strategy.deployed();

  });

  after(async () => {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [GATEWAY_ADDRESS],
    });
  });

  it("should revert if a non-gateway address tries to call onCall", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const slippage = 10000;
    const minSharesOut = ethers.utils.parseEther("0");

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await expect(simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      owner, // put in non gateway signer
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    )).to.be.revertedWithCustomError(strategy, "OnlyGateway");

    // Attempt withdraw from a non-gateway address
    const withdrawAmountInShares = ethers.utils.parseEther("0.5");
    const minAmountOut = ethers.utils.parseEther("0.51");
    const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);

    const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);


    await expect(simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      owner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmountInShares,
      withdrawFractionOfTotalShares,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    )).to.be.revertedWithCustomError(strategy, "OnlyGateway");
  });

  it("should revert if the original sender of a deposit or withdrawal is not amanaVault", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);
    const minSharesOut = ethers.utils.parseEther("0.99");
    const slippage = 10000;

    const invalidSenderAddress = OWNER_ADDRESS;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await expect(simulateDepositCallFromVaultToStrategy(
      invalidSenderAddress,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    )).to.be.revertedWithCustomError(strategy, "OnlyVault");

    // Attempt a withdrawal from a non-vault sender
    const withdrawAmountInShares = ethers.utils.parseEther("0.5");
    const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);
    const minAmountOut = ethers.utils.parseEther("0.51");

    await expect(simulateWithdrawCallFromVaultToStrategy(
      OWNER_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmountInShares,
      withdrawFractionOfTotalShares,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    )).to.be.revertedWithCustomError(strategy, "OnlyVault");
  });

  it("should allow Gateway to invest ERC20", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");
    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );

    let strategyBalance;

    strategyBalance = await compoundVault.balanceOf(strategy.address);

    expect(strategyBalance).to.be.closeTo(depositAmount, ERROR_MARGIN);
  });

  it("should allow Gateway to withdraw ERC20", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");
    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    )
    const shares = await compoundVault.balanceOf(strategy.address);
    expect(shares).to.be.gt(0); // Ensure shares were received
    const withdrawAmountInShares = ethers.utils.parseEther("1"); // represents full amount
    const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(depositAmount);

    const minAmountOut = ethers.BigNumber.from("0");

    await simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmountInShares,
      withdrawFractionOfTotalShares,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    );
    let strategyBalance;

    strategyBalance = await compoundVault.balanceOf(strategy.address);

    expect(strategyBalance).to.equal(0);

  });

  it("should succesfully harvest when withdrawing after accumulating rewards", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");
    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    // Step 1: Set Token Balance and Approve Strategy
    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    // Step 2: Simulate Deposit
    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );

    // Step 3: Check Initial Shares in  Pool
    const initialShares = await compoundVault.balanceOf(strategy.address);
    expect(initialShares).to.be.gt(0); // Ensure shares were received

    // Step 4: Simulate Time Passing for Rewards Accumulation
    const timeToSimulate = 7 * 24 * 60 * 60; // Simulate 7 days of staking rewards
    await ethers.provider.send("evm_increaseTime", [timeToSimulate]); // Fast-forward time
    await ethers.provider.send("evm_mine", []); // Mine a new block

    const reward = await cometRewardsContract.callStatic.getRewardOwed(RECEIPT_TOKEN_ADDRESS, strategy.address);
    expect(reward.owed).to.be.gt(0); // Ensure rewards were received

    // Step 5: Check Claimable Rewards
    expect(reward.owed).to.be.gt(0); // Ensure some rewards have accrued

    // Step 6: Simulate Withdrawal
    const withdrawAmountInShares = initialShares; // Represents full amount
    const withdrawFractionOfTotalShares = withdrawAmountInShares.mul(ethers.utils.parseEther("1")).div(withdrawAmountInShares);
    const minAmountOut = ethers.BigNumber.from("0");

    await simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmountInShares,
      withdrawFractionOfTotalShares,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    );

    // Step 7: Check Strategy Balance After Withdrawal
    let strategyBalance;

    strategyBalance = await compoundVault.balanceOf(strategy.address);
    expect(strategyBalance).to.equal(0); // Ensure strategy balance is zero

    // Step 8: Check that Rewards Were Claimed (Optional)
    const finalClaimableRewards = await cometRewardsContract.callStatic.getRewardOwed(RECEIPT_TOKEN_ADDRESS, strategy.address);
    expect(finalClaimableRewards.owed).to.be.lt(reward.owed); // Rewards should have been claimed
  });

  it("should allow owner to perform emergencyWithdraw", async function () {

    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, ethers.utils.parseEther("1"), 0);

    const initialBalance = await inputToken.balanceOf(strategy.address);
    expect(initialBalance).to.be.gt(0);

    await strategy.emergencyWithdraw(inputToken.address);

    const finalBalance = await inputToken.balanceOf(strategy.address);
    expect(finalBalance).to.equal(0);
  });

  it("should emit events on failed invest confirmation", async function () {
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
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "bytes32", "uint256", "uint256", "address", "uint256"],
      ["_returnFundsFromStrategyFailed", ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32), 0, 0, ethers.constants.AddressZero, 0]
    );

    const withdrawPlusFee = ethers.BigNumber.from("1000000");

    // Fund the strategy contract with the required ERC20
    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, withdrawPlusFee, 0);

    let initialBalance;

    initialBalance = await compoundVault.balanceOf(strategy.address);

    const revertContext = {
      sender: strategy.address,
      asset: INPUT_TOKEN_ADDRESS, // the ERC20 that we were trying to do depositAndCall with
      revertMessage,
      amount: withdrawPlusFee,
    };

    await expect(strategy.connect(gatewaySigner).onRevert(revertContext))
      .to.emit(strategy, "ReturnFundsFromStrategyFailed")
      .withArgs(ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32));
  });

  it("should emit the TotalUnderlyingAssetsSent event", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );
    const shares = await compoundVault.balanceOf(strategy.address);
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
    const event = receipt.events?.find(e => e.event === "TotalUnderlyingAssetsSent");

    // Check if the event was found
    expect(event, "TotalUnderlyingAssetsSent event not found").to.not.be.undefined;
    expect(event?.args, "TotalUnderlyingAssetsSent event has no args").to.not.be.undefined;

    const emittedDepositAmount = event!.args![1]; // Second argument is the deposit amount

    // Allow some deviation from `depositAmount` (e.g., ±1%)
    const tolerance = depositAmount.div(100); // 1% tolerance
    expect(emittedDepositAmount).to.be.closeTo(depositAmount, tolerance);

  });

  it("should call GatewayEVM on manualResendConfirmation and emit an event", async function () {
    // Mock data for the test
    const userAddress = OWNER_ADDRESS;
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
    //   AMANA_VAULT_ADDRESS,    // Destination vault address
    //   payload,                // The encoded outgoingMessage
    //   revertOptions           // The constructed revertOptions
    // );
  });

  it("should call GatewayEVM on manualResendFundsAndDivestConfirmation and emit an event", async function () {
    // Mock data for the test
    const userAddress = OWNER_ADDRESS;
    const withdrawZRC20 = ZC_TEST_ETH_SEPOLIA_ADDRESS; // ETH or replace with actual ZRC20 token address
    const amount = ethers.utils.parseEther("1000"); // 1000 tokens
    const fractionOfTotalShares = ethers.utils.parseEther("0.2");
    const withdrawChainId = ETHEREUM_CHAIN_ID; // Example chain ID
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

    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, ethers.utils.parseEther("1010"), 0);
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
    //   AMANA_VAULT_ADDRESS,    // Destination vault address
    //   amount,             // Amount to be deposited
    //   INPUT_TOKEN_ADDRESS, // ZRC20 token address
    //   payload,                // The encoded outgoingMessage
    //   revertOptions           // The array-formatted revertOptions
    // );
  });

  it("should transfer Assets to new strategy on strategy switch via onCall", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");
    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );
    const oldStrategyInitialBalance = await compoundVault.balanceOf(strategy.address);

    const StrategyFactory = await ethers.getContractFactory("ERC20_Compound_Strategy");

    const newStrategy = await StrategyFactory.deploy(
      "ERC20_Compound_Strategy",
      AMANA_VAULT_ADDRESS,
      INPUT_TOKEN_ADDRESS,
      RECEIPT_TOKEN_ADDRESS,
      GATEWAY_ADDRESS,
      WITHDRAW_HELPER_ADDRESS,
      swapHelper.address
    );
    await newStrategy.deployed();

    await newStrategy.connect(owner).setOldStrategy(strategy.address);

    await expect(simulateSwitchCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      gatewaySigner,
      strategy,
      newStrategy.address
    )).to.emit(strategy, "AssetsTransferredToNewStrategy")
      .to.emit(newStrategy, "FundsInvested");

    const oldStrategyBalance = await compoundVault.balanceOf(strategy.address);
    expect(oldStrategyBalance).to.equal(0);
    const newStrategyBalance = await compoundVault.balanceOf(newStrategy.address);
    expect(newStrategyBalance).to.be.closeTo(oldStrategyInitialBalance, ethers.utils.parseUnits("0.001", 18));
  });

  it("should harvest and reinvest rewards when called externally", async function () {
    const depositAmount = ethers.utils.parseUnits("1000000", 6); // USDC has 6 decimals
    const slippage = 10000;
    const minSharesOut = ethers.BigNumber.from("0");

    // Step 1: Set Token Balance and Approve
    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    // Step 2: Deposit
    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID
    );

    // Step 3: Accumulate Rewards
    const timeToSimulate = 7 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [timeToSimulate]);
    await ethers.provider.send("evm_mine", []);

    const preHarvestReward = await cometRewardsContract.callStatic.getRewardOwed(RECEIPT_TOKEN_ADDRESS, strategy.address);
    expect(preHarvestReward.owed).to.be.gt(0);

    // Step 4: Call harvest externally
    const tx = await strategy.connect(gatewaySigner).harvest();
    await tx.wait();

    // Step 5: Confirm Rewards Harvested Event
    const receipt = await tx.wait();
    const event = receipt.events?.find(e => e.event === "RewardsHarvested");
    expect(event).to.not.be.undefined;

    if (!event) {
      throw new Error("Event not found");
    }

    const [compAmount, , usdcReceived] = event.args!;

    expect(compAmount).to.be.gt(0);
    expect(usdcReceived).to.be.gt(0);
  });

  it("should claim rewards when claimRewards is called externally", async function () {
    const depositAmount = ethers.utils.parseUnits("1000000", 6);
    const slippage = 10000;
    const minSharesOut = ethers.BigNumber.from("0");

    // Step 1: Set Token Balance and Approve
    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 0);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    // Step 2: Deposit
    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID
    );

    // Step 3: Accumulate Rewards
    const timeToSimulate = 7 * 24 * 60 * 60;
    await ethers.provider.send("evm_increaseTime", [timeToSimulate]);
    await ethers.provider.send("evm_mine", []);

    const rewardBeforeClaim = await cometRewardsContract.callStatic.getRewardOwed(RECEIPT_TOKEN_ADDRESS, strategy.address);
    expect(rewardBeforeClaim.owed).to.be.gt(0);

    // Step 4: Call claimRewards externally
    const claimedAmount = await strategy.connect(gatewaySigner).callStatic.claimRewards();
    expect(claimedAmount).to.be.gt(0);

    // Step 5: Execute for real and verify COMP balance
    await strategy.connect(gatewaySigner).claimRewards();
    const compToken = await ethers.getContractAt("IERC20", COMP_TOKEN_ADDRESS, gatewaySigner);
    const compBalance = await compToken.balanceOf(strategy.address);
    expect(compBalance).to.be.gte(claimedAmount);
  });

});
