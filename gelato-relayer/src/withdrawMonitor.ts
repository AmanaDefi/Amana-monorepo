import { Web3Function, Web3FunctionContext } from "@gelatonetwork/web3-functions-sdk";
import { ethers } from "ethers";

const WITHDRAW_EVENT_SIGNATURE = "Withdraw(address,address,uint256,uint256)";
const YIELDFI_ADDRESS = "0x03ACc35286bAAE6D73d99a9f14Ef13752208C8dC";
const USDC_ADDRESS = "0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48";
const STRATEGY_ADDRESS = "0xYourStrategyContractAddressHere"; // 🔁 update this

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const provider = context.multiChainProvider.default();

  const latestBlock = await provider.getBlockNumber();
  const logs = await provider.getLogs({
    fromBlock: latestBlock - 5, // 🔁 adjust as needed
    toBlock: latestBlock,
    address: USDC_ADDRESS,
    topics: [ethers.id(WITHDRAW_EVENT_SIGNATURE)],
  });

  for (const log of logs) {
    try {
      const iface = new ethers.Interface([
        `event ${WITHDRAW_EVENT_SIGNATURE}`
      ]);
      const parsed = iface.parseLog(log);
      if (!parsed) continue; // Skip if parsing fails or returns null

      const { from, to, amount, shares } = parsed.args;

      if (
        from.toLowerCase() === YIELDFI_ADDRESS.toLowerCase() &&
        to.toLowerCase() === STRATEGY_ADDRESS.toLowerCase()
      ) {
        console.log("✅ Matching Withdraw event found");

        const execInterface = new ethers.Interface([
          "function executeWithdrawal(uint256 shares, uint256 amount)"
        ]);
        const callData = execInterface.encodeFunctionData("executeWithdrawal", [shares, amount]);

        return {
          canExec: true,
          callData,
          target: STRATEGY_ADDRESS,
        };
      }
    } catch (err) {
      console.warn("❌ Failed to parse log:", err);
    }
  }

  return { canExec: false, message: "No matching Withdraw event in recent blocks" };
});
