import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { BaseSepAaveEthStrategy, IERC20 } from "../typechain";

const BASE_SEPOLIA_AAVE_ETH_POOL_ADDRESS = "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
const BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS = "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f";
const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";

describe("BaseSepAaveEthStrategy", function () {
  let strategy: BaseSepAaveEthStrategy;
  let owner: Signer;
  let gatewaySigner: Signer; // Gateway impersonation
  let receiptToken: IERC20;

  const amanaVaultAddress = "0x1Ba9b31648955c8D5653BC6AB340d5ECe5C0c11B";
  const strategyName = "BaseSepAaveEthStrategy";

  before(async function () {
    [owner] = await ethers.getSigners();

    // Impersonate the gateway contract
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [GATEWAY_ADDRESS],
    });
    console.log("Impersonated gateway contract");
    gatewaySigner = await ethers.getSigner(GATEWAY_ADDRESS);

    // Send ETH to the gateway contract
    const ethToSend = ethers.utils.parseEther("10"); // 10 ETH
    console.log("Sending ETH to gateway contract...");
    await owner.sendTransaction({
      to: GATEWAY_ADDRESS,
      value: ethToSend,
    });
    console.log("Sent ETH to gateway contract");
    receiptToken = await ethers.getContractAt(
      "IERC20",
      BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS
    );
  });

  after(async function () {
    // Stop impersonating the gateway contract
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [GATEWAY_ADDRESS],
    });
  });

  async function deployStrategy() {
    const StrategyFactory = await ethers.getContractFactory("BaseSepAaveEthStrategy", owner);
    const deployedStrategy = await StrategyFactory.deploy(
      strategyName,
      amanaVaultAddress,
      ethers.constants.AddressZero, // inputToken is ETH (address(0))
      BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS,
      GATEWAY_ADDRESS
    );

    await deployedStrategy.deployed();
    return deployedStrategy as BaseSepAaveEthStrategy;
  }

  beforeEach(async () => {
    strategy = await deployStrategy();
  });

  it("should allow the gateway contract to invest ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    // Call `invest` as the gateway
    const tx = await strategy
      .connect(gatewaySigner)
      .invest(depositAmount, { value: depositAmount });

    const receipt = await tx.wait();
    console.log("Gas used for invest:", receipt.gasUsed.toString());

    // Validate that the receipt token balance has increased
    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy balance:", ethers.utils.formatEther(strategyBalance));
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow the gateway contract to withdraw ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    // Simulate investing ETH
    await strategy.connect(gatewaySigner).invest(depositAmount, {
      value: depositAmount,
    });
    // Validate that the receipt token balance has increased
    const strategyBalance2 = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy balance:", ethers.utils.formatEther(strategyBalance2));

    // Simulate a withdrawal
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const fee = ethers.utils.parseEther("0.01");
    const shares = ethers.utils.parseEther("0.5");
    const originChainId = 84532; // Example chain ID

    const ownerAddress = await owner.getAddress();
    const tx = await strategy
      .connect(gatewaySigner)
      .withdraw(ownerAddress, withdrawAmount, fee, shares, originChainId);

    const receipt = await tx.wait();
    console.log("Gas used for withdraw:", receipt.gasUsed.toString());

    // Validate the strategy's receipt token balance has decreased
    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.be.lte(depositAmount.sub(withdrawAmount).sub(fee));
  });
});
