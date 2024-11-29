import { ethers, network } from "hardhat";
import { expect } from "chai";
import { Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { IERC20 } from "../typechain";
import GatewayZEVMABI from "@zetachain/protocol-contracts/abi/GatewayZEVM.sol/GatewayZEVM.json";

// This test mocks a depositAndCall coming from Sepolia, into a strategy on BaseSepolia 

import {
  ZC_TEST_ETH_SEPOLIA_ADDRESS,
} from "../../constants";

describe("GatewayZEVM depositAndCall Function", function () {
  let owner: Signer;
  let user1: Signer;
  let ethSepolia: IERC20;

  const ZEVM_GATEWAY_ADDRESS = "0x6c533f7fe93fae114d0954697069df33c9b74fd7";
  const INCOMING_TOKEN = ZC_TEST_ETH_SEPOLIA_ADDRESS
  const VAULT_ADDRESS = "0x1Ba9b31648955c8D5653BC6AB340d5ECe5C0c11B"
  const PROTOCOL_ADDRESS = "0x735b14bb79463307aacbed86daf3322b1e6226ab";

  const ORIGIN_CHAIN_ID = 84532; // where the deposit/withdrawal originated from

  before(async () => {
    // Use this function if you need global setup before tests
  });

  describe("depositAndCall Functionality", function () {
    async function setup() {
      [owner, user1] = await ethers.getSigners();

      // Impersonate the protocol address
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [PROTOCOL_ADDRESS],
      });

      // Get a signer for the protocol address
      const protocolSigner = await ethers.getSigner(PROTOCOL_ADDRESS);

      const gatewayZEVM = new ethers.Contract(
        ZEVM_GATEWAY_ADDRESS,
        GatewayZEVMABI.abi,
        protocolSigner
      );

      ethSepolia = await ethers.getContractAt("IERC20", ZC_TEST_ETH_SEPOLIA_ADDRESS);

      return { owner, user1, ethSepolia, gatewayZEVM };
    }

    it("should call depositAndCall correctly", async function () {
      const { user1, gatewayZEVM } = await loadFixture(setup);
      const userAddress = await user1.getAddress();
      const amount = ethers.utils.parseUnits("0.01", 18); // Amount to be deposited
      const originChainId = ORIGIN_CHAIN_ID; // Origin chain ID

      const message = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "uint256", "uint256", "uint32"],
        [userAddress, 0, 0, 0, originChainId]
      );
      const amanaVault = await ethers.getContractAt("AmanaVault", VAULT_ADDRESS);

      // Call depositAndCall
      const tx = await gatewayZEVM["depositAndCall((bytes,address,uint256),address,uint256,address,bytes)"](
        {
          origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")),
          sender: userAddress,
          chainID: ORIGIN_CHAIN_ID,
        },
        INCOMING_TOKEN,
        amount,
        VAULT_ADDRESS,
        message,
        {
          gasPrice: ethers.utils.parseUnits("150", "gwei"),
          gasLimit: ethers.utils.parseUnits("500000", "wei"), // Set an arbitrary large gas limit
        }
      );
      const receipt = await tx.wait();
      console.log("Gas used for depositAndCall:", receipt.gasUsed.toString());

      // Assert that the depositAndCall was processed correctly
      await expect(tx)
        .to.emit(amanaVault, "Deposit");
    });
  });
});
