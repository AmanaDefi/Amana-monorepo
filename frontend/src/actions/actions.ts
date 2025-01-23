import { Address, getContract, prepareContractCall, sendAndConfirmTransaction, sendTransaction, readContract } from "thirdweb";
import { client } from "../utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { VaultData } from "../types/types";
import { ethers, JsonRpcProvider } from "ethers";
import lendingPoolABI from "../../abis/lendingPoolABI.json";
import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import compoundVaultABI from "../../abis/compoundVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import { Chain, defineChain } from "thirdweb";
import { toUtf8Bytes, ZeroAddress, AbiCoder, hexlify } from "ethers";
import { keccak256 } from "thirdweb";

import * as dotenv from "dotenv";
import { VAULT_DATA } from "@/constants";

dotenv.config();
const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE);

const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
const EVMGatewayAddress = deployEnv === "testnet"
  ? process.env.NEXT_PUBLIC_EVM_GATEWAY_ADDRESS_TESTNET
  : process.env.NEXT_PUBLIC_EVM_GATEWAY_ADDRESS;
const abiCoder = new AbiCoder();

if (!EVMGatewayAddress) {
  throw new Error(`EVM Gateway address is not defined for the ${deployEnv} environment.`);
}

export async function calculateEddyAPY(poolAddress: Address, inputTokenAddress: Address) {
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

    console.log("depositAPY", depositAPY);

    return depositAPY;
  } catch (error) {
    console.error("Error calculating APY for Eddy Finance:", error);
    return 0;
  }
}


export async function calculateAaveAPY(poolAddress: Address, inputTokenAddress: Address, strategyChain: Chain) {
  // Get the Aave lending pool contract
  const aaveLendingPool = getContract({
    client,
    chain: strategyChain,
    address: poolAddress
  });

  const reserveData = await readContract({
    contract: aaveLendingPool,
    method: "function getReserveData(address) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128)",
    params: [inputTokenAddress as Address]
  });

  const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;

  // Get the liquidity rate (in Ray) and normalize it
  const liquidityRate = reserveData[2]; // Assuming this is the correct index for liquidity rate in reserveData
  const depositAPR = Number(liquidityRate) / 1e27;

  // Calculate APY using compounding
  const depositAPY = (Math.pow(1 + (depositAPR / SECONDS_IN_YEAR), SECONDS_IN_YEAR) - 1);
  console.log("depositAPY", depositAPY);

  return depositAPY;
}


export async function calculateMoonwellAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  const moonwellVault = new ethers.Contract(receiptTokenAddress, moonwellVaultABI, provider);
  // const moonwellVault = getContract({
  //   client,
  //   chain: strategyChain,
  //   address: receiptTokenAddress
  // });
  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await provider.getBlockNumber();
  const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
  const pastBlockNumber = BigInt(currentBlockNumber - blocksIn7Days);

  // const currentPrice = await readContract({
  //   contract: moonwellVault,
  //   method: "function convertToAssets(uint256) view returns (uint256)",
  //   params: [BigInt(1e18)]
  // });

  const currentPrice = ethers.toBigInt(await moonwellVault.convertToAssets(BigInt(1e18)));

  const pastPrice = ethers.toBigInt(await moonwellVault.convertToAssets(BigInt(1e18), { blockTag: pastBlockNumber }));
  // const pastPrice = await readContract({
  //   contract: moonwellVault,
  //   method: "function convertToAssets(uint256) view returns (uint256)",
  //   params: [BigInt(1e18)]
  // });
  const rateOfChange = (currentPrice - pastPrice) * 10n ** 18n / pastPrice;
  const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

  return Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;
}

export async function calculateCompoundAPY(receiptTokenAddress: Address) {
  const compoundVault = new ethers.Contract(receiptTokenAddress, compoundVaultABI, provider);

  const secondsInAYear = 365 * 24 * 60 * 60;

  const currentUtilization = ethers.toBigInt(await compoundVault.getUtilization());

  const currentSupplyRate = ethers.toBigInt(await compoundVault.getSupplyRate(currentUtilization));

  const currentSupplyRateScaled = Number(currentSupplyRate) / Number(1e18);

  const currentAPY = Math.pow(1 + currentSupplyRateScaled, secondsInAYear) - 1;
  return currentAPY;
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
  console.log("transactionAmount", transactionAmount);

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
  const slippage = 200; // TODO change this to be an input from user on FE
  // Prepare payload (calldata to pass to the receiver)
  payload = abiCoder.encode(
    ["address", "uint16", "bytes32"],
    [inputToken, slippage, transactionId]
  ) as `0x${string}`;

  // Prepare revertOptions
  revertOptions = [
    activeAccount.address, // revertAddress
    false, // callOnRevert
    activeAccount.address, // abortAddress
    hexlify(toUtf8Bytes("Revert happened")) as `0x${string}`, // revertMessage
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
    console.log("contract", contract);
    console.log("transaction amount:", transactionAmount)
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
      "function withdraw(uint256 assets, address receiver, address owner)",
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
  withdrawZRC20: Address, // TODO add this higher up in the calling functions,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Withdrawal");

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(activeAccount, activeChain);
  console.log("Generated Transaction ID (bytes32):", transactionId);
  const slippage = 10000; // TODO change this to be an input from user on FE
  // Prepare payload (calldata to pass to the receiver)
  const payload = abiCoder.encode(
    ["address", "address", "uint256", "uint16", "bytes32"],
    [withdrawZRC20, withdrawERC20, withdrawAmount, slippage, transactionId]
  ) as `0x${string}`;

  // Prepare revertOptions to match the Solidity struct
  const revertOptions = [
    activeAccount.address, // revertAddress
    false, // callOnRevert
    activeAccount.address, // abortAddress
    hexlify(toUtf8Bytes("Revert happened")) as `0x${string}`, // revertMessage
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

export const fetchUserVaultMaxWithdraw = async (decimals: number, userAddress: Address, vaultAddress: Address) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // This will always be Zetachain, as it's a balance on the vault
    address: vaultAddress
  });
  const maxWithdraw = await readContract({
    contract,
    method: "function maxWithdraw(address) view returns (uint256)",
    params: [userAddress]
  });
  const formattedMaxWithdraw = Number(maxWithdraw) / 10 ** decimals;
  return formattedMaxWithdraw.toString();
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
  console.log("decimals", decimals);
  const formattedBalance = Number(balance) / 10 ** decimals;
  return formattedBalance.toString();
}

export const updateAPYs = async (vaultData: VaultData[]): Promise<VaultData[]> => {
  const updatedVaults = await Promise.all(
    vaultData.map(async (vault) => {
      try {
        const strategyChain = defineChain(vault.protocol.chainId); // ToDo rather grab this from supported chains?

        const strategyContract = getContract({
          client,
          chain: strategyChain,
          address: vault.protocol.strategyAddress,
        });
        let APY7d = 0;
        if (vault.protocol.name === "Aave") {
          const receiptTokenAddress = await readContract({
            contract: strategyContract,
            method: "function aaveReceiptToken() view returns (address)",
          });

          const receiptTokenContract = getContract({
            client,
            chain: strategyChain,
            address: receiptTokenAddress,
          });

          const poolAddress = await readContract({
            contract: receiptTokenContract,
            method: "function POOL() view returns (address)",
          });

          APY7d = await calculateAaveAPY(poolAddress as Address, vault.inputToken.address as Address, strategyChain);
        } else {
          // Generic logic for other vaults (e.g., Moonwell)
          const receiptTokenAddress = await readContract({
            contract: strategyContract,
            method: "function receiptToken() view returns (address)",
          });
          APY7d = await calculateMoonwellAPY(receiptTokenAddress as Address, strategyChain);
        }

        return {
          ...vault,
          APY7d,
        };
      } catch (error) {
        console.error(`Error fetching data for vault ${vault.id}:`, error);
        return { ...vault, totalAssets: "Error", APY7d: 0 };
      }
    })
  );

  return updatedVaults;
};

