import { ethers } from "hardhat";
import { expect } from "chai";
import { BaseSepAaveEthStrategy, IERC20 } from "../typechain";

const BASE_SEPOLIA_AAVE_ETH_POOL_ADDRESS = "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
const BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS = "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f";
const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";

describe("BaseSepAaveEthStrategy - Simplified Tests", function () {
  let strategy: BaseSepAaveEthStrategy;
  let owner: any;
  let receiptToken: IERC20;

  const amanaVaultAddress = "0xf3949C89b42Ba9d4aC8d3fD0e2d6efec3A63c17B";
  const strategyName = "BaseSepAaveEthStrategy";

  before(async function () {
    [owner] = await ethers.getSigners();

    // Connect to the receipt token contract
    receiptToken = await ethers.getContractAt(
      "IERC20",
      BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS
    );
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

  it("should allow any address to invest ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    // Call `invest` directly
    const tx = await strategy.invest(depositAmount, { value: depositAmount });

    const receipt = await tx.wait();
    console.log("Gas used for invest:", receipt.gasUsed.toString());

    // Validate that the receipt token balance has increased
    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy receipt token balance:", ethers.utils.formatEther(strategyBalance));
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow any address to withdraw ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    // Simulate investing ETH
    await strategy.invest(depositAmount, { value: depositAmount });

    // Validate that the receipt token balance has increased
    const strategyBalanceAfterInvest = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy receipt token balance after invest:", ethers.utils.formatEther(strategyBalanceAfterInvest));
    expect(strategyBalanceAfterInvest).to.be.gte(depositAmount);

    // Simulate a withdrawal
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const fee = ethers.utils.parseEther("0.01");
    const shares = ethers.utils.parseEther("0.5");
    const originChainId = 84532; // Example chain ID

    const ownerAddress = await owner.getAddress();
    const tx = await strategy.withdraw(ownerAddress, withdrawAmount, fee, shares, originChainId);

    const receipt = await tx.wait();
    console.log("Gas used for withdraw:", receipt.gasUsed.toString());

    // Validate the strategy's receipt token balance has decreased
    const strategyBalanceAfterWithdraw = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy receipt token balance after withdraw:", ethers.utils.formatEther(strategyBalanceAfterWithdraw));
    expect(strategyBalanceAfterWithdraw).to.be.lte(depositAmount.sub(withdrawAmount).sub(fee));
  });
});

