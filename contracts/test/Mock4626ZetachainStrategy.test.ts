import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Mock4626ZetachainStrategy, MockERC20, Mock4626 } from "../typechain";
import { Signer } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const AMANA_VAULT_ADDRESS = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";

describe("Mock4626ZetachainStrategy - Full Coverage", function () {
  let strategy: Mock4626ZetachainStrategy;
  let mockERC20: MockERC20;
  let mockVault: Mock4626;
  let amanaVaultSigner: Signer;
  let owner: Signer;

  beforeEach(async () => {
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
    [owner] = await ethers.getSigners();

    // Deploy MockERC20 token
    const ERC20Factory = await ethers.getContractFactory("MockERC20", owner);
    mockERC20 = await ERC20Factory.deploy("Mock Token", "MTKN", 18);
    await mockERC20.deployed();

    // Deploy Mock4626 vault
    const VaultFactory = await ethers.getContractFactory("Mock4626", owner);
    mockVault = await VaultFactory.deploy(mockERC20.address);
    await mockVault.deployed();

    // Deploy Mock4626ZetachainStrategy
    const StrategyFactory = await ethers.getContractFactory("Mock4626ZetachainStrategy", owner);
    strategy = await StrategyFactory.deploy(
      "Mock Strategy",
      AMANA_VAULT_ADDRESS,
      mockERC20.address,
      mockVault.address
    );
    await strategy.deployed();

    // Impersonate Amana Vault
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [AMANA_VAULT_ADDRESS],
    });

    amanaVaultSigner = await ethers.getSigner(AMANA_VAULT_ADDRESS);

    // Fund Amana Vault for gas and operations
    await network.provider.send("hardhat_setBalance", [
      AMANA_VAULT_ADDRESS,
      ethers.utils.parseEther("10").toHexString(),
    ]);

    // Mint tokens to Amana Vault for testing
    await mockERC20.mint(AMANA_VAULT_ADDRESS, ethers.utils.parseEther("1000"));
  });

  afterEach(async () => {
    // Stop impersonating Amana Vault after each test
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [AMANA_VAULT_ADDRESS],
    });
  });

  it("should allow Amana Vault to deposit tokens", async function () {
    const depositAmount = ethers.utils.parseEther("100");
    const minSharesOut = 0;
    // Approve tokens for strategy
    await mockERC20.connect(amanaVaultSigner).approve(strategy.address, depositAmount);

    // Deposit tokens into strategy
    const tx = await strategy.connect(amanaVaultSigner).invest(depositAmount, minSharesOut);
    const receipt = await tx.wait();

    // Verify emitted event
    await expect(tx).to.emit(strategy, "FundsDeposited").withArgs(AMANA_VAULT_ADDRESS, depositAmount);

    // Verify receipt token balance in strategy
    const strategyBalance = await mockVault.balanceOf(strategy.address);
    expect(strategyBalance).to.be.gt(0);

    // Verify tokens were deducted from Amana Vault
    const amanaVaultBalance = await mockERC20.balanceOf(AMANA_VAULT_ADDRESS);
    expect(amanaVaultBalance).to.be.lt(ethers.utils.parseEther("1000"));
  });

  it("should allow Amana Vault to withdraw tokens", async function () {
    const depositAmount = ethers.utils.parseEther("100");
    const minSharesOut = 0;
    // Approve and deposit tokens
    await mockERC20.connect(amanaVaultSigner).approve(strategy.address, depositAmount);
    await strategy.connect(amanaVaultSigner).invest(depositAmount, minSharesOut);

    // Withdraw tokens
    const tx = await strategy.connect(amanaVaultSigner).withdraw(depositAmount, 0, 0);

    // Verify emitted event
    await expect(tx).to.emit(strategy, "FundsWithdrawn").withArgs(AMANA_VAULT_ADDRESS, depositAmount);

    // Verify receipt token balance in strategy
    const strategyBalance = await mockVault.balanceOf(strategy.address);
    expect(strategyBalance).to.equal(0);

    // Verify tokens were returned to Amana Vault
    const amanaVaultBalance = await mockERC20.balanceOf(AMANA_VAULT_ADDRESS);
    expect(amanaVaultBalance).to.equal(ethers.utils.parseEther("1000"));
  });

  it("should revert if a non-vault address tries to call invest", async function () {
    const depositAmount = ethers.utils.parseEther("100");
    const minSharesOut = 0;
    const [nonVaultSigner] = await ethers.getSigners();

    await expect(strategy.connect(nonVaultSigner).invest(depositAmount, minSharesOut)).to.be.revertedWith(
      "Only Vault contract can call"
    );
  });

  it("should revert if a non-vault address tries to call withdraw", async function () {
    const withdrawAmount = ethers.utils.parseEther("50");
    const [nonVaultSigner] = await ethers.getSigners();

    await expect(strategy.connect(nonVaultSigner).withdraw(withdrawAmount, 0, 0)).to.be.revertedWith(
      "Only Vault contract can call"
    );
  });

  it("should allow the owner to perform emergencyWithdraw", async function () {
    const tokenAddress = mockERC20.address;

    // Transfer tokens to the strategy for testing
    await mockERC20.connect(amanaVaultSigner).transfer(strategy.address, ethers.utils.parseEther("100"));

    const initialBalance = await mockERC20.balanceOf(strategy.address);
    expect(initialBalance).to.be.gt(0);

    await strategy.emergencyWithdraw(tokenAddress);

    const finalBalance = await mockERC20.balanceOf(strategy.address);
    expect(finalBalance).to.equal(0);
  });

});
