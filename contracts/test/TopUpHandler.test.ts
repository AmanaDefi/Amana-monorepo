import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { setTokenBalance } from "./utils";
import { Signer } from "ethers";

import dotenv from "dotenv";
dotenv.config();

const FORK_BLOCK_NUMBER = 7180230;
const SMART_ACCOUNT_ADDRESS = "0xf9B0404C82f148B17032511110474d59Ab612bFb"; // Replace with valid smart account address
const ZRC20_TOKEN_ADDRESS = "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a"; // ZC_USDC_ETH_ADDRESS
const ZRC20_FAKE_SENDER = "0x000000000000000000000000000000000000dead";
const ZEVM_GATEWAY_ADDRESS = "0xfEDD7A6e3Ef1cC470fbfbF955a22D793dDC0F44E";

describe("TopUpHandler (UUPS)", function () {
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
      ],
    });

    const [deployer] = await ethers.getSigners();
    let gatewaySigner = await setupGatewaySigner();

    const threshold = ethers.utils.parseEther("0.1");
    const topUpAmount = ethers.utils.parseEther("1.0");

    const TopUpHandler = await ethers.getContractFactory("TopUpHandler");
    const topUpHandler = await upgrades.deployProxy(
      TopUpHandler,
      [threshold, topUpAmount],
      { initializer: "initialize", kind: "uups" }
    );

    return { topUpHandler, deployer, threshold, topUpAmount, gatewaySigner };
  }

  it("should not top up smart account on a local deposit if ZETA is deposited", async function () {
    const { topUpHandler, deployer, topUpAmount } = await setup();

    const smartAccount = SMART_ACCOUNT_ADDRESS;
    const initialBalance = await ethers.provider.getBalance(smartAccount);

    const tx = await topUpHandler
      .connect(deployer)
      .handleLocalTopUp(smartAccount, ethers.constants.AddressZero, topUpAmount, {
        value: topUpAmount,
      });
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(smartAccount);
    const received = finalBalance.sub(initialBalance);

    expect(received).to.equal(topUpAmount);
  });

  it("should top up smart account on a local deposit if balance is below threshold (ZRC20)", async function () {
    const { topUpHandler, deployer, topUpAmount } = await setup();

    const zrc20 = await ethers.getContractAt("IERC20", ZRC20_TOKEN_ADDRESS);
    await zrc20.connect(deployer).approve(topUpHandler.address, topUpAmount);

    const smartAccount = SMART_ACCOUNT_ADDRESS;
    const initialBalance = await zrc20.balanceOf(smartAccount);

    await setTokenBalance(zrc20.address, deployer.address, topUpAmount, 3);

    const tx = await topUpHandler
      .connect(deployer)
      .handleLocalTopUp(smartAccount, ZRC20_TOKEN_ADDRESS, topUpAmount);
    await tx.wait();

    const finalBalance = await zrc20.balanceOf(smartAccount);
    const received = finalBalance.sub(initialBalance);

    expect(received).to.equal(topUpAmount);
  });

  it("should not top up on a local deposit if balance >= threshold (ZRC20)", async function () {
    const { topUpHandler, deployer, threshold, topUpAmount } = await setup();

    await deployer.sendTransaction({
      to: SMART_ACCOUNT_ADDRESS,
      value: threshold.add(ethers.utils.parseEther("0.01")),
    });

    const zrc20 = await ethers.getContractAt("IERC20", ZRC20_TOKEN_ADDRESS);
    const initialBalance = await zrc20.balanceOf(SMART_ACCOUNT_ADDRESS);

    await zrc20.connect(deployer).approve(topUpHandler.address, topUpAmount);

    await setTokenBalance(zrc20.address, deployer.address, topUpAmount, 3);

    const tx = await topUpHandler
      .connect(deployer)
      .handleLocalTopUp(SMART_ACCOUNT_ADDRESS, ZRC20_TOKEN_ADDRESS, topUpAmount);
    await tx.wait();

    const finalBalance = await zrc20.balanceOf(SMART_ACCOUNT_ADDRESS);
    const received = finalBalance.sub(initialBalance);

    expect(received).to.equal(topUpAmount);
  });

  it("should handle onCall with ZETA and top up when balance < threshold", async function () {
    const { topUpHandler, threshold, topUpAmount, gatewaySigner } = await setup();

    const smartAccount = SMART_ACCOUNT_ADDRESS;
    const message = ethers.utils.defaultAbiCoder.encode(["address"], [smartAccount]);

    const initialBalance = await ethers.provider.getBalance(smartAccount);

    await gatewaySigner.sendTransaction({
      to: topUpHandler.address,
      value: topUpAmount,
    });

    await topUpHandler.connect(gatewaySigner).onCall(
      { origin: "0x", sender: ZRC20_FAKE_SENDER, senderEVM: ZRC20_FAKE_SENDER, chainID: 1 },
      ethers.constants.AddressZero,
      topUpAmount,
      message
    );

    const finalBalance = await ethers.provider.getBalance(smartAccount);
    const received = finalBalance.sub(initialBalance);

    expect(received).to.equal(topUpAmount);
  });

  it("should handle onCall with ZRC20 and top up when balance < threshold", async function () {
    const { topUpHandler, threshold, topUpAmount, gatewaySigner } = await setup();

    const smartAccount = SMART_ACCOUNT_ADDRESS;
    const zrc20 = await ethers.getContractAt("IERC20", ZRC20_TOKEN_ADDRESS);
    const message = ethers.utils.defaultAbiCoder.encode(["address"], [smartAccount]);

    const initialBalance = await zrc20.balanceOf(smartAccount);

    await setTokenBalance(zrc20.address, topUpHandler.address, topUpAmount, 3);

    await topUpHandler.connect(gatewaySigner).onCall(
      { origin: "0x", sender: ZRC20_FAKE_SENDER, senderEVM: ZRC20_FAKE_SENDER, chainID: 1 },
      ZRC20_TOKEN_ADDRESS,
      topUpAmount,
      message
    );

    const finalBalance = await zrc20.balanceOf(smartAccount);
    const received = finalBalance.sub(initialBalance);

    expect(received).to.equal(topUpAmount);
  });
});

async function setupGatewaySigner(): Promise<Signer> {
  try {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [ZEVM_GATEWAY_ADDRESS],
    });
    // fund the gateway signer with some ETH
    await network.provider.send("hardhat_setBalance", [
      ZEVM_GATEWAY_ADDRESS,
      ethers.utils.parseEther("10").toHexString(),
    ]);
    return ethers.getSigner(ZEVM_GATEWAY_ADDRESS);
  } catch (err) {
    throw new Error("Failed to impersonate gateway signer: " + err);
  }
}