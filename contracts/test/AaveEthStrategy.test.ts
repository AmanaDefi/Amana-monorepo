import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { AaveEthStrategy, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import { BASE_SEPOLIA_USDC_ADDRESS, BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS } from "../../constants";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";
const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const WRAPPED_TOKEN_GATEWAY_ADDRESS = "0xF6Dac650dA5616Bc3206e969D7868e7c25805171";
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

let gatewaySigner: Signer;
let strategy: AaveEthStrategy;
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

describe("AaveEthStrategy - Full Coverage", function () {
  if (network.config.chainId !== BASE_SEPOLIA_CHAIN_ID) {
    console.log("Skipping tests because the network is not BaseSepolia");
    return;
  }

  before(async () => {
    [gatewaySigner] = await ethers.getSigners();
    await setupGatewaySigner();
  });

  beforeEach(async () => {
    const StrategyFactory = await ethers.getContractFactory("AaveEthStrategy");
    strategy = await StrategyFactory.deploy(
      "AaveEthStrategy",
      AMANA_VAULT_ADDRESS,
      BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS,
      GATEWAY_ADDRESS,
      WRAPPED_TOKEN_GATEWAY_ADDRESS,
      WETH_ADDRESS
    );
    await strategy.deployed();

    receiptToken = await ethers.getContractAt("IERC20", BASE_SEP_AAVE_ETH_RECEIPT_TOKEN_ADDRESS);
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
      [OWNER_ADDRESS, ethers.constants.AddressZero, withdrawAmount, fee, BASE_SEPOLIA_CHAIN_ID, false, 1]
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
      [OWNER_ADDRESS, ethers.constants.AddressZero, withdrawAmount, fee, BASE_SEPOLIA_CHAIN_ID, false, 1]
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
      [OWNER_ADDRESS, ethers.constants.AddressZero, withdrawAmount, fee, BASE_SEPOLIA_CHAIN_ID, false, 1]
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
      asset: ethers.constants.AddressZero, // why zero address? - because it's a native asset?
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

});
