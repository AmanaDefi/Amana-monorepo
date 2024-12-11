import { ethers, network } from "hardhat";
import { expect } from "chai";
import { BaseSepAaveEthStrategy, IERC20 } from "../typechain";
import { Signer } from "ethers";

const BASE_SEPOLIA_AAVE_ETH_POOL_ADDRESS = "0x07eA79F68B2B3df564D0A34F8e19D9B1e339814b";
const BASE_SEPOLIA_AAVE_RECEIPT_TOKEN_ADDRESS = "0x96e32dE4B1d1617B8c2AE13a88B9cC287239b13f";
const GATEWAY_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";
const ORIGIN_CHAIN_ID = 11155111;
import {
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
} from "../../constants";

// NOTE - this test must be run on a forked version of the BaseSepolia network
// this require a change to the hardhat.config.ts file - see commented out forked network

describe("BaseSepAaveEthStrategy - Simplified Tests", function () {
  let strategy: BaseSepAaveEthStrategy;
  let owner: any;
  let receiptToken: IERC20;
  let vaultSigner: Signer; // Gateway impersonation

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
    console.log("Deployed strategy address:", deployedStrategy.address);

    await deployedStrategy.deployed();
    return deployedStrategy as BaseSepAaveEthStrategy;
  }

  beforeEach(async () => {
    strategy = await deployStrategy();
  });

  it("should allow any address to invest ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [owner.address, ethers.constants.AddressZero, 0, 0, ORIGIN_CHAIN_ID, true, 0]
    );

    // call onCall with a deposit message and value
    const tx = await strategy.onCall(
      {
        sender: amanaVaultAddress,
      },

      depositMessage,
      {
        value: depositAmount,
        gasPrice: ethers.utils.parseUnits('150', 'gwei'),
      });

    const receipt = await tx.wait();
    console.log("Gas used for invest:", receipt.gasUsed.toString());

    // Validate that the receipt token balance has increased
    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy receipt token balance:", ethers.utils.formatEther(strategyBalance));
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow any address to withdraw ETH", async function () {
    const depositAmount = ethers.utils.parseEther("1");

    const depositMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [owner.address, ethers.constants.AddressZero, 0, 0, ORIGIN_CHAIN_ID, true, 0]
    );

    // call onCall with a deposit message and value
    await strategy.onCall(
      {
        sender: amanaVaultAddress,
      },

      depositMessage,
      {
        value: depositAmount,
        gasPrice: ethers.utils.parseUnits('150', 'gwei'),
      });

    // Validate that the receipt token balance has increased
    const strategyBalanceAfterInvest = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy receipt token balance after invest:", ethers.utils.formatEther(strategyBalanceAfterInvest));
    expect(strategyBalanceAfterInvest).to.be.gte(depositAmount);

    // Simulate a withdrawal
    const withdrawAmount = ethers.utils.parseEther("0.5");
    const withdrawZRC20 = ZC_TEST_ETH_SEPOLIA_ADDRESS;
    const fee = ethers.utils.parseEther("0.01");

    const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256"],
      [owner.address, withdrawZRC20, withdrawAmount, fee, ORIGIN_CHAIN_ID, false, 1]
    );

    // call onCall with a deposit message and value
    const tx = await strategy.onCall(
      {
        sender: amanaVaultAddress,
      },

      withdrawMessage,
      {
        gasPrice: ethers.utils.parseUnits('150', 'gwei'),
      });

    const receipt = await tx.wait();
    console.log("Gas used for withdraw:", receipt.gasUsed.toString());

    // Validate the strategy's receipt token balance has decreased
    const strategyBalanceAfterWithdraw = await receiptToken.balanceOf(strategy.address);
    console.log("Strategy receipt token balance after withdraw:", ethers.utils.formatEther(strategyBalanceAfterWithdraw));
    const tolerance = ethers.utils.parseUnits("0.0001", 18); // Adjust the tolerance as needed
    expect(strategyBalanceAfterWithdraw).to.be.lte(depositAmount.sub(withdrawAmount).sub(fee).add(tolerance));
  });
});

