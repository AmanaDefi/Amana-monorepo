import { ethers, network } from "hardhat";

export async function setTokenBalance(tokenAddress, account, amount) {
  console.log("=== Starting setTokenBalance ===");

  // Ensure amount is a BigNumber
  const balanceAmount = ethers.BigNumber.from(amount);

  // Compute the storage slot for balances (slot 0 for most ERC20 tokens)
  const storageSlot = 3;
  console.log("Using storage slot:", storageSlot);

  // Normalize and log the account address
  const normalizedAccount = ethers.utils.getAddress(account);
  console.log("Normalized account address:", normalizedAccount);

  // Compute the storage key for the account's balance
  const key = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [normalizedAccount, storageSlot])
  );
  console.log("Computed storage key for balance:", key);
  // Verify the storage slot directly
  const initialStorage = await network.provider.send("eth_getStorageAt", [tokenAddress, key, "latest"]);
  console.log("Storage at key before update:", initialStorage);

  // Log the intended balance
  console.log("Setting balance to:", balanceAmount.toString());

  // Set the balance in storage
  await network.provider.send("hardhat_setStorageAt", [
    tokenAddress,
    key,
    ethers.utils.hexZeroPad(balanceAmount.toHexString(), 32), // Ensure 32-byte padding
  ]);
  console.log("Updated storage at key:", key);

  // Verify the storage slot directly
  const updatedStorage = await network.provider.send("eth_getStorageAt", [tokenAddress, key, "latest"]);
  console.log("Storage at key after update:", updatedStorage);

  // Verify the new balance
  const token = await ethers.getContractAt("IERC20", tokenAddress);
  console.log("account:", account);
  const newBalance = await token.balanceOf(account);
  console.log("newBalance:", newBalance);
  console.log(`Balance after update for ${account}: ${ethers.utils.formatUnits(newBalance, 18)} tokens`);

  console.log("=== Completed setTokenBalance ===");
}