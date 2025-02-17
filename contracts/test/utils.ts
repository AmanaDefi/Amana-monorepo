import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { Signer, BigNumber } from "ethers";

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
    [owner, owner, ethers.constants.AddressZero, ethers.constants.AddressZero, depositAmount, minSharesOut, 0, ORIGIN_CHAIN_ID, true, 0, slippage]
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
  withdrawAmount: BigNumber,
  minAmountOut: BigNumber,
  fee: BigNumber,
  slippage: number,
  ORIGIN_CHAIN_ID: number
) {
  const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint256", "uint32", "bool", "uint256", "uint16"],
    [owner, owner, ethers.constants.AddressZero, ethers.constants.AddressZero, withdrawAmount, minAmountOut, fee, ORIGIN_CHAIN_ID, false, 1, slippage]
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
  newStrategy: any
) {
  const switchMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint256", "uint32", "bool", "bytes32", "uint16"],
    [
      ethers.constants.AddressZero, // userAddress set to zero to indicate a switch
      ethers.constants.AddressZero, // receiverAddress set to zero to indicate a switch
      newStrategy.address,
      ethers.constants.AddressZero,
      0, // amount
      0, // minAmountOut
      0, // fee
      0, // withdrawChainId
      false, // isDeposit
      ethers.utils.hexZeroPad(ethers.utils.hexlify(1), 32), // crossChainTxId
      0
    ]
  );

  await strategy.connect(gatewaySigner).onCall(
    {
      sender: vaultAddress,
    },
    switchMessage,
    {
      gasPrice: ethers.utils.parseUnits("150", "gwei"),
    }
  );
}





