import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { Eth_4626_Strategy, IERC20, Mock4626 } from "../typechain";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../constants";
import { simulateDepositCallFromVaultToStrategy, simulateWithdrawCallFromVaultToStrategy, simulateSwitchCallFromVaultToStrategy } from "./utils";

import dotenv from "dotenv";
dotenv.config();

const BASE_SEPOLIA_CHAIN_ID = 84532;
const SEPOLIA_CHAIN_ID = 11155111;

const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";
const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

let owner: Signer;
let user1: Signer;
let user2: Signer;
let gatewaySigner: Signer;
let strategy: Eth_4626_Strategy;
let receiptToken: IERC20;

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
}

describe("Eth_4626_Strategy - Full Coverage", function () {
  let mockVault: Mock4626;
  let owner: Signer;

  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            blockNumber: 19375084,
          },
        },
      ]
    });
    [gatewaySigner] = await ethers.getSigners();
    await setupGatewaySigner();
  });

  beforeEach(async () => {
    [owner] = await ethers.getSigners();
    // Deploy Mock4626 vault
    const VaultFactory = await ethers.getContractFactory("Mock4626", owner);
    mockVault = await VaultFactory.deploy(WETH_ADDRESS);
    await mockVault.deployed();

    const StrategyFactory = await ethers.getContractFactory("Eth_4626_Strategy");
    strategy = await StrategyFactory.deploy(
      "Eth_4626_Strategy",
      AMANA_VAULT_ADDRESS,
      mockVault.address,
      GATEWAY_ADDRESS,
      WETH_ADDRESS
    );
    await strategy.deployed();

    receiptToken = await ethers.getContractAt("IERC20", mockVault.address);
  });

  after(async () => {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [GATEWAY_ADDRESS],
    });
  });

  it("should revert if a non-gateway address tries to call onCall", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const slippage = 500;
    const minSharesOut = ethers.utils.parseEther("0.99");

    await expect(simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      owner, // put in non gateway signer
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_SEPOLIA_CHAIN_ID,
    )).to.be.revertedWithCustomError(strategy, "OnlyGateway");

    // Attempt withdraw from a non-gateway address
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const maxStrategySharesBurnt = ethers.utils.parseEther("0.51");

    await expect(simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      owner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      maxStrategySharesBurnt,
      slippage,
      SEPOLIA_CHAIN_ID
    )).to.be.revertedWithCustomError(strategy, "OnlyGateway");
  });

  it("should revert if the original sender of a deposit or withdrawal is not amanaVault", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const minSharesOut = ethers.utils.parseEther("0.99");
    const slippage = 500;

    const invalidSenderAddress = OWNER_ADDRESS;

    await expect(simulateDepositCallFromVaultToStrategy(
      invalidSenderAddress,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_SEPOLIA_CHAIN_ID,
    )).to.be.revertedWithCustomError(strategy, "OnlyVault");

    // Attempt a withdrawal from a non-vault sender
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const maxStrategySharesBurnt = ethers.utils.parseEther("0.51");

    await expect(simulateWithdrawCallFromVaultToStrategy(
      OWNER_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      maxStrategySharesBurnt,
      slippage,
      SEPOLIA_CHAIN_ID
    )).to.be.revertedWithCustomError(strategy, "OnlyVault");
  });

  it("should allow Gateway to invest ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const minSharesOut = ethers.utils.parseEther("0.99");
    const slippage = 500;

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_SEPOLIA_CHAIN_ID,
    );

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow Gateway to withdraw ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const minSharesOut = ethers.utils.parseEther("0.99");
    const slippage = 500;

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_SEPOLIA_CHAIN_ID,
    )

    const withdrawAmount = ethers.utils.parseEther("0.5");
    const maxStrategySharesBurnt = ethers.utils.parseEther("0");

    await simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      ZC_TEST_ETH_SEPOLIA_ADDRESS,
      withdrawAmount,
      maxStrategySharesBurnt,
      slippage,
      SEPOLIA_CHAIN_ID
    );

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    const tolerance = ethers.utils.parseUnits("0.0000001", 18); // some interest dust
    expect(strategyBalance).to.be.lte(depositAmount.sub(withdrawAmount).add(tolerance));

  });

  it("should allow owner to perform emergencyWithdrawETH", async function () {
    await ethers.provider.send("eth_sendTransaction", [{
      from: OWNER_ADDRESS,
      to: strategy.address,
      value: ethers.utils.parseEther("1").toHexString(),
    }]);

    const initialBalance = await ethers.provider.getBalance(strategy.address);
    expect(initialBalance).to.be.gt(0);

    await strategy.emergencyWithdrawETH();

    const finalBalance = await ethers.provider.getBalance(strategy.address);
    expect(finalBalance).to.equal(0);
  });

  it("should emit events on failed invest confirmation", async function () {
    const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32)
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "bytes32"],
      ["_investConfirmFailed", crossChainTxId]
    );

    const revertContext = {
      sender: strategy.address,
      asset: ethers.constants.AddressZero,
      revertMessage,
      amount: 0,
    };

    await expect(strategy.connect(gatewaySigner).onRevert(revertContext))
      .to.emit(strategy, "InvestConfirmFailed")
      .withArgs(crossChainTxId);
  });

  it("should emit event and re-invest ETH on _returnFundsFromStrategyFailed revert", async function () {
    const crossChainTxId = ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32)
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "bytes32"],
      ["_returnFundsFromStrategyFailed", crossChainTxId]
    );

    const withdrawPlusFee = ethers.utils.parseEther("1");

    // Fund the strategy contract with the required ETH
    await ethers.provider.send("hardhat_setBalance", [
      strategy.address,
      withdrawPlusFee.toHexString(),
    ]);

    const initialBalance = await receiptToken.balanceOf(strategy.address);

    const revertContext = {
      sender: strategy.address,
      asset: ethers.constants.AddressZero,
      revertMessage,
      amount: withdrawPlusFee,
    };

    await expect(strategy.connect(gatewaySigner).onRevert(revertContext))
      .to.emit(strategy, "ReturnFundsFromStrategyFailed")
      .withArgs(crossChainTxId);

    const finalBalance = await receiptToken.balanceOf(strategy.address);

    // Check if the funds were successfully re-invested
    expect(finalBalance).to.be.gt(initialBalance);
  });

  it("should emit the TotalUnderlyingAssetsSent event", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const minSharesOut = ethers.utils.parseEther("0.99");
    const slippage = 500;

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_SEPOLIA_CHAIN_ID,
    );

    // Call the function
    await expect(strategy.sendTotalUnderlyingAssetsToVault())
      .to.emit(strategy, "TotalUnderlyingAssetsSent")
      .withArgs(
        AMANA_VAULT_ADDRESS, // Expected vault address
        depositAmount, // Expected underlying assets
        (await ethers.provider.getBlockNumber()) + 1, // Expected block number
        (await ethers.provider.getBlock("latest")).timestamp // Expected block timestamp
      );
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
        "address", // withdrawERC20
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
    const withdrawChainId = SEPOLIA_CHAIN_ID; // Example chain ID
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

    await ethers.provider.send("eth_sendTransaction", [{
      from: OWNER_ADDRESS,
      to: strategy.address,
      value: ethers.utils.parseEther("1010").toHexString(),
    }]);

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
    //   ethers.constants.AddressZero, // ZRC20 token address
    //   payload,                // The encoded outgoingMessage
    //   revertOptions           // The array-formatted revertOptions
    // );
  });

  it("should transfer Assets to new strategy on strategy switch via onCall", async function () {
    const depositAmount = ethers.utils.parseEther("1");
    const minSharesOut = ethers.utils.parseEther("0.99");
    const slippage = 500;

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_SEPOLIA_CHAIN_ID,
    );

    const StrategyFactory = await ethers.getContractFactory("Eth_4626_Strategy");

    const newStrategy = await StrategyFactory.deploy(
      "Eth_4626_Strategy",
      AMANA_VAULT_ADDRESS,
      mockVault.address,
      GATEWAY_ADDRESS,
      WETH_ADDRESS
    );
    await newStrategy.deployed();

    await newStrategy.setOldStrategy(strategy.address);

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
    expect(newStrategyBalance).to.equal(depositAmount);
  });
});
