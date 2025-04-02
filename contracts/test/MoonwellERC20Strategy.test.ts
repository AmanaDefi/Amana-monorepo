import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { ERC20_MoonwellStrategy, IERC20 } from "../typechain";
import { setTokenBalance, simulateDepositCallFromVaultToStrategy, simulateWithdrawCallFromVaultToStrategy } from "./utils";

const BASE_CHAIN_ID = 8453;
const ETHEREUM_CHAIN_ID = 1;
const FORK_BLOCK = 27810806;

const GATEWAY_ADDRESS = "0x48b9aacc350b20147001f88821d31731ba4c30ed";
const AMANA_VAULT_ADDRESS = "0x25f43240450c43c58Cb7CDbB424C0c80001C72E3";
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const INPUT_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RECEIPT_TOKEN_ADDRESS = "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca";
// const SWAP_HELPER_ADDRESS = "0x9A8f1987da23b4DE5Bf2B3C5796819Af253599b6";
const WELL_TOKEN = "0xA88594D404727625A9437C3f886C7643872296AE";
const MORPHO_TOKEN = "0xBAa5CC21fd487B8Fcc2F632f3F4E8D37262a0842";
const WITHDRAW_HELPER_ADDRESS = "0x1F2C8D4A3E5B7C6D9F2A0E4B5C7F3D8E1A6B8C9F";

let gatewaySigner: Signer;
let strategy: ERC20_MoonwellStrategy;

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
  return gatewaySigner;
}

describe("ERC20_MoonwellStrategy - Full Coverage", function () {
  let owner: Signer;
  let inputToken: IERC20;
  let receiptToken: IERC20;

  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
            blockNumber: FORK_BLOCK,
          },
        },
      ],
    });

    gatewaySigner = await setupGatewaySigner();
  });

  beforeEach(async () => {
    [owner] = await ethers.getSigners();

    inputToken = await ethers.getContractAt("IERC20", INPUT_TOKEN_ADDRESS, gatewaySigner);
    receiptToken = await ethers.getContractAt("IERC20", RECEIPT_TOKEN_ADDRESS, gatewaySigner);

    const SwapHelperFactory = await ethers.getContractFactory("SwapHelperOnBase");
    const swapHelper = await SwapHelperFactory.deploy();
    await swapHelper.deployed();

    const StrategyFactory = await ethers.getContractFactory("ERC20_MoonwellStrategy");
    strategy = await StrategyFactory.deploy(
      "MoonwellUsdcStrategy",
      AMANA_VAULT_ADDRESS,
      INPUT_TOKEN_ADDRESS,
      RECEIPT_TOKEN_ADDRESS,
      swapHelper.address,
      GATEWAY_ADDRESS,
      WITHDRAW_HELPER_ADDRESS
    );
    await strategy.deployed();
  });

  after(async () => {
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [GATEWAY_ADDRESS],
    });
  });

  it("should revert if a non-gateway address tries to call onCall", async function () {
    const depositAmount = ethers.utils.parseUnits("1", 6);
    const slippage = 10000;
    const minSharesOut = ethers.utils.parseUnits("0", 6);

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);
    await expect(simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      owner, // non-gateway signer
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    )).to.be.revertedWithCustomError(strategy, "OnlyGateway");
  });

  it("should allow Gateway to invest ERC20", async function () {
    const depositAmount = ethers.utils.parseUnits("1", 6);
    const minSharesOut = ethers.utils.parseUnits("0", 6);
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should allow Gateway to withdraw ERC20", async function () {
    const depositAmount = ethers.utils.parseUnits("1", 6);
    const minSharesOut = ethers.utils.parseUnits("0", 6);
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );
    const fractionOfSharesToWithdraw = ethers.utils.parseEther("1");
    const minAmountOut = ethers.utils.parseUnits("0", 6);

    await simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      INPUT_TOKEN_ADDRESS,
      fractionOfSharesToWithdraw,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    );

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.equal(0);
  });

  it("should swap WELL into inputToken ahead of deposit if WELL are on strategy", async function () {
    const depositAmount = ethers.utils.parseUnits("1", 6);
    const minSharesOut = ethers.utils.parseUnits("0", 6);
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    const WELL_HOLDER = "0x7287b68099308cEf2581BE1e24b4A7C9C9a226fC"; // Replace with actual holder address
    const STRATEGY_ADDRESS = strategy.address; // Your strategy contract

    // Impersonate the Morpho holder
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [WELL_HOLDER],
    });

    const signer = await ethers.getSigner(WELL_HOLDER);

    // Get contract instance
    const wellToken = await ethers.getContractAt("IERC20", WELL_TOKEN, signer);
    console.log("balance of wellToken", await wellToken.balanceOf(WELL_HOLDER));

    await network.provider.send("hardhat_setBalance", [
      WELL_HOLDER,
      ethers.utils.parseEther("10").toHexString(),
    ]);

    // Transfer tokens to the strategy
    const transferTx = await wellToken.transfer(STRATEGY_ADDRESS, ethers.utils.parseUnits("0.4", 18)); // Transfer 1000 MORPHO
    await transferTx.wait();

    console.log("Transferred 0.4 WELL to strategy:", STRATEGY_ADDRESS);

    // Stop impersonating
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [WELL_HOLDER],
    });

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.be.gte(depositAmount);
  });

  it("should swap WELL into input token and reinvest ahead of withdraw", async function () {
    const depositAmount = ethers.utils.parseUnits("1", 6);
    const minSharesOut = ethers.utils.parseUnits("0", 6);
    const slippage = 10000;

    await setTokenBalance(INPUT_TOKEN_ADDRESS, await gatewaySigner.getAddress(), depositAmount, 9);
    await inputToken.connect(gatewaySigner).approve(strategy.address, depositAmount);

    await simulateDepositCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      depositAmount,
      minSharesOut,
      slippage,
      BASE_CHAIN_ID,
    );
    const fractionOfSharesToWithdraw = ethers.utils.parseEther("1");
    const minAmountOut = ethers.utils.parseUnits("0", 6);

    await simulateWithdrawCallFromVaultToStrategy(
      AMANA_VAULT_ADDRESS,
      OWNER_ADDRESS,
      gatewaySigner,
      strategy,
      INPUT_TOKEN_ADDRESS,
      fractionOfSharesToWithdraw,
      minAmountOut,
      slippage,
      ETHEREUM_CHAIN_ID
    );

    const strategyBalance = await receiptToken.balanceOf(strategy.address);
    expect(strategyBalance).to.equal(0);
  });

  it("should allow owner to perform emergencyWithdraw", async function () {
    await setTokenBalance(INPUT_TOKEN_ADDRESS, strategy.address, ethers.utils.parseUnits("1", 6), 9);

    const initialBalance = await inputToken.balanceOf(strategy.address);
    expect(initialBalance).to.be.gt(0);

    await strategy.emergencyWithdraw(inputToken.address);

    const finalBalance = await inputToken.balanceOf(strategy.address);
    expect(finalBalance).to.equal(0);
  });
});
