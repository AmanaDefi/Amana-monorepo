import { ethers, network } from "hardhat";
import { expect } from "chai";
import dotenv from "dotenv";
dotenv.config();

// Zetachain & Uniswap Constants
const FORK_BLOCK_NUMBER = 7180230;
const WZETA_TOKEN = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
const USDC_ETH_ADDRESS = "0x0cbe0dF132a6c6B4a2974Fa1b7Fb953CF0Cc798a";
const ETH_ETH_ADDRESS = "0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891";
const USDT_ETH_ADDRESS = "0x7c8dDa80bbBE1254a7aACf3219EBe1481c6E01d7";
const BNB_BSC_ADDRESS = "0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb";
const SOL_SOL_ADDRESS = "0x4bC32034caCcc9B7e02536945eDbC286bACbA073";
const INVALID_TOKEN = "0x0000000000000000000000000000000000000000";
const USDC_BASE_ADDRESS = "0x96152E6180E085FA57c7708e18AF8F05e37B479D";
const USDC_BSC_ADDRESS = "0x05BA149A7bd6dC1F937fA9046A9e05C05f3b18b0";
const DAI_ETH_ADDRESS = "0xcC683A782f4B30c138787CB5576a86AF66fdc31d";

let swapHelper: any;

describe("SwapHelperLibEddy - Public Function Tests", function () {
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

    // Deploy SwapHelperLibEddy as a standalone contract for testing
    const SwapHelperFactory = await ethers.getContractFactory("SwapHelperLibEddy");
    swapHelper = await SwapHelperFactory.deploy();
    await swapHelper.deployed();

    return { swapHelper };
  }

  it("should return a valid swap path", async function () {
    const { swapHelper } = await setup();

    const result = await swapHelper.getPath(ETH_ETH_ADDRESS, USDC_ETH_ADDRESS);
    const [path, feeTiers, encodedPath] = result;

    expect(path.length).to.be.greaterThanOrEqual(2, "Invalid swap path");
    expect(encodedPath.length).to.be.gt(0);
  });

  it("should use Curve for a swap when available", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    const amountOut = await swapHelper.getAmountOutCurveOrUniswap(
      USDT_ETH_ADDRESS, // Input token with a known Curve pool
      USDC_ETH_ADDRESS, // Output token
      amountIn
    );

    expect(amountOut).to.be.gt(0, "Curve swap failed");
  });

  it("should use Uniswap V2 for a swap if no Curve pool is found", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    const amountOut = await swapHelper.getAmountOutCurveOrUniswap(
      ETH_ETH_ADDRESS, // Input token likely to be in Uniswap V2
      USDC_ETH_ADDRESS, // Output token
      amountIn
    );

    expect(amountOut).to.be.gt(0, "Uniswap V2 swap failed");
  });

  it("should use Uniswap V3 for a direct swap 0..05% if available", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    const amountOut = await swapHelper.getAmountOutCurveOrUniswap(
      USDC_ETH_ADDRESS, // Input token likely to be in Uniswap V3
      DAI_ETH_ADDRESS, // Output token
      amountIn
    );

    expect(amountOut).to.be.gt(0, "Uniswap V3 swap failed");
  });

  it("should use Uniswap V3 for a direct swap 0.3% if available", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    const amountOut = await swapHelper.getAmountOutCurveOrUniswap(
      SOL_SOL_ADDRESS, // Input token likely to be in Uniswap V3
      USDC_ETH_ADDRESS, // Output token
      amountIn
    );

    expect(amountOut).to.be.gt(0, "Uniswap V3 swap failed");
  });

  it("should use Uniswap V3 for a multihop swap 0.05% if available", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    const amountOut = await swapHelper.getAmountOutCurveOrUniswap(
      DAI_ETH_ADDRESS, // Input token likely to be in Uniswap V3
      USDC_BSC_ADDRESS, // Output token
      amountIn
    );

    expect(amountOut).to.be.gt(0, "Uniswap V3 swap failed");
  });

  it("should use Uniswap V3 for a direct swap 0.3% if available", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    const amountOut = await swapHelper.getAmountOutCurveOrUniswap(
      SOL_SOL_ADDRESS, // Input token likely to be in Uniswap V3
      USDC_ETH_ADDRESS, // Output token
      amountIn
    );

    expect(amountOut).to.be.gt(0, "Uniswap V3 swap failed");
  });

  it("should revert if no liquidity is available", async function () {
    const { swapHelper } = await setup();
    const amountIn = ethers.utils.parseEther("1");

    await expect(
      swapHelper.getAmountOutCurveOrUniswap(INVALID_TOKEN, USDC_ETH_ADDRESS, amountIn)
    ).to.be.revertedWithCustomError(swapHelper, "InsufficientLiquidity");
  });
});
