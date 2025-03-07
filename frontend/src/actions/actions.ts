import { Address, getContract, prepareContractCall, sendAndConfirmTransaction, sendTransaction, readContract, defineChain } from "thirdweb";
import { client } from "../utils/client";
import { SUPPORTED_CHAINS, zeroSolAddress } from "../constants/chainConfig";
import { Account } from "thirdweb/wallets";
import { getBalance } from "thirdweb/extensions/erc20";
import { ethers, JsonRpcProvider } from "ethers";
import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import beefyVaultABI from "../../abis/beefyVaultABI.json";
import curvePoolABI from "../../abis/curvePoolABI.json";
import { Chain } from "thirdweb";
import { toUtf8Bytes, ZeroAddress, AbiCoder } from "ethers";
import { keccak256 } from "thirdweb";
const Nori = require("nori-sdk").Nori;
const sdk = new Nori();

// import { fetchEthPrice } from "@/utils/utils";

import * as dotenv from "dotenv";
import { getCurrentSlippage } from "@/utils/utils";
import { Token, VaultData } from "@/types/types";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { SolanaZetaClient } from "@/lib/solanaGateway/cli/scripts";
import { Wallet } from "@coral-xyz/anchor";

dotenv.config();
const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE);
const provider_ethereum = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ETH);

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

export async function calculateBeefyAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  const beefyVault = new ethers.Contract(receiptTokenAddress, beefyVaultABI, provider);

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(await beefyVault.getPricePerFullShare());

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await provider.getBlockNumber();
    const averageBlockTimeInSeconds = 2; // Adjust this based on the average block time for Eddy Finance
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await beefyVault.getPricePerFullShare({ blockTag: pastBlockNumber })
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

export async function calculateCurveAPY(poolAddress: Address, strategyChain: Chain) {
  let relevant_provider = provider;
  if (strategyChain.id === 1) {
    relevant_provider = provider_ethereum;
  }
  const curvePool = new ethers.Contract(poolAddress, curvePoolABI, relevant_provider);

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(await curvePool.get_virtual_price());
    // Fetch the current block number and determine the number of blocks for 7 days
    const currentBlockNumber = await relevant_provider.getBlockNumber();
    const averageBlockTimeInSeconds = 12; // Adjust based on the Curve pool's chain
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await curvePool.get_virtual_price({ blockTag: pastBlockNumber })
    );
    // Calculate the rate of change in the virtual price over 7 days
    const rateOfChange = (currentPrice - pastPrice) * 10n ** 18n / pastPrice;
    const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

    // Calculate the annualized APY based on the 7-day change
    const depositAPY = Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;

    return depositAPY;
  } catch (error) {
    console.error("Error calculating APY for Curve:", error);
    return 0;
  }
}

export async function calculateCurveRewardsAPY(gaugeAddress: Address, strategyChain: Chain, crvTokenPrice: number, ethTokenPrice: number) {
  console.log("Fetching Curve rewards APY...");

  const gaugeContract = getContract({
    client,
    chain: strategyChain,
    address: gaugeAddress,
  });

  // 3. Get reward rate (emission rate per second)
  const [periodFinish, rate, lastUpdate] = await readContract({
    contract: gaugeContract,
    method: "function reward_data(address) view returns (uint256,uint256,uint256)",
    params: ["0xD533a949740bb3306d119CC777fa900bA034cd52"],
  });

  const rewardRate = ethers.toBigInt(rate);
  console.log("Reward Rate:", rewardRate);

  // 4. Get total staked LP tokens
  const totalStaked = await readContract(
    {
      contract: gaugeContract,
      method: "function totalSupply() view returns (uint256)",
    }
  )
  console.log("Total staked LP tokens:", totalStaked);

  if (totalStaked === 0n) {
    console.warn("No LP tokens staked. Skipping APY calculation.");
    return 0;
  }

  // 5. Get reward token and LP token prices (use an oracle or DEX API)
  console.log(`Curve token price (USD): ${crvTokenPrice}`);
  console.log(`Eth token price (USD): ${ethTokenPrice}`);

  if (!crvTokenPrice || !ethTokenPrice) {
    console.warn("Missing price data. Skipping APY calculation.");
    return 0;
  }

  // 6. Calculate APY
  console.log("rewardRate: ", rewardRate);
  const yearlyRewardsUSD = Number(rewardRate) * crvTokenPrice * 31536000; // Rewards per year in USD
  console.log(`Yearly rewards in USD: ${yearlyRewardsUSD}`);
  const totalStakedUSD = Number(totalStaked) * ethTokenPrice; // Total staked value in USD
  console.log(`Total staked value in USD: ${totalStakedUSD}`);
  const apy = (yearlyRewardsUSD / totalStakedUSD) * 100;
  console.log(`APY for CRV: ${apy}%`);

  return apy;
}

export async function calculateAaveRewardsAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  // Fetch rewards data
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
  console.log("Calculating Moonwell APY in actions.ts");
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

/**
 * Calculates the APY from COMP rewards for a Compound V3 lending pool.
 * @param cometAddress The address of the Compound V3 Comet contract.
 * @param rewardsContractAddress The address of the CometRewards contract.
 * @param strategyChain The chain where the contract is deployed.
 * @returns The estimated APY from COMP rewards.
 */
export async function calculateCompoundRewardsAPY(
  rewardsContractAddress: Address,
  cometAddress: Address,
  strategyChain: Chain,
  compUsdPrice: number
): Promise<number> {
  const cometContract = getContract({
    client,
    chain: strategyChain,
    address: cometAddress,
  })

  let baseTrackingSupplySpeed = await readContract({
    contract: cometContract,
    method: "function baseTrackingSupplySpeed() view returns (uint256)"
  })

  // Get the CometRewards contract
  const rewardsContract = getContract({
    client,
    chain: strategyChain,
    address: rewardsContractAddress,
  });
  const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;

  // Fetch COMP reward emission per second
  const rewardConfig = await readContract({
    contract: rewardsContract,
    method: "function rewardConfig(address) view returns (address token, uint64 rescaleFactor, bool shouldUpscale)",
    params: [cometAddress],
  });
  const rescaleFactor = rewardConfig[1]
  const shouldUpscale = rewardConfig[2]
  // if (shouldUpscale) {
  //   baseTrackingSupplySpeed *= rescaleFactor
  // } else {
  //   baseTrackingSupplySpeed /= rescaleFactor
  // }

  console.log("baseTrackingSupplySpeed:", baseTrackingSupplySpeed);
  // Fetch COMP price (from an Oracle, hardcoded for now)
  console.log("COMP Price (USD):", compUsdPrice);
  // Fetch Total Supply of assets in the lending pool

  const totalSupply = await readContract({
    contract: cometContract,
    method: "function totalSupply() view returns (uint256)",
  });

  // Calculate rewards APY:

  // Ensure baseTrackingSupplySpeed is a BigInt before dividing
  const baseTrackingSupplySpeedBN = BigInt(baseTrackingSupplySpeed);

  // Apply rescale factor adjustment
  let scaledAPR: bigint;
  if (shouldUpscale) {
    scaledAPR = baseTrackingSupplySpeedBN * BigInt(rescaleFactor);
  } else {
    scaledAPR = baseTrackingSupplySpeedBN / BigInt(rescaleFactor);
  }

  // Convert scaledAPR to a number
  const apr = Number(scaledAPR) / 1e18;
  if (apr <= 0) {
    throw new Error("Invalid APR value: APR should be greater than 0.");
  }

  // Convert APR to APY using continuous compounding
  const rewardsAPY = Math.exp(apr) - 1;

  console.log("APR:", apr);
  console.log("APY:", rewardsAPY);
  return Number(0.02); // TODO replace with proper value
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

export async function calculateVenusRewardsAPY(receiptTokenAddress: Address, strategyChain: Chain) {
  // It looks like this is an XVS reward, but you have to stake >1000 XVS in order to qualify for it
  // It also looks like there's a 90 day lockup period for the rewards
  return Number(0.067);
}

export const executeDeposit = async (vaultId: Address, strategyAddress: Address, strategyChainId: number, inputToken: Token, walletContext: WalletContextState | undefined, activeAccount: Account, activeChain: Chain, transactionAmount: bigint, setcrossChainTxId: Function) => {
  if (activeChain.id === 7000 || activeChain.id === 7001) { // if active chain is Zetachain (main or testnet)
    return executeDirectDeposit(vaultId, strategyAddress, strategyChainId, activeAccount, activeChain, transactionAmount);
  } else {
    return executeCrossChainDeposit(vaultId, strategyAddress, strategyChainId, inputToken, walletContext, activeAccount, activeChain, transactionAmount, setcrossChainTxId);
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

const getMinSharesOut = async (transactionAmount: bigint, strategyAddress: Address, strategyChainId: number) => {
  console.log("Getting shares out for underlying");
  const strategyChain = defineChain(strategyChainId);
  const contract = getContract({
    client,
    chain: strategyChain,
    address: strategyAddress
  });
  console.log("contract", contract);
  const sharesOutForUnderlying = await readContract({
    contract,
    method: "function convertToShares(uint256) view returns (uint256)",
    params: [transactionAmount]
  });
  console.log("sharesOutForUnderlying", sharesOutForUnderlying);
  const minSharesOut = sharesOutForUnderlying * BigInt(10000 - getCurrentSlippage() * 100) / BigInt(10000);
  return minSharesOut;
}

const getMinAmountOut = async (vaultId: string, transactionAmount: bigint, strategyAddress: Address, strategyChainId: number) => {
  const vaultContract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // Zetachain
    address: vaultId
  });
  const vaultTotalSupply = await readContract({
    contract: vaultContract,
    method: "function totalSupply() view returns (uint256)"
  });
  console.log("vaultTotalSupply", vaultTotalSupply);
  const fractionOfTotalShares = transactionAmount * ethers.parseEther("1") / vaultTotalSupply;
  console.log("fractionOfTotalShares", fractionOfTotalShares);
  const strategyChain = defineChain(strategyChainId);
  const contract = getContract({
    client,
    chain: strategyChain,
    address: strategyAddress
  });
  const strategyWithdrawShareAmount = await readContract({
    contract,
    method: "function getStrategyWithdrawShareAmount(uint256) public view returns (uint256)",
    params: [fractionOfTotalShares]
  });
  console.log("strategyWithdrawShareAmount", strategyWithdrawShareAmount);
  const amountOutForShares = await readContract({
    contract,
    method: "function convertToAssets(uint256) view returns (uint256)",
    params: [strategyWithdrawShareAmount]
  });
  console.log("amountOutForShares", amountOutForShares);
  const minAmountOut = amountOutForShares * BigInt(10000 - getCurrentSlippage() * 100) / BigInt(10000);
  return minAmountOut;
}

const executeDirectDeposit = async (vaultId: Address, strategyAddress: Address, strategyChainId: number, activeAccount: Account, activeChain: Chain, transactionAmount: bigint) => {
  console.log("Executing Deposit here");

  const minSharesOut = await getMinSharesOut(transactionAmount, strategyAddress, strategyChainId);
  console.log("minSharesOut", minSharesOut);

  let contract = getContract({
    client,
    chain: activeChain,
    address: vaultId
  });
  console.log("About to prepare contract call");
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function deposit(uint256 assets, uint256 minSharesOut, address receiver)",
    params: [transactionAmount, ethers.toBigInt("0"), activeAccount?.address],
  });
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: supplyTx
  });
  return receipt;
};

// Helper function to generate a unique transaction ID (bytes32)
const generateTransactionId = (
  accountAddress: string,
  activeChain: Chain
): `0x${string}` => {
  const timestamp = Date.now().toString(); // Current timestamp in milliseconds
  const randomValue = Math.floor(Math.random() * 100000).toString(); // Random number
  const inputString = `${accountAddress}-${activeChain.id}-${timestamp}-${randomValue}`;
  return keccak256(toUtf8Bytes(inputString)) as `0x${string}`;
};

const executeCrossChainDeposit = async (
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  inputToken: Token,
  walletContext: WalletContextState | undefined,
  activeAccount: Account,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Deposit");
  const minSharesOut = await getMinSharesOut(transactionAmount, strategyAddress, strategyChainId);
  console.log("minSharesOut", minSharesOut);

  const walletAddress = walletContext ? walletContext.publicKey?.toBase58()! : activeAccount.address

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(walletAddress, activeChain);
  console.log("Generated Transaction ID (bytes32):", transactionId);

  let contract, approveTx, receipt, payload, revertOptions;
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);

  // Prepare payload (calldata to pass to the receiver)
  payload = abiCoder.encode(
    ["address", "uint256", "uint16", "bytes32"],
    [inputToken.address, minSharesOut, slippageValue, transactionId]
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(["string", "bytes32", "address"], ["_crossChainDepositFailed", transactionId, walletAddress]);

  // Prepare revertOptions
  revertOptions = [
    contractWithdrawalReceiverAddress, // revertAddress
    true, // callOnRevert
    walletAddress, // abortAddress
    revertMessage as `0x${string}`, // revertMessage
    BigInt(1000000), // onRevertGasLimit
  ] as const;

  // const txOptions = {
  //   gasLimit: 1000000, // Example value, update as needed
  //   gasPrice: 100000, // TODO - this will have to change, depending on the chain?
  // };

  // Case 1: Native token (ETH, BNB, etc.)
  if (inputToken.isNative) {
    console.log("Native token deposit detected");

    if (walletContext) {
      const wallet = {
        publicKey: walletContext.publicKey,
        signTransaction: walletContext.signTransaction,
        signAllTransactions: walletContext.signAllTransactions
      } as Wallet
      const client = new SolanaZetaClient(wallet);

      const args = {
        types: ["address", "uint256", "uint16", "bytes32"],
        values: [inputToken, minSharesOut, slippageValue, transactionId]
      }

      const txHash = await client.solanaDepositAndCall(Number(transactionAmount), vaultId, args);
      console.log("Deposit executed");
      setcrossChainTxId(transactionId)
      return { transactionHash: txHash }
    } else {
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

      receipt = await sendAndConfirmTransaction({
        account: activeAccount,
        transaction: depositTx,
        // ...txOptions,
      });
      console.log("Deposit executed");
      setcrossChainTxId(transactionId)
      return receipt;
    }

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
        inputToken.address,
        payload,
        revertOptions,
      ],
    });
    console.log("depositTx", depositTx);
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

export const executeWithdrawal = async (vaultId: Address, strategyAddress: Address, strategyChainId: number, activeAccount: Account, activeChain: Chain, withdrawShareAmount: bigint, withdrawERC20: Address, withdrawZRC20: Address, setcrossChainTxId: Function) => {
  if (activeChain.id === 7000 || activeChain.id === 7001) { // if active chain is Zetachain (main or testnet)
    return executeDirectWithdrawal(vaultId, strategyAddress, strategyChainId, activeAccount, activeChain, withdrawShareAmount);
  } else {
    console.log("withdrawShareAmount", withdrawShareAmount);
    return executeCrossChainWithdrawal(vaultId, strategyAddress, strategyChainId, activeAccount, activeChain, withdrawShareAmount, withdrawERC20, withdrawZRC20, setcrossChainTxId);
  }
};

const executeDirectWithdrawal = async (vaultId: Address, strategyAddress: Address, strategyChainId: number, activeAccount: Account, activeChain: Chain, withdrawShareAmount: bigint) => { //vaultId: string
  console.log(" getting minAmountOut")
  const minAmountOut = await getMinAmountOut(vaultId, withdrawShareAmount, strategyAddress, strategyChainId);
  console.log("minAmountOut: ", minAmountOut)
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultId
  });

  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function redeem(uint256 shares, uint256 minAmountOut, address receiver, address owner)",
    params: [withdrawShareAmount, minAmountOut, activeAccount?.address, activeAccount?.address],
  });
  console.log("withdrawTx: ", withdrawTx)
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: withdrawTx
  });
  return receipt;
};

const executeCrossChainWithdrawal = async (
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  activeAccount: Account,
  activeChain: Chain,
  withdrawShareAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Address,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Withdrawal");
  const minAmountOut = await getMinAmountOut(vaultId, withdrawShareAmount, strategyAddress, strategyChainId);

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(activeAccount, activeChain);
  console.log("Generated Transaction ID (bytes32):", transactionId);

  const slippage = getCurrentSlippage();
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultId
  });

  const slippageValue = (slippage * 100).toFixed(0);

  console.log("minAmountOut", minAmountOut);
  // Prepare payload (calldata to pass to the receiver)
  const payload = abiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes32"],
    [withdrawZRC20, withdrawERC20, withdrawShareAmount, minAmountOut, slippageValue, transactionId]
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(["string", "bytes32", "address"], ["_crossChainWithdrawFailed", transactionId, activeAccount.address]);

  const revertOptions = [
    contractWithdrawalReceiverAddress, // revertAddress
    false, // callOnRevert
    activeAccount.address, // abortAddress
    revertMessage as `0x${string}`, // revertMessage
    BigInt(1000000), // onRevertGasLimit
  ] as const;

  // const txOptions = {
  //   gasLimit: BigInt(1000000), // Example value, update as needed
  //   gasPrice: BigInt(100000), // This will have to change depending on the chain
  // };

  // Get the Gateway contract to initiate the withdrawal
  contract = getContract({
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

export const getAmountOutFromSwap = async (
  amount: bigint,
  inputTokenAddress: string,
  outputTokenAddress: string,
  vaultData: VaultData
): Promise<bigint> => {
  const quoteRequest = {
    inputTokenAddress,
    outputTokenAddress,
    sourceChainId: 7000, // Setting input chain to 7000
    destinationChainId: 7000, // Setting output chain to 7000
    amount: amount.toString(), // Convert bigint to string
    slippage: 0.5, // Slippage in percentage
  };

  try {
    const quoteResponse = await sdk.bridge.getQuoteForBridge(quoteRequest);
    return BigInt(quoteResponse.quoteAmount); // Return the quoteAmount as bigint
  } catch (e) {
    console.error("Error fetching quote:", e);
    return BigInt(0);
  }
};


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

export const getPerformanceFee = async (vaultId: Address) => {
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // Zetachain
    address: vaultId
  });

  const perfFee = await readContract({
    contract,
    method: "function perfFee() view returns (uint16)",
  });

  return perfFee;
};

