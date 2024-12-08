import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaConnectedChainVault, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";

import {
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
} from "../../constants";

describe("AmanaConnectedChainVault Full Coverage Tests", function () {
  let amanaVault: AmanaConnectedChainVault;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let ethBaseSepolia: IERC20;
  let ethSepolia: IERC20;
  let withdrawZRC20: string;

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
  const SYSTEM_CONTRACT_ADDRESS = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
  const VAULT_ASSET = ZC_TEST_ETH_SEPOLIA_ADDRESS;

  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from
  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE";
  const STRATEGY_CHAIN_ID = 11155111;

  async function setup() {
    [owner, user1, user2] = await ethers.getSigners();

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

    const Vault = await ethers.getContractFactory("AmanaConnectedChainVault", owner);
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
    await gasTank.authorizeVault(amanaVault.address);
    await amanaVault.setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID);

    const depositAmount1 = ethers.utils.parseUnits("0.01", 18);

    await setTokenBalance(ZC_TEST_ETH_SEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(20));
    await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gasTank.address, depositAmount1.mul(200));

    return { owner, user1, user2, depositAmount1, ethBaseSepolia, amanaVault, gatewayZEVM, withdrawZRC20 };
  }

  describe("Basic Operations", function () {
    it("should initialize the vault correctly", async function () {
      const { amanaVault } = await loadFixture(setup);
      const [strategy, strategyChainId] = await amanaVault.getStrategy();
      const treasury = await amanaVault.getTreasury();
      const perfFee = await amanaVault.getPerfFee();

      expect(strategy).to.equal(STRATEGY_ADDRESS);
      expect(strategyChainId).to.equal(STRATEGY_CHAIN_ID);
      expect(treasury).to.equal(await owner.getAddress());
      expect(perfFee).to.equal(1000);
    });

    it("should process deposits and mint shares correctly", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);

      const userAddress = await user1.getAddress();
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

      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.equal(depositAmount1);
    });

    it("should correctly apply performance fees on withdrawals", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);
      const userAddress = await user1.getAddress();

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

      const withdrawAmount = depositAmount1.div(2);

      const fee = await amanaVault.callStatic._applyFee(userAddress, withdrawAmount);

      expect(fee).to.be.gt(0);
    });
  });

  describe("Error Handling", function () {
    it("should revert on invalid strategy address", async function () {
      const { amanaVault } = await loadFixture(setup);
      await expect(amanaVault.setStrategy(ethers.constants.AddressZero, STRATEGY_CHAIN_ID)).to.be.revertedWith("InvalidStrategyAddress");
    });

    it("should revert on exceeding withdrawal limit", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);
      const userAddress = await user1.getAddress();

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

      await expect(amanaVault._withdraw(userAddress, userAddress, userAddress, depositAmount1.add(1), 1)).to.be.revertedWith("ERC4626ExceededMaxWithdraw");
    });
  });

  describe("Cross-Chain Handling", function () {
    it("should handle cross-chain investments and divestments correctly", async function () {
      const { user1, depositAmount1, amanaVault } = await loadFixture(setup);

      const userAddress = await user1.getAddress();
      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, amanaVault.address, depositAmount1);

      const tx = await amanaVault.onCall(
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        depositAmount1,
        "0x"
      );

      const receipt = await tx.wait();
      console.log("Gas used for cross-chain deposit:", receipt.gasUsed.toString());

      const totalAssets = await amanaVault.totalAssets();
      expect(totalAssets).to.equal(depositAmount1);
    });

    it("should revert on invalid nonce in confirmations", async function () {
      const { amanaVault, user1 } = await loadFixture(setup);
      const userAddress = await user1.getAddress();

      const invalidNonceMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256"],
        [userAddress, ethers.constants.AddressZero, 0, 0, ORIGIN_CHAIN_ID, true, 0, 0, 999]
      );

      await expect(
        amanaVault.onCall(
          {
            origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
            sender: STRATEGY_ADDRESS,
            chainID: STRATEGY_CHAIN_ID,
          },
          ZC_TEST_ETH_SEPOLIA_ADDRESS,
          0,
          invalidNonceMessage
        )
      ).to.be.revertedWith("ConfirmationAlreadyProcessed");
    });
  });
});
