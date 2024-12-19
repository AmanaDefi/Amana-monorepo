import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { ERC20_4626_Strategy, MockERC20, Mock4626, IERC20Custody } from "../typechain";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";
import { ZC_TEST_ETH_SEPOLIA_ADDRESS } from "../../constants";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const SEPOLIA_CHAIN_ID = 11155111;

const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";
const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const ERC20_CUSTODY_ADDRESS = "0xD80BE3710F08D280F51115e072e5d2a778946cd7";

let gatewaySigner: Signer;
let strategy: ERC20_4626_Strategy;

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

describe("ERC20_4626_Strategy - Full Coverage", function () {

  let owner: Signer;
  let mockERC20: MockERC20;
  let mockVault: Mock4626;

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
    const custody = (await ethers.getContractAt("IERC20Custody", ERC20_CUSTODY_ADDRESS, gatewaySigner)) as IERC20Custody;

    // Deploy MockERC20 token
    const ERC20Factory = await ethers.getContractFactory("MockERC20", owner);
    mockERC20 = await ERC20Factory.deploy("Mock Token", "MTKN", 18);
    await mockERC20.deployed();

    // Deploy Mock4626 vault
    const VaultFactory = await ethers.getContractFactory("Mock4626", owner);
    mockVault = await VaultFactory.deploy(mockERC20.address);
    await mockVault.deployed();

    const StrategyFactory = await ethers.getContractFactory("ERC20_4626_Strategy");
    strategy = await StrategyFactory.deploy(
      "ERC20_4626_Strategy",
      AMANA_VAULT_ADDRESS,
      mockERC20.address,
      mockVault.address,
      GATEWAY_ADDRESS
    );
    await strategy.deployed();

    // Impersonate the TSS contract, which has the WHITELISTER role
    const tssAddress = "0x8531a5aB847ff5B22D855633C25ED1DA3255247e";

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [tssAddress],
    });

    const impersonatedSigner = await ethers.getSigner(tssAddress);

    await custody.connect(impersonatedSigner).whitelist(mockERC20.address);

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
      [OWNER_ADDRESS, ethers.constants.AddressZero, depositAmount, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await mockERC20.mint(OWNER_ADDRESS, depositAmount);
    await mockERC20.approve(strategy.address, depositAmount);

    await expect(
      strategy.onCall(
        {
          sender: AMANA_VAULT_ADDRESS,
        },
        depositMessage,

        {
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
      [OWNER_ADDRESS, ethers.constants.AddressZero, depositAmount, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    // Attempt to call onCall from an address other than amanaVault
    const invalidSenderAddress = OWNER_ADDRESS;

    await mockERC20.mint(await gatewaySigner.getAddress(), depositAmount);
    await mockERC20.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await expect(
      strategy.connect(gatewaySigner).onCall(
        {
          sender: invalidSenderAddress, // Invalid sender, not amanaVault
        },
        depositMessage,
        {
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

  it("should allow Gateway to invest ERC20", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, depositAmount, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await mockERC20.mint(await gatewaySigner.getAddress(), depositAmount);
    await mockERC20.connect(gatewaySigner).approve(strategy.address, depositAmount);

    const tx = await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      depositMessage,
      {
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    );

    const receipt = await tx.wait();
    console.log("Gas used for invest:", receipt.gasUsed.toString());

    const strategyBalance = await mockVault.balanceOf(strategy.address);
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow Gateway to withdraw ERC20", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, depositAmount, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await mockERC20.mint(await gatewaySigner.getAddress(), depositAmount);
    await mockERC20.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      depositMessage,
      {
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

    const strategyBalance = await mockVault.balanceOf(strategy.address);
    const tolerance = ethers.utils.parseUnits("0.0000001", 18); // some interest dust
    expect(strategyBalance).to.be.lte(depositAmount.sub(withdrawAmount).sub(fee).add(tolerance));

  });

  it("should allow owner to perform emergencyWithdraw", async function () {

    await mockERC20.mint(strategy.address, ethers.utils.parseEther("1").toHexString());

    const initialBalance = await mockERC20.balanceOf(strategy.address);
    expect(initialBalance).to.be.gt(0);

    await strategy.emergencyWithdraw(mockERC20.address);

    const finalBalance = await mockERC20.balanceOf(strategy.address);
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

  it("should emit event and re-invest ERC20 on _returnFundsFromStrategyFailed revert", async function () {
    const revertMessage = ethers.utils.defaultAbiCoder.encode(
      ["string", "uint256"],
      ["_returnFundsFromStrategyFailed", 1]
    );

    const withdrawPlusFee = ethers.utils.parseEther("1");

    // Fund the strategy contract with the required ERC20
    await mockERC20.mint(strategy.address, withdrawPlusFee);

    const initialBalance = await mockVault.balanceOf(strategy.address);

    const revertContext = {
      sender: strategy.address,
      asset: mockERC20.address, // the ERC20 that we were trying to do depositAndCall with
      revertMessage,
      amount: withdrawPlusFee,
    };

    await expect(strategy.onRevert(revertContext))
      .to.emit(strategy, "ReturnFundsFromStrategyFailed")
      .withArgs(1);

    const finalBalance = await mockVault.balanceOf(strategy.address);

    // Check if the funds were successfully re-invested
    expect(finalBalance).to.be.gt(initialBalance);
  });

  it("should emit the TotalUnderlyingAssetsSent event", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [OWNER_ADDRESS, ethers.constants.AddressZero, depositAmount, 0, BASE_SEPOLIA_CHAIN_ID, true, 0]
    );

    await mockERC20.mint(await gatewaySigner.getAddress(), depositAmount);
    await mockERC20.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await strategy.connect(gatewaySigner).onCall(
      {
        sender: AMANA_VAULT_ADDRESS,
      },
      depositMessage,
      {
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

    await mockERC20.mint(strategy.address, ethers.utils.parseEther("1010"));
    // await mockERC20.connect(gatewaySigner).approve(strategy.address, ethers.utils.parseEther("1010"));

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
        mockERC20.address, // ZRC20 token address
        payload,                // The encoded outgoingMessage
        revertOptions           // The array-formatted revertOptions
      );
  });

});
