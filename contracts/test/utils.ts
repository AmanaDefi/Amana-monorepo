import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";
import { Signer, BigNumber } from "ethers";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";
import { AmanaConnectedChainVault } from "../typechain";

const TxType = {
  Deposit: 0,
  Withdraw: 1,
  Switch: 2,
  Revert: 3
};

const WHALE_ADDRESSES: Record<string, string> = {
  // USDT Ethereum mainnet
  "0xdAC17F958D2ee523a2206206994597C13D831ec7":
    "0xF977814e90dA44bFA03b6295A0616a897441aceC",
  // USDC BNB
  "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d":
    "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3",
  // USDT BNB
  "0x55d398326f99059fF775485246999027B3197955":
    "0xfD5840Cd36d94D7229439859C0112a4185BC0255",
};

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
  balanceSlot: number,
  isNative: boolean = false
) {
  if (isNative) {
    await ethers.provider.send("hardhat_setBalance", [
      account,
      amount.toHexString()
    ]);
    return;
  }

  const normalizedAccount = ethers.utils.getAddress(account);
  const token = await ethers.getContractAt("IERC20", tokenAddress);

  // Format the amount as a 32-byte hex string
  const paddedValue = ethers.utils.hexZeroPad(amount.toHexString(), 32);

  // Compute the storage slot: keccak256(abi.encode(account, balanceSlot))
  const rawSlot = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [normalizedAccount, balanceSlot]
    )
  );

  const slot = BigNumber.from(rawSlot).toHexString();

  // Set the storage slot directly
  await network.provider.send("hardhat_setStorageAt", [
    tokenAddress,
    slot,
    paddedValue
  ]);

  // Check if the balance was successfully set
  const newBalance = await token.balanceOf(account);
  console.log(
    `[setTokenBalance] New balance for ${tokenAddress} at ${account}: ${newBalance.toString()}`
  );
  if (newBalance.isZero() && WHALE_ADDRESSES[tokenAddress]) {
    console.warn(`[setTokenBalance] Storage set failed. Falling back to whale transfer for ${tokenAddress}`);

    const whale = WHALE_ADDRESSES[tokenAddress];

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [whale]
    });

    await network.provider.send("hardhat_setBalance", [
      whale,
      ethers.utils.parseEther("10").toHexString()
    ]);

    const whaleSigner = await ethers.getSigner(whale);
    const tokenFromWhale = token.connect(whaleSigner);
    await tokenFromWhale.transfer(account, amount);

    const fallbackBalance = await token.balanceOf(account);
    if (fallbackBalance.isZero()) {
      throw new Error(`[setTokenBalance] Whale fallback also failed for token ${tokenAddress}`);
    }
  }
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
  gatewaySigner: Signer,
  strategy: any,
  depositAmount: BigNumber,
  minSharesOut: BigNumber,
  vaultNonce: number,
  isNative: boolean = false // Default to false, set to true if the strategy accepts native tokens
) {
  const depositMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint8", "uint256", "uint256", "address", "uint256"], // Match the new tuple structure
    [TxType.Deposit, depositAmount, minSharesOut, ethers.constants.AddressZero, BigNumber.from(vaultNonce)]
  );

  await network.provider.send("hardhat_setBalance", [
    await gatewaySigner.getAddress(),
    ethers.utils.parseEther("434").toHexString()
  ]);
  const tx = await
    strategy.connect(gatewaySigner).onCall(
      {
        sender: vaultAddress,
      },
      depositMessage,
      {
        // value: depositAmount, - this is only if we are testing a strategy that accepts native tokens
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
        ...(isNative && { value: depositAmount }),
      }
    );
  const receipt = await tx.wait();
  console.log("📥 Deposit gas used:", receipt.gasUsed.toString());
}

export async function simulateWithdrawCallFromVaultToStrategy(
  vaultAddress: string,
  gatewaySigner: Signer,
  strategy: any,
  assetAmount: BigNumber,
  minAmountOut: BigNumber,
  vaultNonce: number
) {
  const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint8", "uint256", "uint256", "address", "uint256"], // Matches Solidity onCall decode
    [TxType.Withdraw, assetAmount, minAmountOut, ethers.constants.AddressZero, BigNumber.from(vaultNonce)]
  );
  const tx = await
    strategy.connect(gatewaySigner).onCall(
      {
        sender: vaultAddress,
      },
      withdrawMessage,
      {
        gasPrice: ethers.utils.parseUnits("150", "gwei"),
      }
    )
  const receipt = await tx.wait();
  console.log("📥 Withdraw gas used:", receipt.gasUsed.toString());
}

export async function simulateSwitchCallFromVaultToStrategy(
  vaultAddress: string,
  gatewaySigner: Signer,
  strategy: any,
  newStrategyAddress: any,
  vaultNonce: number
) {

  const switchMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint8", "uint256", "uint256", "address", "uint256"],
    [TxType.Switch, 0, 0, newStrategyAddress, BigNumber.from(vaultNonce)]
  );
  return await strategy.connect(gatewaySigner).onCall(
    {
      sender: vaultAddress,
    },
    switchMessage,
    {
      gasPrice: ethers.utils.parseUnits("150", "gwei")
    }
  );
}

export async function simulateRevertCallToStrategy(
  vaultAddress: string,
  gatewaySigner: Signer,
  strategy: any,
  vaultNonce: number
) {
  const revertMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint8", "uint256", "uint256", "address", "uint256"], // Matches Solidity decode for Revert tx
    [TxType.Revert, 0, 0, ethers.constants.AddressZero, vaultNonce]
  );

  const tx = await strategy.connect(gatewaySigner).onCall(
    {
      sender: vaultAddress,
    },
    revertMessage,
    {
      gasPrice: ethers.utils.parseUnits("150", "gwei"),
    }
  );

  const receipt = await tx.wait();
  console.log("🔁 Revert tx gas used:", receipt.gasUsed.toString());

  return receipt.gasUsed;
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

export async function simulateDepositCallFromConnChain(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  depositAmount: BigNumber,
  pythContract: any,
  originChainZRC20Input: string,
  inputToken: string,
  originChainId: number,
  slippage: number,
  swapData: string = "0x" // Placeholder for swap data, if needed
): Promise<any> {
  // Update Pyth prices
  // await updatePythPrices(pythContract, user);

  // Set token balance for the vault
  await setTokenBalance(originChainZRC20Input, amanaVault.address, depositAmount, 3);

  const minSharesOut = 0 // depositAmount.mul(1000).div(1001);
  const nonEvmAddress = "0x"; // Placeholder for non-EVM address
  // Generate a transaction ID using your generateTransactionId function
  // const transactionId = generateTransactionId(await user.getAddress(), 8453);

  // Encode the deposit message
  const depositMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
    [ethers.constants.AddressZero, inputToken, 0, minSharesOut, slippage, nonEvmAddress, swapData, keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`]
  );
  // Execute the onCall function to simulate a deposit
  const tx = await amanaVault.connect(gatewaySigner).onCall(
    {
      origin: ethers.utils.hexlify(ethers.utils.toUtf8Bytes("test_origin")),
      sender: await user.getAddress(),
      chainID: originChainId,
    },
    originChainZRC20Input,
    depositAmount,
    depositMessage
  );
  const receipt = await tx.wait();
  console.log("📥 Deposit gas used:", receipt.gasUsed.toString());
  // Return the transaction ID
  return tx;
}


export async function simulateConfirmDeposit(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  depositAmount: any,
  totalAssetsBefore: any,
  executionNonce: any,
  strategyAddress: any,
  strategyChainId: any,
  strategyGasToken: any
): Promise<void> {
  const depositAmountBN = BigNumber.from(depositAmount);
  const totalAssetsBeforeBN = BigNumber.from(totalAssetsBefore);

  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "bytes32"],
    [depositAmountBN, totalAssetsBeforeBN.add(depositAmountBN), executionNonce, keccak256(toUtf8Bytes("DepositConfirmed")) as `0x${string}`
    ]
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

export async function simulateConfirmSwitch(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  transferredAmount: any,
  newStrategyAddress: any,
  executionNonce: any,
  strategyChainId: any,
  strategyGasToken: any
): Promise<any> {
  const transferredAmountBN = BigNumber.from(transferredAmount);

  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "bytes32"],
    [0, transferredAmountBN, executionNonce, keccak256(toUtf8Bytes("SwitchConfirmed")) as `0x${string}`
    ]
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

export async function simulateConfirmAssetUpdate(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  totalAssetsAmount: any,
  strategyAddress: any,
  strategyChainId: any,
  strategyGasToken: any,
  vaultNonce: any
): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "bytes32"],
    [0, totalAssetsAmount, vaultNonce, keccak256(toUtf8Bytes("TotalAssetsUpdate")) as `0x${string}`
    ]
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

export async function simulateWithdrawCallFromConnChain(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  user: Signer,
  assetsToWithdraw: BigNumber,
  pythContract: any,
  originChainZRC20Input: string,
  originChainId: number,
  originChainGasToken: string,
  nonEvmUserAddress: string,
  swapData: string = "0x", // Placeholder for swap data, if needed
  slippage: number // Default slippage of 0.1%
): Promise<void> {
  // await updatePythPrices(pythContract, user);
  const minAmountOut = assetsToWithdraw.mul(1000).div(1001);
  const withdrawMessage = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
    [originChainZRC20Input,
      ethers.constants.AddressZero,
      assetsToWithdraw,
      minAmountOut,
      slippage,
      nonEvmUserAddress,
      swapData,
      keccak256(toUtf8Bytes("WithdrawInitiated")) as `0x${string}`]
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

export async function simulateConfirmWithdrawToConnChain(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  withdrawnAmount: BigNumber,
  totalAssetsBefore: BigNumber,
  executionNonce: number,
  vaultAsset: string,
  strategyAddress: string,
  strategyChainId: number,
  strategyGasToken: string,
): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "bytes32"],
    [
      withdrawnAmount,
      totalAssetsBefore.sub(withdrawnAmount),
      executionNonce,
      keccak256(toUtf8Bytes("WithdrawConfirmed")) as `0x${string}`

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

export async function simulateConfirmDirectWithdraw(
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
  strategyChainId: number
): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "bytes32"],
    [
      withdrawnAmount,
      totalAssetsBefore.sub(withdrawnAmount),
      executionNonce,
      keccak256(toUtf8Bytes("WithdrawConfirmed")) as `0x${string}`

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
    vaultAsset,
    withdrawnAmount,
    confirmMessage
  );
}

export async function simulateConfirmRedeemToAnyToken(
  amanaVault: AmanaConnectedChainVault,
  gatewaySigner: Signer,
  withdrawnAmount: BigNumber,
  fractionOfTotalShares: BigNumber,
  totalAssetsBefore: BigNumber,
  executionNonce: number,
  vaultAsset: string,
  strategyAddress: string,
  strategyChainId: number,

): Promise<any> {
  const confirmMessage = ethers.utils.defaultAbiCoder.encode(
    ["uint256", "uint256", "uint256", "bytes32"],
    [
      withdrawnAmount,
      totalAssetsBefore.sub(withdrawnAmount),
      executionNonce,
      keccak256(toUtf8Bytes("WithdrawConfirmed")) as `0x${string}`

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
    vaultAsset,
    withdrawnAmount,
    confirmMessage
  );
}

export function isConvexStrategy(name: string): boolean {
  return [
    "ConvexEthStrategy",
    "ConvexERC20Strategy",
    "ConvexERC20StrategyArbitrum",
  ].includes(name);
}

export function isBalancerStrategy(name: string): boolean {
  return name.toLowerCase().includes("balancer");
}
