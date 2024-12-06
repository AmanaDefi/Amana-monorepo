import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaVault, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";

import {
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
} from "../../constants";

describe("Vault and BaseSepAaveEthStrategy", function () {
  let amanaVault: AmanaVault;
  let owner: Signer;
  let user1: Signer;
  let ethBaseSepolia: IERC20;
  let ethSepolia: IERC20;
  let usdt: IERC20;
  let withdrawZRC20: string;

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
  const SYSTEM_CONTRACT_ADDRESS = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
  const VAULT_ASSET = ZC_TEST_ETH_SEPOLIA_ADDRESS;

  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from

  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
  const STRATEGY_CHAIN_ID = 11155111;

  before(async () => {
    // Use this function if you need global setup before tests
  });

  describe("AmanaVault with SwapHelper", function () {
    async function setup() {
      [owner, user1] = await ethers.getSigners();

      ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
      ethSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_SEPOLIA_ADDRESS);

      withdrawZRC20 = ZC_TEST_ETH_BASESEPOLIA_ADDRESS;

      const gatewayZEVM = await ethers.getContractAt(
        GatewayZEVMABI.abi,
        ZEVM_GATEWAY_ADDRESS
      );

      const GasTank = await ethers.getContractFactory("GasTank");
      const gasTank = await GasTank.deploy();
      await gasTank.deployed();

      // Deploy SwapHelper contract
      const SwapHelper = await ethers.getContractFactory("SwapHelper");
      const swapHelper = await SwapHelper.deploy();
      await swapHelper.deployed();

      console.log(`SwapHelper deployed at: ${swapHelper.address}`);

      const Vault = await ethers.getContractFactory("AmanaVault", owner);
      amanaVault = await upgrades.deployProxy(
        Vault,
        [
          "AaveV3EthVault",
          "AVU",
          VAULT_ASSET,
          await owner.getAddress(),
          1000, // FeeRate 10%
          ZEVM_GATEWAY_ADDRESS,
          SYSTEM_CONTRACT_ADDRESS,
          gasTank.address,
          swapHelper.address, // Specify the SwapHelper address
        ],
        { initializer: "initialize" }
      );

      await gasTank.authorizeVault(amanaVault.address);

      await amanaVault.setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID);

      const depositAmount1 = ethers.utils.parseUnits("0.01", 18);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20).div(1));
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20).div(1));

      return { owner, user1, depositAmount1, ethBaseSepolia, usdt, amanaVault, gatewayZEVM, withdrawZRC20 };
    }

    it("should process onCall correctly with deposit scenario, mocking BaseSepolia to Sepolia (cross-chain deposit)", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);
      const userAddress = await user1.getAddress();
      const withdrawAmount = ethers.BigNumber.from(0);
      const fee = 0;
      const shares = 0;
      const amount = ethers.utils.parseUnits("0.01", 18);
      const originChainId = ORIGIN_CHAIN_ID;
      const expected_shares = amount;


      const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, withdrawZRC20, withdrawAmount, fee, shares, originChainId]
      );

      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);

      const tx = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        amount,
        message,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      const receipt = await tx.wait();
      console.log("Gas used for deposit scenario:", receipt.gasUsed.toString());

      await expect(tx)
        .to.emit(amanaVault, "Deposit")
        .withArgs(ethers.constants.AddressZero, userAddress, amount, expected_shares);
    });

    it("should process onCall correctly with amount 0 - expect Gateway to emit Called (cross-chain withdraw)", async function () {
      const { user1, amanaVault, gatewayZEVM } = await loadFixture(setup);

      // Deposit first
      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.01", 18);
      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, withdrawZRC20, ethers.BigNumber.from(0), 0, 0, ORIGIN_CHAIN_ID]
      );

      // simulate deposit of amount into vault
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount);

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount,
        depositMessage
      );

      // Proceed to withdraw, stage 1
      const withdrawAmount = ethers.utils.parseUnits("0.001", 18);
      const fee = 0;
      const shares = 0;

      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, withdrawZRC20, withdrawAmount, fee, shares, ORIGIN_CHAIN_ID]
      );

      // Test onCall function with amount = 0
      const tx = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        0, // amount
        withdrawMessage
      );

      const receipt = await tx.wait();
      console.log("Gas used for withdrawal scenario:", receipt.gasUsed.toString());

      await expect(tx)
        .to.emit(gatewayZEVM, "Called")
    });

    it("should process onCall correctly with withdrawAmount = 1 (cross-chain withdraw part two)", async function () {
      const { user1, amanaVault, gatewayZEVM } = await loadFixture(setup);

      // Deposit first
      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.01", 18);
      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, withdrawZRC20, ethers.BigNumber.from(0), 0, 0, ORIGIN_CHAIN_ID]
      );

      // simulate deposit of amount into vault
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount);

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount,
        depositMessage
      );

      // Proceed to withdraw
      const withdrawAmount = ethers.utils.parseUnits("0.001", 18);
      const fee = 0;
      const shares = 0;

      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, withdrawZRC20, withdrawAmount, fee, shares, ORIGIN_CHAIN_ID]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        0, // amount
        withdrawMessage
      );


      // Proceed to second part of withdrawal
      const withdrawAmount2 = 1; // Indicates strategy is sending assets back
      const fee2 = ethers.utils.parseUnits("0", 18);
      const shares2 = ethers.utils.parseUnits("0.001", 18);
      const amount2 = ethers.utils.parseUnits("0.001", 18); // Amount sent back to vault

      const withdrawMessage2 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, withdrawZRC20, withdrawAmount2, fee2, shares2, ORIGIN_CHAIN_ID]
      );

      // simulate deposit of amount into vault
      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, amanaVault.address, withdrawAmount);

      // Test onCall function with withdrawAmount = 1
      const tx2 = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        amount2,
        withdrawMessage2
      );

      const receipt = await tx2.wait();
      console.log("Gas used for withdrawal part two scenario:", receipt.gasUsed.toString());

      await expect(tx2)
        .to.emit(amanaVault, "Withdraw")
        .to.emit(gatewayZEVM, "Withdrawn")
    });
  });
});
