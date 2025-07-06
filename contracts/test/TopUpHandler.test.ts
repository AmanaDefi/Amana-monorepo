import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import dotenv from "dotenv";
dotenv.config();

const FORK_BLOCK_NUMBER = 7180230;
const SMART_ACCOUNT_ADDRESS = "0xf9B0404C82f148B17032511110474d59Ab612bFb"; // Replace with valid smart account address

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

    const threshold = ethers.utils.parseEther("0.1");
    const topUpAmount = ethers.utils.parseEther("1.0");

    const TopUpHandler = await ethers.getContractFactory("TopUpHandler");
    const topUpHandler = await upgrades.deployProxy(
      TopUpHandler,
      [threshold, topUpAmount],
      { initializer: "initialize", kind: "uups" }
    );

    return { topUpHandler, deployer, threshold, topUpAmount };
  }

  it("should top up smart account if balance is below threshold", async function () {
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

  it("should not top up if smart account balance >= threshold", async function () {
    const { topUpHandler, deployer, threshold, topUpAmount } = await setup();

    const smartAccount = SMART_ACCOUNT_ADDRESS;

    // Pre-fund the smart account to exceed threshold
    await deployer.sendTransaction({
      to: smartAccount,
      value: threshold.add(ethers.utils.parseEther("0.01")),
    });

    const initialBalance = await ethers.provider.getBalance(smartAccount);

    const tx = await topUpHandler
  .connect(deployer)
  .handleLocalTopUp(smartAccount, ethers.constants.AddressZero, topUpAmount, {
    value: topUpAmount,
  });
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(smartAccount);
    const received = finalBalance.sub(initialBalance);

    expect(received).to.equal(ethers.constants.Zero);
  });
});
