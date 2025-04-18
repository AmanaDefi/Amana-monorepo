import { task } from "hardhat/config";
import { Contract } from "ethers";

task("find-convex-pid", "Find Convex pool ID for a given Curve LP token")
  .addParam("lpToken", "The address of the Curve LP token")
  .setAction(async ({ lpToken }, hre) => {
    const { ethers } = hre;

    const BOOSTER_ADDRESS = "0xf403c135812408bfbe8713b5a23a04b3d48aae31"; // Convex Booster
    const booster: Contract = await ethers.getContractAt("IConvexBooster", BOOSTER_ADDRESS);

    const poolLength: number = await booster.poolLength();

    console.log(`🔍 Searching through ${poolLength} pools for LP token: ${lpToken}`);

    for (let i = 0; i < poolLength; i++) {
      const pool = await booster.poolInfo(i);
      if (pool.lptoken.toLowerCase() === lpToken.toLowerCase()) {
        console.log(`✅ Found LP token at pid: ${i}`);
        return;
      }
    }

    console.warn("❌ LP token not found in any Convex pool.");
  });
