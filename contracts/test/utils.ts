import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { Signer, BigNumber } from "ethers";

/**
 * Sets the token balance of an account in a local Hardhat network.
 *
 * @param tokenAddress - Address of the token contract
 * @param account - Address of the user to modify the balance for
 * @param amount - The new balance (BigNumberish)
 * @param balanceSlot - The storage slot where balances are stored (usually 0 or 3)
 */
export async function setTokenBalance(
  tokenAddress: string,
  account: string,
  amount: BigNumber,
  balanceSlot: number
) {
  const normalizedAccount = ethers.utils.getAddress(account);

  // Format the amount as a 32-byte hex string
  const paddedValue = ethers.utils.hexZeroPad(
    ethers.BigNumber.from(amount).toHexString(),
    32
  );

  // Compute the storage slot: keccak256(abi.encode(account, balanceSlot))
  const rawSlot = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [normalizedAccount, balanceSlot]
    )
  );

  // Convert slot to a QUANTITY (unpadded hex string with 0x prefix)
  const slot = ethers.BigNumber.from(rawSlot).toHexString();
  // Set the storage slot directly
  await network.provider.send("hardhat_setStorageAt", [
    tokenAddress,
    slot,
    paddedValue,
  ]);

  // Verify it worked (optional)
  const token = await ethers.getContractAt("IERC20", tokenAddress);
  const newBalance = await token.balanceOf(normalizedAccount);
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

export async function simulateDepositCallFromVaultToStrategy(
  vaultAddress: string,
  owner: string,
  gatewaySigner: Signer,
  strategy: any,
  depositAmount: BigNumber,
  minSharesOut: BigNumber,
  slippage: number,
  ORIGIN_CHAIN_ID: number,
) {
  // Attempt deposit from a non-gateway address
  const depositMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint256", "uint32", "bool", "uint256", "uint16"],
    [owner, owner, ethers.constants.AddressZero, ethers.constants.AddressZero, depositAmount, 0, minSharesOut, ORIGIN_CHAIN_ID, true, 0, slippage]
  );
  await
    strategy.connect(gatewaySigner).onCall(
      {
        sender: vaultAddress,
      },
      depositMessage,
      {
        value: depositAmount,
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    );
}

export async function simulateWithdrawCallFromVaultToStrategy(
  vaultAddress: string,
  owner: string,
  gatewaySigner: Signer,
  strategy: any,
  withdrawZRC20: any,
  vaultSharesToBeBurnt: BigNumber,
  fractionOfTotalShares: BigNumber,
  minAmountOut: BigNumber,
  slippage: number,
  ORIGIN_CHAIN_ID: number
) {
  const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint256", "uint32", "bool", "uint256", "uint16"],
    [owner, owner, withdrawZRC20, ethers.constants.AddressZero, vaultSharesToBeBurnt, fractionOfTotalShares, minAmountOut, ORIGIN_CHAIN_ID, false, 1, slippage]
  );
  await
    strategy.connect(gatewaySigner).onCall(
      {
        sender: vaultAddress,
      },
      withdrawMessage,
      {
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    )
}

export async function simulateSwitchCallFromVaultToStrategy(
  vaultAddress: string,
  gatewaySigner: Signer,
  strategy: any,
  newStrategyAddress: any
) {
  const switchMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint256", "uint32", "bool", "uint256", "uint16"],
    [
      ethers.constants.AddressZero, // userAddress set to zero to indicate a switch
      ethers.constants.AddressZero, // receiverAddress set to zero to indicate a switch
      newStrategyAddress,
      ethers.constants.AddressZero,
      0, // minAmountOut (is usually just amount)
      0, // minSharesOut
      0, // not used
      0, // withdrawChainId
      false, // isDeposit
      0, //ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32), // crossChainTxId
      0
    ]
  );
  return await strategy.connect(gatewaySigner).onCall(
    {
      sender: vaultAddress,
    },
    switchMessage,
    {
      gasPrice: ethers.utils.parseUnits("150", "gwei"),
    }
  );
}





