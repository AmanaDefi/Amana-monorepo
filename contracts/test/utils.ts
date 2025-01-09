import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";

export async function setTokenBalance(tokenAddress, account, amount) {

  const balanceAmount = ethers.BigNumber.from(amount);

  // Compute the storage slot for balances (slot 0 for most ERC20 tokens)
  const storageSlot = 3;

  // Normalize and log the account address
  const normalizedAccount = ethers.utils.getAddress(account);

  // Compute the storage key for the account's balance
  const key = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [normalizedAccount, storageSlot])
  );

  await network.provider.send("hardhat_setStorageAt", [
    tokenAddress,
    key,
    ethers.utils.hexZeroPad(balanceAmount.toHexString(), 32), // Ensure 32-byte padding
  ]);

  const token = await ethers.getContractAt("IERC20", tokenAddress);
  const newBalance = await token.balanceOf(account);
}

// Helper function to generate a unique transaction ID (bytes32)
export const generateTransactionId = (
  userAddress: string,
  chainId: number
): `0x${string}` => {
  const timestamp = Date.now().toString(); // Current timestamp in milliseconds
  const randomValue = Math.floor(Math.random() * 100000).toString(); // Random number
  const inputString = `${userAddress}-${chainId}-${timestamp}-${randomValue}`;
  return keccak256(toUtf8Bytes(inputString)) as `0x${string}`;
};