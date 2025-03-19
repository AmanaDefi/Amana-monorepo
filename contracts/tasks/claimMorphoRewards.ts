import { task } from "hardhat/config";
import axios from "axios";
import { ethers } from "ethers";

const MORPHO_REWARDS_API = "https://rewards.morpho.org/v1/users";

// Define the Hardhat task
// Example usage: npx hardhat claimMorphoRewards --strategy 0xYourStrategyAddress --network base

task("claimMorphoRewards", "Fetches and claims Morpho rewards for a strategy")
  .addParam("strategy", "The address of the strategy contract")
  .setAction(async (args, hre) => {
    const { strategy } = args;
    const network = hre.network.name;
    const [signer] = await hre.ethers.getSigners();

    console.log(`🔑 Using account: ${signer.address}`);
    console.log(`🌍 Network: ${network}`);
    console.log(`📡 Fetching rewards data from Morpho for strategy: ${strategy}`);

    try {
      // Fetch reward data from Morpho API
      const response = await axios.get(`${MORPHO_REWARDS_API}/${strategy}/distributions`);
      const rewardsData = response.data.data;

      if (!rewardsData || rewardsData.length === 0) {
        console.log("❌ No rewards found for this strategy.");
        return;
      }

      for (const reward of rewardsData) {
        const distributor = reward.distributor.address;
        const txData = reward.tx_data;

        if (!txData) {
          console.log(`⚠️ No tx_data found for distributor: ${distributor}`);
          continue;
        }

        console.log(`📤 Sending claim transaction to distributor: ${distributor}`);

        const tx = await signer.sendTransaction({
          to: distributor,
          data: txData,
          gasLimit: 2000000, // Adjust gas limit if necessary
        });

        console.log(`📜 Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`✅ Transaction confirmed! Claimed rewards from distributor: ${distributor}`);
      }
    } catch (error) {
      console.error("❌ Failed to claim rewards:", error.response?.data || error.message);
    }
  });
