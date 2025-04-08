import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { Signer, BigNumber } from "ethers";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import { AmanaConnectedChainVault, IERC20 } from "../typechain";

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

export async function updatePythPrices(pythContract: any, signer: Signer): Promise<void> {

  const connection = new PriceServiceConnection("https://hermes.pyth.network", {
    priceFeedRequestConfig: {
      // Provide this option to retrieve signed price updates for on-chain contracts.
      // Ignore this option for off-chain use.
      binary: true,
    },
  }); // See Hermes endpoints section below for other endpoints

  const priceIds = [
    "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", // ETH/USD price id
    "0xffd11c5a1cfd42f80afb2df4d9f264c15f956d68153335374ec10722edd70472", // POL/USD price id
    "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f", // BNB/USD price id
    "0xb70656181007f487e392bf0d92e55358e9f0da5da6531c7c4ce7828aa11277fe", // ZETA/USD price id
    "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", // SOL/USD price id
  ];

  // Fetch price updates
  const priceUpdateDataBase64 = await connection.getLatestVaas(priceIds);

  if (!priceUpdateDataBase64 || priceUpdateDataBase64.length === 0) {
    throw new Error("No price updates available from Hermes");
  }

  // Decode base64 data into binary (Buffer)
  const priceUpdateData: Uint8Array[] = priceUpdateDataBase64.map((data) =>
    Buffer.from(data, "base64")
  );

  const updateFee = await pythContract.getUpdateFee(priceUpdateData);
  const tx = await pythContract
    .connect(signer)
    .updatePriceFeeds(priceUpdateData, { value: updateFee });

  const receipt = await tx.wait();
}

async function simulateDepositCallFromEthereum(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  depositAmount: BigNumber,
  pythContract: any,
  originChainZRC20Input: string,
  inputToken: string,
  originChainId: number,
): Promise<`0x${string}`> {
  // Update Pyth prices
  // await updatePythPrices(pythContract, user);

  // Set token balance for the vault
  await setTokenBalance(originChainZRC20Input, amanaVault.address, depositAmount, 3);
  const minSharesOut = 0 // depositAmount.mul(1000).div(1001);
  const slippage = 10000;

  // Generate a transaction ID using your generateTransactionId function
  const transactionId = generateTransactionId(await user.getAddress(), 8453);

  // Encode the deposit message
  const depositMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "uint256", "uint16", "bytes32"],
    [inputToken, minSharesOut, slippage, transactionId]
  );
  // Execute the onCall function to simulate a deposit
  await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: await user.getAddress(),
      chainID: originChainId,
    },
    originChainZRC20Input,
    depositAmount,
    depositMessage
  );

  // Return the transaction ID
  return transactionId;
}


async function simulateConfirmDeposit(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  depositAmount: any,
  totalAssetsBefore: any,
  executionNonce: any,
  crossChainTxId: any,
  strategyAddress: any,
  strategyChainId: any,
  strategyGasToken: any
): Promise<void> {
  const depositAmountBN = BigNumber.from(depositAmount);
  const totalAssetsBeforeBN = BigNumber.from(totalAssetsBefore);

  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
    [ethers.constants.AddressZero, await user.getAddress(), ethers.constants.AddressZero, ethers.constants.AddressZero, depositAmount, 0, 0, true, totalAssetsBeforeBN.add(depositAmountBN), executionNonce, crossChainTxId, 0]
  );

  await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: strategyAddress,
      chainID: strategyChainId,
    },
    strategyGasToken,
    0,
    confirmMessage
  );
}

async function simulateConfirmSwitch(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  transferredAmount: any,
  newStrategyAddress: any,
  executionNonce: any,
  crossChainTxId: any,
  strategyChainId: any,
  strategyGasToken: any
): Promise<any> {
  const transferredAmountBN = BigNumber.from(transferredAmount);

  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
    [ethers.constants.AddressZero, ethers.constants.AddressZero, newStrategyAddress, ethers.constants.AddressZero, transferredAmount, 0, 0, true, transferredAmountBN, executionNonce, crossChainTxId, 0]
  );

  const tx = await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: newStrategyAddress,
      chainID: strategyChainId,
    },
    strategyGasToken,
    0,
    confirmMessage
  );
  return tx;
}

async function simulateConfirmAssetUpdate(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  totalAssetsAmount: any,
  strategyAddress: any,
  strategyChainId: any,
  strategyGasToken: any
): Promise<any> {

  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
    [ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0, 0, false, totalAssetsAmount, 0, 0, 0]
  );

  const tx = await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: strategyAddress,
      chainID: strategyChainId,
    },
    strategyGasToken,
    0,
    confirmMessage
  );
  return tx;
}

async function simulateWithdrawCallFromEthereum(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  sharesToWithdraw: BigNumber,
  pythContract: any,
  originChainZRC20Input: string,
  originChainId: number,
  originChainGasToken: string
): Promise<void> {
  // await updatePythPrices(pythContract, user);
  const minAmountOut = sharesToWithdraw.mul(1000).div(1001);
  const slippage = 10000;
  const transactionId = generateTransactionId(await user.getAddress(), 8453)

  const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes32"],
    [originChainZRC20Input, ethers.constants.AddressZero, sharesToWithdraw, minAmountOut, slippage, transactionId]
  );

  await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: await user.getAddress(),
      chainID: originChainId,
    },
    originChainGasToken,
    0,
    withdrawMessage
  )
}

async function simulateConfirmWithdrawToEthereum(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  withdrawnAmount: BigNumber,
  fractionOfTotalShares: BigNumber,
  totalAssetsBefore: BigNumber,
  executionNonce: number,
  crossChainTxId: number,
  originChainZRC20Input: string,
  originChainId: number,
  originChainERC20Input: string,
  vaultAsset: string,
  strategyAddress: string,
  strategyChainId: number,
  strategyGasToken: string
): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
    [
      await user.getAddress(),
      await user.getAddress(),
      originChainZRC20Input,
      originChainERC20Input,
      withdrawnAmount,
      fractionOfTotalShares,
      originChainId,
      false,
      totalAssetsBefore.sub(withdrawnAmount),
      executionNonce,
      crossChainTxId,
      10000
    ]
  );

  // Mock token balance setup for the test environment
  await setTokenBalance(vaultAsset, amanaVault.address, withdrawnAmount, 3);

  // Return the transaction object so it can be awaited or used in tests
  return await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: strategyAddress,
      chainID: strategyChainId,
    },
    strategyGasToken,
    withdrawnAmount,
    confirmMessage
  );
}

async function simulateConfirmDirectWithdraw(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  withdrawnAmount: BigNumber,
  vaultSharesBurnt: BigNumber,
  totalAssetsBefore: BigNumber,
  executionNonce: number,
  crossChainTxId: number,
  vaultAsset: string,
  strategyAddress: string,
  strategyChainId: number,
  strategyGasToken: string
): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
    [
      await user.getAddress(),
      await user.getAddress(),
      vaultAsset,
      vaultAsset,
      withdrawnAmount,
      vaultSharesBurnt,
      7000,
      false,
      totalAssetsBefore.sub(withdrawnAmount),
      executionNonce,
      crossChainTxId,
      500
    ]
  );

  // Mock token balance setup for the test environment
  await setTokenBalance(vaultAsset, amanaVault.address, withdrawnAmount, 3);

  // Return the transaction object so it can be awaited or used in tests
  return await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: strategyAddress,
      chainID: strategyChainId,
    },
    VAULT_ASSET,
    withdrawnAmount,
    confirmMessage
  );
}

async function simulateConfirmRedeemToAnyToken(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  withdrawZRC20: string,
  withdrawnAmount: BigNumber,
  fractionOfTotalShares: BigNumber,
  totalAssetsBefore: BigNumber,
  executionNonce: number,
  crossChainTxId: number
): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "address", "address", "uint256", "uint256", "uint32", "bool", "uint256", "uint256", "uint256", "uint16"],
    [
      await user.getAddress(),
      await user.getAddress(),
      withdrawZRC20,
      withdrawZRC20,
      withdrawnAmount,
      fractionOfTotalShares,
      ZC_CHAIN_ID,
      false,
      totalAssetsBefore.sub(withdrawnAmount),
      executionNonce,
      crossChainTxId,
      500
    ]
  );

  // Mock token balance setup for the test environment
  await setTokenBalance(VAULT_ASSET, amanaVault.address, withdrawnAmount, 3);

  // Return the transaction object so it can be awaited or used in tests
  return await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: STRATEGY_ADDRESS,
      chainID: STRATEGY_CHAIN_ID,
    },
    VAULT_ASSET,
    withdrawnAmount,
    confirmMessage
  );
}


