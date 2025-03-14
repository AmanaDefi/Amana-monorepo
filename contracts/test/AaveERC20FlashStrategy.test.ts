import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { AaveERC20FlashStrategy, IERC20, IAavePool } from "../typechain";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../constants";
import { simulateDepositCallFromVaultToStrategy, simulateWithdrawCallFromVaultToStrategy, simulateSwitchCallFromVaultToStrategy, setTokenBalance } from "./utils";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

const BASE_CHAIN_ID = 8453;
const ETHEREUM_CHAIN_ID = 1;

const GATEWAY_ADDRESS = "0x48b9aacc350b20147001f88821d31731ba4c30ed";
const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const INPUT_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RECEIPT_TOKEN_ADDRESS = "0xd09600475435CaB0E40DabDb161Fb5A3311EFcB3";
const POOL_ADDRESS = "0x766f21277087E18967c1b10bF602d8Fe56d0c671"
const VARIABLE_DEBT_TOKEN_ADDRESS = "0xA397391B718f3c7F21c63E8bEb09b66607419C38";

const FORK_BLOCK = 27154173;

let gatewaySigner: Signer;
let strategy: AaveERC20FlashStrategy;

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

describe("AaveERC20FlashStrategy - Full Coverage", function () {

  let owner: Signer;
  let inputToken: IERC20;
  let receiptToken: IERC20;
  let gatewaySigner: Signer;
  let aavePool: IAavePool;

  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
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
    receiptToken = await ethers.getContractAt("IERC20",
      RECEIPT_TOKEN_ADDRESS,
      gatewaySigner
    );
    aavePool = await ethers.getContractAt("IAavePool", POOL_ADDRESS, gatewaySigner);

    const StrategyFactory = await ethers.getContractFactory("AaveERC20FlashStrategy");

    strategy = await StrategyFactory.deploy(
      "Aave",
      AMANA_VAULT_ADDRESS,
      INPUT_TOKEN_ADDRESS,
      RECEIPT_TOKEN_ADDRESS,
      VARIABLE_DEBT_TOKEN_ADDRESS,
      GATEWAY_ADDRESS
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

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
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
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const minAmountOut = ethers.utils.parseEther("0.51");

    const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32);


    await expect(simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      owner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
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

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
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
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const minAmountOut = ethers.utils.parseEther("0.51");

    await expect(simulateWithdrawCallFromVaultToStrategy(
      OWNER_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    )).to.be.revertedWithCustomError(strategy, "OnlyVault");
  });

  it("should allow Gateway to invest ERC20", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");
    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 3);
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

    strategyBalance = await receiptToken.balanceOf(strategy.address);

    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow Gateway to withdraw ERC20", async function () {
    const depositAmount = ethers.BigNumber.from("1000000");
    const minSharesOut = ethers.BigNumber.from("0");
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
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
    const shares = await receiptToken.balanceOf(strategy.address);
    const withdrawAmount = ethers.utils.parseEther("1"); // represents full amount
    const minAmountOut = ethers.BigNumber.from("0");

    await simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    );
    let strategyBalance;
    strategyBalance = await receiptToken.balanceOf(strategy.address);

    expect(strategyBalance).to.equal(0);

  });

  it("should allow owner to perform emergencyWithdraw", async function () {

    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, ethers.utils.parseEther("1").toHexString(), 9);

    const initialBalance = await inputToken.balanceOf(strategy.address);
    expect(initialBalance).to.be.gt(0);

    await strategy.emergencyWithdraw(inputToken.address);

    const finalBalance = await inputToken.balanceOf(strategy.address);
    expect(finalBalance).to.equal(0);
  });

  it("should emit events on failed invest confirmation", async function () {
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "bytes32"],
      ["_investConfirmFailed", ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32)]
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
      ["string", "bytes32"],
      ["_returnFundsFromStrategyFailed", ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32)]
    );

    const withdrawPlusFee = ethers.BigNumber.from("1000000");

    // Fund the strategy contract with the required ERC20
    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, withdrawPlusFee, 9);

    let initialBalance;

    initialBalance = await receiptToken.balanceOf(strategy.address);

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

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
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
    const shares = await receiptToken.balanceOf(strategy.address);
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
      .withArgs(
        strategy.address,       // From address
        AMANA_VAULT_ADDRESS,    // Destination vault address
        payload,                // The encoded outgoingMessage
        revertOptions           // The constructed revertOptions
      );
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

    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, ethers.utils.parseEther("1010"), 9);
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

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
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
    const oldStrategyInitialBalance = await receiptToken.balanceOf(strategy.address);

    const StrategyFactory = await ethers.getContractFactory("AaveERC20FlashStrategy");

    const newStrategy = await StrategyFactory.deploy(
      "AaveERC20FlashStrategy",
      AMANA_VAULT_ADDRESS,
      INPUT_TOKEN_ADDRESS,
      RECEIPT_TOKEN_ADDRESS,
      VARIABLE_DEBT_TOKEN_ADDRESS,
      GATEWAY_ADDRESS
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

    const oldStrategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(oldStrategyBalance).to.equal(0);
    const newStrategyBalance = await receiptToken.balanceOf(newStrategy.address);
    expect(newStrategyBalance).to.be.closeTo(oldStrategyInitialBalance, ethers.utils.parseUnits("0.001", 18));
  });
});
