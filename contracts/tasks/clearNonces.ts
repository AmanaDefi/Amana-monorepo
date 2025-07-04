import { task } from "hardhat/config";
import { BigNumber } from "ethers";

task("clear-nonces", "Sends dummy txs to self with specified nonces to clear gaps")
  .addParam("nonces", "Comma-separated list of missing nonces to clear (e.g., 63,64,66)")
  .addOptionalParam("gasprice", "Gas price to use in gwei (default: 100)", "100")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const nonces: number[] = args.nonces.split(",").map((n: string) => parseInt(n.trim()));
    const gasPrice: BigNumber = hre.ethers.utils.parseUnits(args.gasprice, "gwei");

    console.log(`🧾 Address: ${signer.address}`);
    console.log(`📟 Current on-chain nonce: ${await hre.ethers.provider.getTransactionCount(signer.address)}`);
    console.log(`🔧 Using gas price: ${gasPrice.toString()} wei (${args.gasprice} gwei)`);
    console.log(`🧹 Sending txs for nonces: ${nonces.join(", ")}`);

    for (const nonce of nonces) {
      const tx = await signer.sendTransaction({
        to: signer.address,
        value: 0,
        nonce,
        gasPrice,
      });
      console.log(`📤 Sent dummy tx for nonce ${nonce}: ${tx.hash}`);
      await tx.wait(1);
    }

    console.log("✅ Done clearing specified nonces.");
  });
