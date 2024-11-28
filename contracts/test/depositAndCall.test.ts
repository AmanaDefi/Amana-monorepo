import { ethers, upgrades, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { IGatewayZEVM, IERC20 } from "../typechain";
import { setTokenBalance } from "./utils";

import {
  ZC_TEST_ETH_BASESEPOLIA_ADDRESS,
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
} from "../../constants";

describe("GatewayZEVM depositAndCall Function", function () {
  let gatewayZEVM: IGatewayZEVM;
  let owner: Signer;
  let user1: Signer;
  let ethBaseSepolia: IERC20;

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7"; // Replace with your gateway address
  const VAULT_ASSET = ZC_TEST_ETH_BASESEPOLIA_ADDRESS;
  const TARGET_CONTRACT = "0x1234567890abcdef1234567890abcdef12345678"; // Replace with your target contract address
  const PROTOCOL_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdef"; // Replace with the protocol address

  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from

  before(async () => {
    // Use this function if you need global setup before tests
  });

  describe("depositAndCall Functionality", function () {
    async function setup() {
      [owner, user1] = await ethers.getSigners();

      // Deploy GatewayZEVM
      gatewayZEVM = await ethers.getContractAt("IGatewayZEVM", ZEVM_GATEWAY_ADDRESS);

      // Forked USDC contract and Aave Pool
      ethBaseSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_BASESEPOLIA_ADDRESS);

      // Set initial balances for testing
      const depositAmount = ethers.utils.parseUnits("0.01", 18);

      await setTokenBalance(ZC_TEST_ETH_BASESEPOLIA_ADDRESS, gatewayZEVM.address, depositAmount);

      return { owner, user1, depositAmount, ethBaseSepolia, gatewayZEVM };
    }

    it("should call depositAndCall correctly", async function () {
      const { user1, depositAmount, gatewayZEVM } = await loadFixture(setup);
      const userAddress = await user1.getAddress();
      const amount = ethers.utils.parseUnits("0.01", 18); // Amount to be deposited
      const originChainId = ORIGIN_CHAIN_ID; // Origin chain ID

      const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, 0, 0, 0, originChainId]
      );

      const context = {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
        sender: userAddress,
        chainID: ORIGIN_CHAIN_ID,
      };

      // Call depositAndCall
      const tx = await gatewayZEVM.depositAndCall(
        context,
        VAULT_ASSET,
        amount,
        TARGET_CONTRACT,
        message,
        {
          gasPrice: ethers.utils.parseUnits("150", "gwei"), // Set gas price
        }
      );

      const receipt = await tx.wait();
      console.log("Gas used for depositAndCall:", receipt.gasUsed.toString());

      // Assert that the depositAndCall was processed correctly
      await expect(tx)
        .to.emit(gatewayZEVM, "DepositAndCall")
        .withArgs(VAULT_ASSET, TARGET_CONTRACT, amount, message);
    });
  });
});
