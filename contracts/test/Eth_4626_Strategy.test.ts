import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { Eth_4626_Strategy, IERC20, Mock4626 } from "../typechain";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../constants";
import dotenv from "dotenv";
dotenv.config();

const BASE_SEPOLIA_CHAIN_ID = 84532;
const SEPOLIA_CHAIN_ID = 11155111;

const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";
const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

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

    // Attempt deposit from a non-gateway address
    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, 0, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await expect(
      strategy.onCall(
        {
          sender: AMANA_VAULT_ADDRESS,
        },
        depositMessage,
        {
          value: depositAmount,
          gasPrice: ethers.utils.parseUnits("150", "gwei"),
        }
      )
    ).to.be.revertedWith("Only Gateway contract can call");

    // Attempt withdraw from a non-gateway address
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const fee = ethers.utils.parseEther("0.01");
    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, withdrawAmount, fee, SEPOLIA_CHAIN_ID, false, 1]
    );

    await expect(
      strategy.onCall(
        {
          sender: AMANA_VAULT_ADDRESS,
        },
        withdrawMessage,
        {
          gasPrice: ethers.utils.parseUnits("150", "gwei"),
        }
      )
    ).to.be.revertedWith("Only Gateway contract can call");
  });

  it("should revert if the original sender of a deposit or withdrawal is not amanaVault", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, 0, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    // Attempt to call onCall from an address other than amanaVault
    const invalidSenderAddress = OWNER_ADDRESS;

    await expect(
      strategy.connect(gatewaySigner).onCall(
        {
          sender: invalidSenderAddress, // Invalid sender, not amanaVault
        },
        depositMessage,
        {
          value: depositAmount,
          gasPrice: ethers.utils.parseUnits("150", "gwei"),
        }
      )
    ).to.be.revertedWith("Only Vault contract can call the strategy");

    // Attempt a withdrawal from a non-vault sender
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const fee = ethers.utils.parseEther("0.01");

    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, withdrawAmount, fee, SEPOLIA_CHAIN_ID, false, 1]
    );

    await expect(
      strategy.connect(gatewaySigner).onCall(
        {
          sender: invalidSenderAddress, // Invalid sender, not amanaVault
        },
        withdrawMessage,
        {
          gasPrice: ethers.utils.parseUnits("150", "gwei"),
        }
      )
    ).to.be.revertedWith("Only Vault contract can call the strategy");
  });

  it("should allow Gateway to invest ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, 0, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    const tx = await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      depositMessage,
      {
        value: depositAmount,
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    );

    const receipt = await tx.wait();
    console.log("Gas used for invest:", receipt.gasUsed.toString());

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow Gateway to withdraw ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, 0, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      depositMessage,
      {
        value: depositAmount,
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    );

    const withdrawAmount = ethers.utils.parseEther("0.5");
    const fee = ethers.utils.parseEther("0.01");

    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ZC_TEST_ETH_SEPOLIA_ADDRESS, withdrawAmount, fee, SEPOLIA_CHAIN_ID, false, 1]
    );

    const tx = await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      withdrawMessage,
      {
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    );

    const receipt = await tx.wait();
    console.log("Gas used for withdraw:", receipt.gasUsed.toString());

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    const tolerance = ethers.utils.parseUnits("0.0000001", 18); // some interest dust
    expect(strategyBalance).to.be.lte(depositAmount.sub(withdrawAmount).sub(fee).add(tolerance));

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
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      ["_investConfirmFailed", 1]
    );

    const revertContext = {
      sender: strategy.address,
      asset: ethers.constants.AddressZero,
      revertMessage,
      amount: 0,
    };

    await expect(strategy.onRevert(revertContext))
      .to.emit(strategy, "InvestConfirmFailed")
      .withArgs(1);
  });

  it("should emit event and re-invest ETH on _returnFundsFromStrategyFailed revert", async function () {
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      ["_returnFundsFromStrategyFailed", 1]
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

    await expect(strategy.onRevert(revertContext))
      .to.emit(strategy, "ReturnFundsFromStrategyFailed")
      .withArgs(1);

    const finalBalance = await receiptToken.balanceOf(strategy.address);

    // Check if the funds were successfully re-invested
    expect(finalBalance).to.be.gt(initialBalance);
  });

  it("should emit the TotalUnderlyingAssetsSent event", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, 0, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      depositMessage,
      {
        value: depositAmount,
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
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
    const totalUnderlyingAssetsBefore = ethers.utils.parseEther("5000");
    const totalUnderlyingAssetsAfter = ethers.utils.parseEther("6000");
    const executionNonce = 1;
    const crossChainTxId = 12345;

    // Construct the payload (outgoingMessage)
    const payload = ethers.utils.defaultAbiCoder.encode(
      [
        "address", // userAddress
        "address", // address(0) (ZRC20 token address)
        "uint256", // amount
        "uint256", // fee
        "uint32",  // withdrawChainId
        "bool",    // isInvest
        "uint256", // totalUnderlyingAssetsBefore
        "uint256", // totalUnderlyingAssetsAfter
        "uint256", // executionNonce
        "uint256"  // crossChainTxId
      ],
      [
        userAddress,
        ethers.constants.AddressZero,
        amount,
        0,
        0,
        true,
        totalUnderlyingAssetsBefore,
        totalUnderlyingAssetsAfter,
        executionNonce,
        crossChainTxId
      ]
    );

    // Construct the revertOptions
    const revertOptions = [
      strategy.address, // revertAddress
      false,            // callOnRevert
      strategy.address, // abortAddress
      ethers.utils.defaultAbiCoder.encode(
        ["string", "uint256"], // Revert handler function name and crossChainTxId
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
        totalUnderlyingAssetsBefore,
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
    const fee = ethers.utils.parseEther("10"); // 10 tokens as fee
    const withdrawChainId = SEPOLIA_CHAIN_ID; // Example chain ID
    const totalUnderlyingAssetsBefore = ethers.utils.parseEther("5000");
    const totalUnderlyingAssetsAfter = ethers.utils.parseEther("4000");
    const executionNonce = 1;
    const crossChainTxId = 12345;

    // Construct the payload (outgoingMessage)
    const payload = ethers.utils.defaultAbiCoder.encode(
      [
        "address", // userAddress
        "address", // withdrawZRC20
        "uint256", // amount
        "uint256", // fee
        "uint32",  // withdrawChainId
        "bool",    // isInvest (false for divestment)
        "uint256", // totalUnderlyingAssetsBefore
        "uint256", // totalUnderlyingAssetsAfter
        "uint256", // executionNonce
        "uint256"  // crossChainTxId
      ],
      [
        userAddress,
        withdrawZRC20,
        amount,
        fee,
        withdrawChainId,
        false,
        totalUnderlyingAssetsBefore,
        totalUnderlyingAssetsAfter,
        executionNonce,
        crossChainTxId
      ]
    );

    // Construct the revertOptions
    const revertOptions = [
      strategy.address, // revertAddress
      true,             // callOnRevert
      strategy.address, // abortAddress
      ethers.utils.defaultAbiCoder.encode(
        ["string", "uint256"], // Revert handler function name and crossChainTxId
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
        withdrawZRC20,
        amount,
        fee,
        withdrawChainId,
        totalUnderlyingAssetsBefore,
        totalUnderlyingAssetsAfter,
        executionNonce,
        crossChainTxId
      )
    )
      .to.emit(gatewayEVM, "DepositedAndCalled") // Replace with the actual event name
      .withArgs(
        strategy.address,       // From address
        AMANA_VAULT_ADDRESS,    // Destination vault address
        amount.add(fee),             // Amount to be deposited
        ethers.constants.AddressZero, // ZRC20 token address
        payload,                // The encoded outgoingMessage
        revertOptions           // The array-formatted revertOptions
      );
  });

});
