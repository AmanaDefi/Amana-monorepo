import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { ERC20_4626_Strategy, MockERC20, Mock4626, IGatewayEVM, IERC20Custody } from "../typechain";

const BASE_SEPOLIA_CHAIN_ID = 84532;
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

  if (network.config.chainId !== BASE_SEPOLIA_CHAIN_ID) {
    console.log("Skipping tests because the network is not BaseSepolia");
    return;
  }
  let owner: Signer;
  let mockERC20: MockERC20;
  let mockVault: Mock4626;

  before(async () => {
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

});
