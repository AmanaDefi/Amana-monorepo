import { task } from "hardhat/config";
import { BigNumber, Contract } from "ethers";

task("deposit-multiple", "Deposit to vault for multiple users")
  .addParam("vault", "Vault contract address")
  .addParam("recipients", "Comma-separated list of recipient addresses")
  .addParam("amounts", "Comma-separated list of asset amounts to deposit")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const vaultAddress = args.vault;

    const recipientAddresses = args.recipients.split(",");
    const amounts = args.amounts.split(",").map((a: string) => hre.ethers.BigNumber.from(a));

    if (recipientAddresses.length !== amounts.length) {
      throw new Error("Recipients and amounts arrays must be the same length");
    }
    const vaultAbi = [
      "function deposit(uint256 assets, uint256 minimumOut, address receiver) public returns (uint256)"
    ];

    const vault = new hre.ethers.Contract(vaultAddress, vaultAbi, signer);

    // Get contract instances
    // const vault: Contract = await hre.ethers.getContractAt("AmanaConnectedChainVault", vaultAddress, signer);
    const tokenAddress = "0x91d4F0D54090Df2D81e834c3c8CE71C6c865e79F";
    const erc20: Contract = await hre.ethers.getContractAt("IERC20", tokenAddress, signer);

    // Calculate total amount for approval
    const totalAmount: BigNumber = amounts.reduce((acc, val) => acc.add(val), BigNumber.from(0));

    console.log(`🔐 Approving total of ${totalAmount.toString()} tokens to vault...`);
    const approveTx = await erc20.approve(vaultAddress, totalAmount);
    await approveTx.wait();
    console.log(`✅ Approved total amount. Tx: ${approveTx.hash}`);

    // Now deposit for each recipient
    for (let i = 0; i < recipientAddresses.length; i++) {
      const receiver = recipientAddresses[i];
      const amount = amounts[i];

      console.log(`📥 Depositing ${amount.toString()} to ${receiver}...`);
      const depositTx = await vault.deposit(amount, 0, receiver);
      await depositTx.wait();
      console.log(`✅ Deposit complete. Tx: ${depositTx.hash}`);
    }

    console.log("🚀 All deposits complete.");
  });
