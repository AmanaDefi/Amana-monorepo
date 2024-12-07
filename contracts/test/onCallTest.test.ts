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

  describe("AmanaVault with SwapHelperLib", function () {
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

      const Vault = await ethers.getContractFactory("AmanaVault", owner);
      const vaultDeployTransaction = await upgrades.deployProxy(
        Vault,
        [
          "AaveV3EthVault",
          "AVU",
          VAULT_ASSET,
          await owner.getAddress(),
          1000,
          SYSTEM_CONTRACT_ADDRESS,
          gasTank.address
        ],
        { initializer: "initialize" }
      );
      amanaVault = await vaultDeployTransaction.deployed();

      const deployReceipt = await vaultDeployTransaction.deployTransaction.wait();
      console.log(
        `Gas used for deploying AmanaVault: ${deployReceipt.gasUsed.toString()}`
      );
      await gasTank.authorizeVault(amanaVault.address);

      await amanaVault.setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID);

      const depositAmount1 = ethers.utils.parseUnits("0.01", 18);

      await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20).div(1));
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(200).div(1));

      return { owner, user1, depositAmount1, ethBaseSepolia, usdt, amanaVault, gatewayZEVM, withdrawZRC20 };
    }

    it("should process onCall correctly with deposit scenario, mocking BaseSepolia to Sepolia (cross-chain deposit)", async function () {
      const { user1, depositAmount1, amanaVault, gatewayZEVM } = await loadFixture(setup);
      const userAddress = await user1.getAddress();
      const amount = ethers.utils.parseUnits("0.01", 18);

      const message = "0x";

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
        .to.emit(gatewayZEVM, "WithdrawnAndCalled")
      // .withArgs(ethers.constants.AddressZero, userAddress, amount, expected_shares);
    });

    it("should process onCall correctly with deposit confirmation scenario, mocking BaseSepolia to Sepolia (cross-chain deposit)", async function () {
      const { user1, depositAmount1, amanaVault, gatewayZEVM } = await loadFixture(setup);
      const userAddress = await user1.getAddress();
      const amount = ethers.utils.parseUnits("0.01", 18);

      const message = "0x";

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

      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 1]
      );

      const tx2 = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      const receipt2 = await tx2.wait();
      console.log("Gas used for deposit scenario:", receipt2.gasUsed.toString());

      await expect(tx2)
        .to.emit(amanaVault, "Deposit")
      // .withArgs(ethers.constants.AddressZero, userAddress, amount, expected_shares);
    });

    it("should process onCall correctly with amount 0 - expect Gateway to emit Called (cross-chain withdraw)", async function () {
      const { user1, amanaVault, gatewayZEVM } = await loadFixture(setup);

      // Deposit first
      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.01", 18);
      const depositMessage = "0x";

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

      // Proceed to confirmation of deposit
      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, ethers.constants.AddressZero, depositAmount, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount, 1]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      // Proceed to withdraw, stage 1
      const withdrawAmount = ethers.utils.parseUnits("0.001", 18);

      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [withdrawZRC20, withdrawAmount]
      );

      // Test onCall function with amount = 0
      const tx3 = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        0, // amount
        withdrawMessage
      );

      const receipt3 = await tx3.wait();
      console.log("Gas used for withdrawal scenario:", receipt3.gasUsed.toString());

      await expect(tx3)
        .to.emit(gatewayZEVM, "Called")
    });

    it("should process onCall correctly for withdraw confirmation", async function () {
      const { user1, amanaVault, gatewayZEVM } = await loadFixture(setup);

      // Deposit first
      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.1", 18);
      const depositMessage = "0x";

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

      // Proceed to confirmation of deposit
      const confirmMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, ethers.constants.AddressZero, depositAmount, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount, 1]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      // Proceed to withdraw
      const withdrawAmount = ethers.utils.parseUnits("0.05", 18);

      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [withdrawZRC20, withdrawAmount]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        0,
        withdrawMessage,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );


      // Proceed to second part of withdrawal
      const fee2 = ethers.utils.parseUnits("0", 18);

      const withdrawMessage2 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, withdrawZRC20, withdrawAmount, fee2, ORIGIN_CHAIN_ID, false, depositAmount, withdrawAmount, 2]
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
        withdrawAmount,
        withdrawMessage2,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      const receipt = await tx2.wait();
      console.log("Gas used for withdrawal part two scenario:", receipt.gasUsed.toString());

      await expect(tx2)
        .to.emit(amanaVault, "Withdraw")
        .to.emit(gatewayZEVM, "Withdrawn")
    });

    it("should handle out-of-sequence confirmations for deposits correctly", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      const userAddress = await user1.getAddress();

      // Simulate the deposit
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount1,
        "0x"
      );

      // Send the higher nonce confirmation first (nonce 2)
      const confirmMessage2 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 2]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage2,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      // Now send the lower nonce confirmation (nonce 1)
      const confirmMessage1 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, ethers.constants.AddressZero, depositAmount1, 0, ORIGIN_CHAIN_ID, true, 0, depositAmount1, 1]
      );

      const tx = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        0,
        confirmMessage1,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      const receipt = await tx.wait();
      console.log("Gas used for out-of-sequence deposit confirmations:", receipt.gasUsed.toString());

      // Validate that all confirmations are processed in order
      await expect(tx)
        .to.emit(amanaVault, "Deposit")
        .withArgs(ethers.constants.AddressZero, userAddress, depositAmount1, ethers.utils.parseUnits("0.01", 18));
    });

    it("should handle out-of-sequence confirmations for withdrawals correctly", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.1", 18);

      // Simulate a deposit
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount);
      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount,
        "0x"
      );

      // Simulate withdrawal
      const withdrawAmount = ethers.utils.parseUnits("0.05", 18);
      const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [withdrawZRC20, withdrawAmount]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        0,
        withdrawMessage
      );

      // Send the higher nonce confirmation first (nonce 3)
      const confirmMessage3 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, withdrawZRC20, withdrawAmount, 0, ORIGIN_CHAIN_ID, false, depositAmount, withdrawAmount, 3]
      );

      await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        withdrawAmount,
        confirmMessage3,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      // Now send the lower nonce confirmation (nonce 2)
      const confirmMessage2 = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, withdrawZRC20, withdrawAmount, 0, ORIGIN_CHAIN_ID, false, depositAmount, withdrawAmount, 2]
      );

      const tx = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: STRATEGY_ADDRESS,
          chainID: STRATEGY_CHAIN_ID,
        },
        ZC_TEST_ETH_SEPOLIA_ADDRESS,
        withdrawAmount,
        confirmMessage2,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'),
        }
      );

      const receipt = await tx.wait();
      console.log("Gas used for out-of-sequence withdrawal confirmations:", receipt.gasUsed.toString());

      // Validate that all confirmations are processed in order
      await expect(tx)
        .to.emit(amanaVault, "Withdraw")
        .withArgs(userAddress, userAddress, userAddress, withdrawAmount, withdrawAmount);
    });

  });
});
