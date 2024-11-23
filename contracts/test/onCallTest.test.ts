import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { AmanaVault, IERC20 } from "../typechain";

import {
  ZC_TEST_ETH_BASESEPOLIA_HOLDER_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_HOLDER_ADDRESS,
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

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"; // Replace with your gateway address
  const SYSTEM_CONTRACT_ADDRESS = "0xEdf1c3275d13489aCdC6cD6eD246E72458B8795B";
  const VAULT_ASSET = ZC_TEST_ETH_SEPOLIA_ADDRESS;

  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from

  const STRATEGY_ADDRESS = "0xD8493CbAd089aDdFFB72a44850161f4DDD92f2CE"; // BaseSepAaveEthStrategy address
  const STRATEGY_CHAIN_ID = 11155111; // Replace with your chain ID for testnet or mainnet

  before(async () => {
    // Use this function if you need global setup before tests
  });

  describe("AmanaVault onCall Function", function () {
    async function setup() {
      [owner, user1] = await ethers.getSigners();
      // Forked USDC contract and Aave Pool
      ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);
      ethSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_SEPOLIA_ADDRESS);
      // Deploy the AmanaVault using OpenZeppelin's upgrade proxy pattern
      const Vault = await ethers.getContractFactory("AmanaVault", owner);
      amanaVault = await upgrades.deployProxy(
        Vault,
        ["AaveV3EthVault", "AVU", VAULT_ASSET, await owner.getAddress(), 1000, ZEVM_GATEWAY_ADDRESS, SYSTEM_CONTRACT_ADDRESS], // FeeRate 10%
        { initializer: "initialize" }
      );
      console.log("AmanaVault deployed to:", amanaVault.address);
      // Set the strategy in the AmanaVault contract
      await amanaVault.setStrategy(STRATEGY_ADDRESS, STRATEGY_CHAIN_ID);
      console.log("Strategy set to:", STRATEGY_ADDRESS);

      // Impersonate a holder
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ZC_TEST_ETH_BASESEPOLIA_HOLDER_ADDRESS],
      });
      const ethBaseSepHolder = await ethers.getSigner(ZC_TEST_ETH_BASESEPOLIA_HOLDER_ADDRESS);

      // Set initial balances
      const depositAmount = ethers.utils.parseUnits("0.01", 18);
      console.log("Amount of ETH to be deposited: ", depositAmount.toString());

      // We simulate the deposit part of the depositAndCall tx that would normally happen in a deposit scenario
      await ethBaseSepolia.connect(ethBaseSepHolder).transfer(amanaVault.address, depositAmount);
      console.log("Amount of ethBaseSepolia sent to vault: ", depositAmount.toString());

      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ZC_TEST_ETH_SEPOLIA_HOLDER_ADDRESS],
      });
      const ethSepHolder = await ethers.getSigner(ZC_TEST_ETH_SEPOLIA_HOLDER_ADDRESS);
      // We need to send a certain amount of the gasToken of the strategyChain to the vault to pay gas fees for cross chain calls to that chain
      await ethSepolia.connect(ethSepHolder).transfer(amanaVault.address, depositAmount.mul(2).div(1));
      console.log("Amount of ethSepolia sent to vault: ", depositAmount.mul(2).div(10).toString());

      return { owner, user1, depositAmount, ethBaseSepolia, ethSepHolder, usdt, amanaVault };
    }

    it("should process onCall correctly with deposit scenario (cross-chain deposit)", async function () {
      const { user1, amanaVault } = await loadFixture(setup);
      const userAddress = await user1.getAddress();
      const withdrawAmount = ethers.BigNumber.from(0);
      const fee = 0;
      const shares = 0;
      const amount = ethers.utils.parseUnits("0.01", 18); // Amount to be deposited
      const expected_shares = amount;

      const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "uint256"],
        [userAddress, withdrawAmount, fee, shares]
      );

      // Test onCall function with deposit scenario
      const tx = await amanaVault.onCall(
        {
          // MessageContext can be empty as it's not used
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
        amount,
        message,
        {
          gasPrice: ethers.utils.parseUnits('150', 'gwei'), // Set gas price
        }
      );

      const receipt = await tx.wait();
      console.log("Gas used for deposit scenario:", receipt.gasUsed.toString());

      await expect(tx)
        .to.emit(amanaVault, "Deposit")
        .withArgs(ethers.constants.AddressZero, userAddress, amount, expected_shares);
    });

    it("should process onCall correctly with amount 0 (cross-chain withdraw)", async function () {
      const { user1, amanaVault } = await loadFixture(setup);

      // Deposit first
      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.01", 18);
      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "uint256"],
        [userAddress, ethers.BigNumber.from(0), 0, 0]
      );
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
        ["address", "uint256", "uint256", "uint256"],
        [userAddress, withdrawAmount, fee, shares]
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
        .to.emit(amanaVault, "WithdrawFromStrategy")
      // .withArgs(userAddress, userAddress, userAddress, withdrawAmount, shares);
    });

    it("should process onCall correctly with withdrawAmount = 1 (cross-chain withdraw part two)", async function () {
      const { user1, amanaVault, ethSepHolder } = await loadFixture(setup);

      // Deposit first
      const userAddress = await user1.getAddress();
      const depositAmount = ethers.utils.parseUnits("0.01", 18);
      const depositMessage = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "uint256"],
        [userAddress, ethers.BigNumber.from(0), 0, 0]
      );
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
        ["address", "uint256", "uint256", "uint256"],
        [userAddress, withdrawAmount, fee, shares]
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
        ["address", "uint256", "uint256", "uint256"],
        [userAddress, withdrawAmount2, fee2, shares2]
      );

      await ethSepolia.connect(ethSepHolder).transfer(ZC_TEST_ETH_SEPOLIA_ADDRESS, depositAmount); // TODO: make this address dynamic?

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
        .withArgs(userAddress, userAddress, userAddress, amount2.sub(fee), shares);
    });
  });
});
