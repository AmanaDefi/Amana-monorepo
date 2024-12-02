import { ethers, network } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import GatewayEVMABI from "@zetachain/protocol-contracts/abi/GatewayEVM.sol/GatewayEVM.json";

// Constants
const GATEWAY_EVM_ADDRESS = "0x0c487a766110c85d301d96e33579c5b317fa4995";
const TSS_ADDRESS = "0x8531a5aB847ff5B22D855633C25ED1DA3255247e";
const TSS_ROLE_HASH = "0x0da06bffcb63442de88b7f8385468eaf51e47079d4fa96875938e2c27c451deb";
const STRATEGY_ADDRESS = "0xBb14b40bf98b66232FeDb38ea12851Cc15E9474b";
const ORIGIN_CHAIN_ID = 84532; // Origin chain ID

describe("GatewayEVM execute Function", function () {
  let gatewayEVM: any;
  let strategy: any;
  let owner: any;

  before(async () => {
    // Global setup if necessary
  });

  describe("execute Functionality", function () {
    async function setup() {
      [owner] = await ethers.getSigners();

      // Impersonate the TSS contract
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [TSS_ADDRESS],
      });

      const tssSigner = await ethers.getSigner(TSS_ADDRESS);

      // Connect to the GatewayEVM contract
      gatewayEVM = new ethers.Contract(
        GATEWAY_EVM_ADDRESS,
        GatewayEVMABI.abi,
        tssSigner
      );

      // Connect to the strategy contract
      strategy = await ethers.getContractAt("BaseSepAaveEthStrategy", STRATEGY_ADDRESS);

      return { tssSigner, gatewayEVM, strategy };
    }

    it("should call execute correctly to trigger withdraw on strategy", async function () {
      const { tssSigner, gatewayEVM, strategy } = await loadFixture(setup);

      // Verify the TSS_ROLE
      // const hasRole = await gatewayEVM.hasRole(TSS_ROLE_HASH, TSS_ADDRESS);
      // console.log("TSS Address has TSS_ROLE:", hasRole);
      // expect(hasRole).to.be.true;

      // Parameters for the withdraw function
      const userAddress = await tssSigner.getAddress(); // Example user address
      const withdrawAmount = ethers.utils.parseUnits("0.005", 18); // Amount to withdraw
      const fee = ethers.utils.parseUnits("0.001", 18); // Fee
      const shares = ethers.utils.parseUnits("0.005", 18); // Shares

      // Encode calldata for the withdraw function
      const calldata = strategy.interface.encodeFunctionData("withdraw", [
        userAddress,
        withdrawAmount,
        fee,
        shares,
        ORIGIN_CHAIN_ID,
      ]);

      // MessageContext for the execute function
      const messageContext = {
        origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("")),
        sender: userAddress,
        chainID: ORIGIN_CHAIN_ID,
      };

      // Call execute on the GatewayEVM contract
      console.log("Calling execute on GatewayEVM contract...");
      const tx = await gatewayEVM.execute(messageContext, STRATEGY_ADDRESS, calldata, {
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
        gasLimit: ethers.BigNumber.from("500000"), // Adjust as necessary
      });

      const receipt = await tx.wait();
      console.log("Gas used for execute:", receipt.gasUsed.toString());

      // Assert that the withdraw was processed correctly
      await expect(tx)
        .to.emit(strategy, "Withdraw") // Replace with the correct event name if necessary
        .withArgs(userAddress, withdrawAmount, fee, shares, ORIGIN_CHAIN_ID);
    });
  });
});
