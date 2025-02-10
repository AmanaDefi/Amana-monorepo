import { Address, getContract, prepareContractCall, sendAndConfirmTransaction, sendTransaction, readContract } from "thirdweb";
import { client } from "../utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { ethers, JsonRpcProvider } from "ethers";
import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import { Chain } from "thirdweb";
import { toUtf8Bytes, ZeroAddress, AbiCoder, hexlify } from "ethers";
import { keccak256 } from "thirdweb";
// import { fetchEthPrice } from "@/utils/utils";

import * as dotenv from "dotenv";
import { getCurrentSlippage } from "@/utils/utils";
import { VaultData } from "@/types/types";

dotenv.config();
const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE);

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
const EVMGatewayAddress = deployEnv === "testnet"
  ? process.env.NEXT_PUBLIC_EVM_GATEWAY_ADDRESS_TESTNET
  : process.env.NEXT_PUBLIC_EVM_GATEWAY_ADDRESS;
const abiCoder = new AbiCoder();

const isTestnet = process.env.NEXT_PUBLIC_DEPLOY_ENV === 'testnet';
const contractWithdrawalReceiverAddress = (isTestnet ? process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS_TESTNET : process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS) as `0x${string}`

if (!EVMGatewayAddress) {
  throw new Error(`EVM Gateway address is not defined for the ${deployEnv} environment.`);
}

export async function calculateEddyAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  const receiptTokenContract = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress,
  });
  const poolAddress = await readContract({
    contract: receiptTokenContract,
    method: "function minter() view returns (address)",
  });
  const eddyFinancePool = new ethers.Contract(poolAddress, fourPoolABI, provider);

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(await eddyFinancePool.get_virtual_price());

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await provider.getBlockNumber();
    const averageBlockTimeInSeconds = 5; // Adjust this based on the average block time for Eddy Finance
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await eddyFinancePool.get_virtual_price({ blockTag: pastBlockNumber })
    );

    // Calculate the rate of change in the virtual price over 7 days
    const rateOfChange = (currentPrice - pastPrice) * 10n ** 18n / pastPrice;
    const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

    // Calculate the annualized APY based on the 7-day change
    const depositAPY = Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;

    return depositAPY;
  } catch (error) {
    console.error("Error calculating APY for Eddy Finance:", error);
    return 0;
  }
}


export async function calculateAaveAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  const receiptTokenContract = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress,
  });
  const poolAddress = await readContract({
    contract: receiptTokenContract,
    method: "function POOL() view returns (address)",
  });
  const underlyingAssetAddress = await readContract({
    contract: receiptTokenContract,
    method: "function UNDERLYING_ASSET_ADDRESS() view returns (address)",
  });
  const aaveLendingPool = getContract({
    client,
    chain: strategyChain,
    address: poolAddress
  });

  const reserveData = await readContract({
    contract: aaveLendingPool,
    method: "function getReserveData(address) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128)",
    params: [underlyingAssetAddress as Address]
  });

  const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;

  // Get the liquidity rate (in Ray) and normalize it
  const liquidityRate = reserveData[2]; // Assuming this is the correct index for liquidity rate in reserveData
  const depositAPR = Number(liquidityRate) / 1e27;
  // Calculate APY using compounding
  const depositAPY = (Math.pow(1 + (depositAPR / SECONDS_IN_YEAR), SECONDS_IN_YEAR) - 1);

  return depositAPY;
}

export async function calculateAaveRewardsAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  // Fetch rewards data
  console.log("Fetching rewards data");
  // const receiptTokenContract = getContract({
  //   client,
  //   chain: strategyChain,
  //   address: receiptTokenAddress,
  // });
  // const incentivesControllerAddress = await readContract({
  //   contract: receiptTokenContract,
  //   method: "function getIncentivesController() view returns (address)",
  // });
  // const incentivesControllerContract = getContract({
  //   client,
  //   chain: strategyChain,
  //   address: incentivesControllerAddress,
  // });
  // const underlyingAssetAddress = await readContract({
  //   contract: receiptTokenContract,
  //   method: "function UNDERLYING_ASSET_ADDRESS() view returns (address)",
  // });
  // const rewardsRate = await readContract({
  //   contract: incentivesControllerContract,
  //   method: "function getRewardsRate(address) view returns (uint256)",
  //   params: [underlyingAssetAddress as Address],
  // });

  // const rewardsTokenAddress = await readContract({
  //   contract: incentivesControllerContract,
  //   method: "function getRewardsToken() view returns (address)",
  // });

  // const rewardsTokenPrice = await fetchEthPrice();
  const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;
  // const annualRewardsValue = Number(rewardsRate) * 10 * SECONDS_IN_YEAR;
  // const poolAddress = await readContract({
  //   contract: receiptTokenContract,
  //   method: "function POOL() view returns (address)",
  // });
  // const aaveLendingPool = getContract({
  //   client,
  //   chain: strategyChain,
  //   address: poolAddress
  // });
  // const totalLiquidity = await readContract({
  //   contract: aaveLendingPool,
  //   method: "function getTotalLiquidity() view returns (uint256)",
  //   params: [underlyingAssetAddress as Address],
  // });

  // const rewardsAPY = annualRewardsValue / Number(totalLiquidity);
  const rewardsAPY = 5
  return rewardsAPY;
}

export async function calculateMoonwellAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  const moonwellVault = new ethers.Contract(receiptTokenAddress, moonwellVaultABI, provider);

  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await provider.getBlockNumber();
  const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
  const pastBlockNumber = BigInt(currentBlockNumber - blocksIn7Days);
  const currentPrice = ethers.toBigInt(await moonwellVault.convertToAssets(BigInt(1e18)));
  const pastPrice = ethers.toBigInt(await moonwellVault.convertToAssets(BigInt(1e18), { blockTag: pastBlockNumber }));
  const rateOfChange = (currentPrice - pastPrice) * 10n ** 18n / pastPrice;
  const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);
  return Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;
}

export async function calculateCompoundAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  const compoundVault = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress
  });

  const secondsInAYear = 365 * 24 * 60 * 60;
  const currentUtilization = await readContract({
    contract: compoundVault,
    method: "function getUtilization() view returns (uint256)"
  });
  const currentSupplyRate = await readContract({
    contract: compoundVault,
    method: "function getSupplyRate(uint256) view returns (uint256)",
    params: [currentUtilization]
  });

  const currentSupplyRateScaled = Number(currentSupplyRate) / Number(1e18);

  const currentAPY = Math.pow(1 + currentSupplyRateScaled, secondsInAYear) - 1;
  return currentAPY;
}

export async function calculateVenusAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  console.log("Calculating Venus APY in actions.ts");
  const vToken = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress
  });
  const blocksPerYear = 10512000;
  const supplyRatePerBlock = await readContract({
    contract: vToken,
    method: "function supplyRatePerBlock() view returns (uint256)"
  });
  const ratePerBlock = Number(supplyRatePerBlock) / 1e18;
  const currentAPY = (1 + ratePerBlock) ** blocksPerYear - 1;
  return Number(currentAPY);
}

export const executeDeposit = async (vaultId: Address, inputToken: Address, activeAccount: Account, activeChain: Chain, transactionAmount: bigint, setcrossChainTxId: Function) => {
  if (activeChain.id === 7000 || activeChain.id === 7001) { // if active chain is Zetachain (main or testnet)
    return executeDirectDeposit(vaultId, activeAccount, activeChain, transactionAmount);
  } else {
    return executeCrossChainDeposit(vaultId, inputToken, activeAccount, activeChain, transactionAmount, setcrossChainTxId);
  }
};

export const Approvedeposit = async (vaultId: Address, inputToken: Address, activeAccount: Account, activeChain: Chain, transactionAmount: bigint) => {
  console.log("Executing DepositApprove");

  try {
    let contract = getContract({
      client,
      chain: activeChain,
      address: inputToken
    });
    let spender;
    if (activeChain.id === 7000 || activeChain.id === 7001) {
      spender = vaultId
    } else {
      spender = EVMGatewayAddress
    }
    const approveTx = prepareContractCall({
      contract,
      method: "function approve(address to, uint256 value)",
      params: [spender, transactionAmount]
    });
    await sendAndConfirmTransaction({
      account: activeAccount,
      transaction: approveTx
    });
    console.log("Approval confirmed");
    return true;
  } catch (error: any) {
    return false;
  }
};

const executeDirectDeposit = async (vaultId: Address, activeAccount: Account, activeChain: Chain, transactionAmount: bigint) => {
  console.log("Executing Deposit");
  let contract = getContract({
    client,
    chain: activeChain,
    address: vaultId
  });
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function deposit(uint256 assets,  address receiver)",
    params: [transactionAmount, activeAccount?.address],
  });
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: supplyTx
  });
  return receipt;
};

// Helper function to generate a unique transaction ID (bytes32)
const generateTransactionId = (
  activeAccount: Account,
  activeChain: Chain
): `0x${string}` => {
  const timestamp = Date.now().toString(); // Current timestamp in milliseconds
  const randomValue = Math.floor(Math.random() * 100000).toString(); // Random number
  const inputString = `${activeAccount.address}-${activeChain.id}-${timestamp}-${randomValue}`;
  return keccak256(toUtf8Bytes(inputString)) as `0x${string}`;
};

const executeCrossChainDeposit = async (
  vaultId: Address,
  inputToken: Address,
  activeAccount: Account,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Deposit");
  // Generate a unique transaction ID
  const transactionId = generateTransactionId(activeAccount, activeChain);
  console.log("Generated Transaction ID (bytes32):", transactionId);

  // Determine if the inputToken is a native asset (ETH, BNB, MATIC, etc.)
  const isNativeToken = inputToken === ZeroAddress;

  let contract, approveTx, payload, revertOptions;
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);
  // Prepare payload (calldata to pass to the receiver)
  payload = abiCoder.encode(
    ["address", "uint16", "bytes32"],
    [inputToken, slippageValue, transactionId]
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(["string", "bytes32", "address"], ["_crossChainDepositFailed", transactionId, activeAccount.address]);

  // Prepare revertOptions
  revertOptions = [
    contractWithdrawalReceiverAddress, // revertAddress
    true, // callOnRevert
    activeAccount.address, // abortAddress
    revertMessage as `0x${string}`, // revertMessage
    BigInt(1000000), // onRevertGasLimit
  ] as const;

  // const txOptions = {
  //   gasLimit: 1000000, // Example value, update as needed
  //   gasPrice: 100000, // TODO - this will have to change, depending on the chain?
  // };

  // Case 1: Native token (ETH, BNB, etc.)
  if (isNativeToken) {
    console.log("Native token deposit detected");

    contract = getContract({
      client,
      chain: activeChain,
      address: EVMGatewayAddress,
    });

    const depositTx = prepareContractCall({
      contract,
      method:
        "function depositAndCall(address receiver, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
      params: [vaultId, payload, revertOptions],
      value: transactionAmount,
    });

    const receipt = await sendAndConfirmTransaction({
      account: activeAccount,
      transaction: depositTx,
      // ...txOptions,
    });


    console.log("Deposit executed");
    setcrossChainTxId(transactionId)
    return receipt;

  } else {
    // Case 2: ERC20 token
    console.log("ERC20 token deposit detected");

    // Step 1: Approve the tokens for the EVM Gateway contract
    // contract = getContract({
    //   client,
    //   chain: activeChain,
    //   address: inputToken,
    // });
    // console.log("contract", contract);

    // approveTx = prepareContractCall({
    //   contract,
    //   method: "function approve(address to, uint256 value)",
    //   params: [EVMGatewayAddress, transactionAmount],
    // });
    // console.log("approveTx", approveTx);

    // await sendAndConfirmTransaction({
    //   account: activeAccount,
    //   transaction: approveTx,
    // });

    // console.log("Approval confirmed");

    // Step 2: Deposit ERC20 tokens through the Gateway contract
    contract = getContract({
      client,
      chain: activeChain,
      address: EVMGatewayAddress,
    });
    const depositTx = prepareContractCall({
      contract,
      method:
        "function depositAndCall(address receiver, uint256 amount, address asset, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
      params: [
        vaultId,
        transactionAmount,
        inputToken,
        payload,
        revertOptions,
      ],
    });

    try {
      const receipt = await sendAndConfirmTransaction({
        account: activeAccount,
        transaction: depositTx,
        // ...txOptions,
      });

      console.log("Deposit executed");
      setcrossChainTxId(transactionId)
      return receipt;

    } catch (error) {
      console.error("Transaction failed:", error);
      throw error; // Rethrow the error to allow upstream handling if needed
    }
  }
};

export const executeWithdrawal = async (vaultId: Address, activeAccount: Account, activeChain: Chain, withdrawAmount: bigint, withdrawERC20: Address, withdrawZRC20: Address, setcrossChainTxId: Function) => {
  if (activeChain.id === 7000 || activeChain.id === 7001) { // if active chain is Zetachain (main or testnet)
    return executeDirectWithdrawal(vaultId, activeAccount, activeChain, withdrawAmount);
  } else {
    return executeCrossChainWithdrawal(vaultId, activeAccount, activeChain, withdrawAmount, withdrawERC20, withdrawZRC20, setcrossChainTxId);
  }
};

const executeDirectWithdrawal = async (vaultId: Address, activeAccount: Account, activeChain: Chain, withdrawAmount: bigint) => { //vaultId: string
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultId
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function redeem(uint256 shares, address receiver, address owner)",
    params: [withdrawAmount, activeAccount?.address, activeAccount?.address],
  });
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: withdrawTx
  });
  return receipt;
};

const executeCrossChainWithdrawal = async (
  vaultId: Address,
  activeAccount: Account,
  activeChain: Chain,
  withdrawAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Address,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Withdrawal");

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(activeAccount, activeChain);
  console.log("Generated Transaction ID (bytes32):", transactionId);
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);
  // Prepare payload (calldata to pass to the receiver)
  const payload = abiCoder.encode(
    ["address", "address", "uint256", "uint16", "bytes32"],
    [withdrawZRC20, withdrawERC20, withdrawAmount, slippageValue, transactionId]
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(["string", "bytes32", "address"], ["_crossChainWithdrawFailed", transactionId, activeAccount.address]);

  const revertOptions = [
    contractWithdrawalReceiverAddress, // revertAddress
    true, // callOnRevert
    activeAccount.address, // abortAddress
    revertMessage as `0x${string}`, // revertMessage
    BigInt(1000000), // onRevertGasLimit
  ] as const;

  // const txOptions = {
  //   gasLimit: BigInt(1000000), // Example value, update as needed
  //   gasPrice: BigInt(100000), // This will have to change depending on the chain
  // };

  // Get the Gateway contract to initiate the withdrawal
  const contract = getContract({
    client,
    chain: activeChain,
    address: EVMGatewayAddress,
  });

  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function call(address receiver, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
    params: [vaultId, payload, revertOptions],
  });

  try {
    const receipt = await sendAndConfirmTransaction({
      account: activeAccount,
      transaction: withdrawTx,
      // ...txOptions,
    });

    console.log("Withdrawal executed successfully");
    setcrossChainTxId(transactionId);
    return receipt;

  } catch (error) {
    console.error("Transaction failed:", error);
    throw error; // Rethrow the error for upstream handling
  }
};

export const fetchUserVaultBalance = async (userAddress: Address, vaultAddress: Address) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // This will always be Zetachain, as it's a balance on the vault
    address: vaultAddress
  });
  const { value: shares, decimals } = await getBalance({
    contract,
    address: userAddress
  });
  const balance = await readContract({
    contract,
    method: "function convertToAssets(uint256) view returns (uint256)",
    params: [shares]
  });
  console.log("BALANCE HERE", balance)
  const formattedBalance = Number(balance) / 10 ** decimals;
  return formattedBalance.toString();
}

export const fetchUserVaultMaxRedeem = async (decimals: number, userAddress: Address, vaultAddress: Address) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // This will always be Zetachain, as it's a balance on the vault
    address: vaultAddress
  });
  const maxRedeem = await readContract({
    contract,
    method: "function maxRedeem(address) view returns (uint256)",
    params: [userAddress]
  });
  const formattedMaxRedeem = Number(maxRedeem) / 10 ** decimals;
  return formattedMaxRedeem.toString();
}

export const fetchTotalAssets = async (vaultAddress: Address) => {

  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // This will always be Zetachain, as it's a balance on the vault
    address: vaultAddress
  });
  const balance = await readContract({
    contract,
    method: "function totalAssets() view returns (uint256)"
  });
  const decimals = await readContract({
    contract,
    method: "function decimals() view returns (uint8)"
  });
  const formattedBalance = Number(balance) / 10 ** decimals;
  return formattedBalance.toString();
}

export const getAmountOutFromSwap = async (amount: bigint, inputTokenAddress: Address, outputTokenAddress: Address, vaultData: VaultData) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vaultData.id as Address
  });
  console.log("contract on shares read", contract, {
    amount, inputTokenAddress, outputTokenAddress
  })
  try {
    return await readContract({
      contract,
      method: "function getAmountOutFromSwap(uint amountIn,address inputToken,address outputToken) view returns (uint shares)",
      params: [amount, inputTokenAddress, outputTokenAddress]
    });
  } catch (e) {
    return BigInt('0')
  }
}

export const getSharesFromDeposit = async (amount: bigint, vaultData: VaultData) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vaultData.id as Address
  });

  try {
    const shares = await readContract({
      contract,
      method: "function previewDeposit(uint assets) view returns (uint shares)",
      params: [amount]
    });
    const formattedShares = Number(shares) / 10 ** vaultData.inputToken.decimals;
    return formattedShares.toString();
  } catch (e) {
    return "0"
  }
}

export const getAssetsFromShares = async (amount: bigint, vaultData: VaultData) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vaultData.id as Address
  });

  try {
    return await readContract({
      contract,
      method: "function previewRedeem(uint shares) view returns (uint assets)",
      params: [amount]
    });
  } catch (e) {
    return BigInt('0')
  }
}

