import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import { Wallet, JsonRpcProvider } from "ethers";
import { ethers } from "ethers";

// Setup
const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider) as any;
const automate = new AutomateSDK(wallet.provider.network.chainId, wallet);

// Paste the CID returned by `upload` here
const CID = "QmXyz123YourCIDHash";

const { taskId, tx } = await automate.createBatchExecTask({
  name: "Withdraw Monitor",
  web3FunctionHash: CID,
  web3FunctionArgs: {}, // Optional
  trigger: {
    type: TriggerType.EVENT,
    filter: {
      address: "0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48", // USDC
      topics: [
        [
          // Withdraw event
          "0x" + Buffer.from(
            ethers.keccak256("Withdraw(address,address,uint256,uint256)").slice(2),
            "hex"
          ).toString("hex")
        ]
      ],
    },
    blockConfirmations: 0,
  },
});

await tx.wait();
console.log(`✅ Task created with ID: ${taskId}`);
