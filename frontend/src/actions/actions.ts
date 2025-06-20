import {
  CHAIN_ID,
  crossChainTxUrl,
  SUPPORTED_CHAINS,
  EVM_GATEWAY_ADDRESSES,
  chainConfigs,
  MULTICALL_ADDRS,
} from "../constants/chainConfig";
import {
  ethers,
  getAddress,
  Interface,
  solidityPacked,
} from "ethers";

import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import beefyVaultABI from "../../abis/beefyVaultABI.json";
import convexRewardPoolABI from "../../abis/convexRewardPoolABI.json";
import IBalancerStablePoolABI from "../../abis/IBalancerStablePoolABI.json";
import IBalancerLiquidityGaugeABI from "../../abis/IBalancerLiquidityGauge.json";
import IERC20MetadataABI from "../../abis/IERC20MetadataABI.json";

import { toUtf8Bytes, ZeroAddress, AbiCoder } from "ethers";
const Nori = require("nori-sdk").Nori;
const sdk = new Nori();
import {
  encodeFunctionData,
  formatUnits,
  Chain,
  keccak256,
  Address,
  encodeAbiParameters,
  parseAbiItem,
} from "viem";
import {
  getCurrentSlippage,
  isZetachain,
  getSolanaEVMAddress,
} from "@/utils/utils";
import { baseProvider, arbitrumProvider } from "../utils/providers";

import * as dotenv from "dotenv";
import { Token, VaultData } from "@/types/types";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { SolanaZetaClient } from "@/lib/solanaGateway/cli/scripts";
import { Wallet } from "@coral-xyz/anchor";
import axios from "axios";
import { swap } from "codemelt-retro-api-sdk/functional/api";
import api from "codemelt-retro-api-sdk";
import { apiService } from "@/service";
import multicall3Abi from "../../abis/multicall3ABI.json";
import { hexDataSlice } from "@ethersproject/bytes";
import { RECEIPT_LOCAL_STORAGE_KEY } from "@/constants";
import { updateLocalStorageObject } from "@/utils/localStorageUtils";
import { GetUserResult } from "@account-kit/core";
import { UseUserResult } from "@account-kit/react";
import {
  getPublicClient,
  getRpcUrl,
  getWalletClient,
} from "@/utils/getPublicClient";
import type { IConnection } from "codemelt-retro-api-sdk";
import { Connector } from "wagmi";

dotenv.config();

const abiCoder = new AbiCoder();

const isTestnet = process.env.NEXT_PUBLIC_DEPLOY_ENV === "testnet";
const contractWithdrawalReceiverAddress = (
  isTestnet
    ? process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS_TESTNET
    : process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS
) as `0x${string}`;

// To do - move this to chainConfig
const BLOCK_TIME: { [chainId: number]: number } = {
  1: 12, // Ethereum
  137: 2, // Polygon
  8453: 2, // Base
  42161: 0.25, // Arbitrum
};

export async function calculateEddyAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const minterAbi = [
    {
      inputs: [],
      name: "minter",
      outputs: [{ name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const publicClient = getPublicClient(strategyChain.id);

  if (!publicClient) {
    console.log(`Failed to get public client ID ${strategyChain.id}`);
    return 0;
  }

  const poolAddress = await publicClient.readContract({
    address: receiptTokenAddress,
    abi: minterAbi,
    functionName: "minter",
  });

  const eddyFinancePool = new ethers.Contract(
    poolAddress,
    fourPoolABI,
    baseProvider,
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(
      await eddyFinancePool.get_virtual_price(),
    );

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await baseProvider.getBlockNumber();
    const averageBlockTimeInSeconds = 5; // Adjust this based on the average block time for Eddy Finance
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds,
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await eddyFinancePool.get_virtual_price({ blockTag: pastBlockNumber }),
    );

    // Calculate the rate of change in the virtual price over 7 days
    const rateOfChange = ((currentPrice - pastPrice) * 10n ** 18n) / pastPrice;
    const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

    // Calculate the annualized APY based on the 7-day change
    const depositAPY = Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;

    return depositAPY;
  } catch (error) {
    console.log("Error calculating APY for Eddy Finance:", error);
    return 0;
  }
}

export async function calculateBeefyAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const beefyVault = new ethers.Contract(
    receiptTokenAddress,
    beefyVaultABI,
    baseProvider,
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(
      await beefyVault.getPricePerFullShare(),
    );

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await baseProvider.getBlockNumber();
    const averageBlockTimeInSeconds = 2; // Adjust this based on the average block time for Eddy Finance
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds,
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await beefyVault.getPricePerFullShare({ blockTag: pastBlockNumber }),
    );

    // Calculate the rate of change in the virtual price over 7 days
    const rateOfChange = ((currentPrice - pastPrice) * 10n ** 18n) / pastPrice;
    const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

    // Calculate the annualized APY based on the 7-day change
    const depositAPY = Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;

    return depositAPY;
  } catch (error) {
    console.log("Error calculating APY for Eddy Finance:", error);
    return 0;
  }
}

export async function calculateAaveAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const rpcUrl = getRpcUrl(strategyChain);
  const provider = new ethers.JsonRpcProvider(rpcUrl, strategyChain.id);
  const mcAddress = MULTICALL_ADDRS[strategyChain.id].address;
  const mcIface = new Interface(multicall3Abi);
  const receiptIface = new Interface([
    "function POOL() view returns (address)",
    "function UNDERLYING_ASSET_ADDRESS() view returns (address)",
  ]);
  const calls = [
    {
      target: receiptTokenAddress,
      allowFailure: false,
      callData: receiptIface.encodeFunctionData("POOL", []),
    },
    {
      target: receiptTokenAddress,
      allowFailure: false,
      callData: receiptIface.encodeFunctionData("UNDERLYING_ASSET_ADDRESS", []),
    },
  ];

  const multicallData = await provider.call({
    to: mcAddress,
    data: mcIface.encodeFunctionData("aggregate3", [calls]),
  });
  const [results] = mcIface.decodeFunctionResult(
    "aggregate3",
    multicallData,
  ) as any;
  if (!results[0].success || !results[1].success) {
    throw new Error("Failed to fetch POOL or UNDERLYING_ASSET_ADDRESS");
  }
  const poolAddress = getAddress(hexDataSlice(results[0].returnData, 12));
  const underlyingAssetAddress = getAddress(
    hexDataSlice(results[1].returnData, 12),
  );
  const aaveLendingPoolAbi = [
    {
      inputs: [{ name: "asset", type: "address" }],
      name: "getReserveData",
      outputs: [
        { name: "totalAToken", type: "uint256" },
        { name: "totalStableDebt", type: "uint128" },
        { name: "totalVariableDebt", type: "uint128" },
        { name: "liquidityRate", type: "uint128" },
        { name: "variableBorrowRate", type: "uint128" },
        { name: "stableBorrowRate", type: "uint128" },
        { name: "lastUpdateTimestamp", type: "uint40" },
        { name: "id", type: "uint16" },
        { name: "aTokenAddress", type: "address" },
        { name: "stableDebtTokenAddress", type: "address" },
        { name: "variableDebtTokenAddress", type: "address" },
        { name: "interestRateStrategyAddress", type: "address" },
        { name: "accruedToTreasury", type: "uint128" },
        { name: "unbacked", type: "uint128" },
        { name: "isolationModeTotalDebt", type: "uint128" },
      ],
      stateMutability: "view",
      type: "function",
    },
  ] as const;
  const publicClient = getPublicClient(strategyChain.id);

  if (!publicClient) {
    console.log(`Failed to fetch public client for id: ${strategyChain.id}`);
    return 0;
  }

  const reserveData = await publicClient.readContract({
    address: poolAddress,
    abi: aaveLendingPoolAbi,
    functionName: "getReserveData",
    args: [underlyingAssetAddress],
  });

  const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;

  // Get the liquidity rate (in Ray) and normalize it
  const liquidityRate = reserveData[4]; // Assuming this is the correct index for liquidity rate in reserveData
  const depositAPR = Number(liquidityRate) / 1e27;
  // Calculate APY using compounding
  const depositAPY =
    Math.pow(1 + depositAPR / SECONDS_IN_YEAR, SECONDS_IN_YEAR) - 1;

  return depositAPY;
}
export async function calculateConvexEthereumRewardsAPY(
  poolAddress: Address,
  inputToken: Token,
  convexRewardPool: Address,
  strategyChain: Chain,
  crvTokenPrice: number,
  cvxTokenPrice: number,
  ethTokenPrice: number,
): Promise<number> {
  const rpcUrl = getRpcUrl(strategyChain);
  const provider = new ethers.JsonRpcProvider(rpcUrl, strategyChain.id);
  const mcAddr = MULTICALL_ADDRS[strategyChain.id].address;
  const mcIface = new Interface(multicall3Abi);
  const rewardIface = new Interface([
    "function rewardRate() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function extraRewards(uint256) view returns (address)",
    "function get_virtual_price() view returns (uint256)",
  ]);
  const curveIface = new Interface([
    "function get_virtual_price() view returns (uint256)",
  ]);

  const calls = [
    {
      target: convexRewardPool,
      allowFailure: false,
      callData: rewardIface.encodeFunctionData("rewardRate", []),
    },
    {
      target: convexRewardPool,
      allowFailure: false,
      callData: rewardIface.encodeFunctionData("totalSupply", []),
    },
    {
      target: convexRewardPool,
      allowFailure: true,
      callData: rewardIface.encodeFunctionData("extraRewards", [0n]),
    },
    {
      target: poolAddress,
      allowFailure: false,
      callData: curveIface.encodeFunctionData("get_virtual_price", []),
    },
  ];

  const multicallData = await provider.call({
    to: mcAddr,
    data: mcIface.encodeFunctionData("aggregate3", [calls]),
  });
  const [results] = mcIface.decodeFunctionResult(
    "aggregate3",
    multicallData,
  ) as any;

  // Decode batched results
  const crvRewardRate = BigInt(results[0].returnData);
  const totalSupply = BigInt(results[1].returnData);
  const extraAddrRaw = results[2].success
    ? hexDataSlice(results[2].returnData, 12)
    : null;
  const virtualPrice = BigInt(results[3].returnData);

  const secondsPerYear = 365 * 24 * 60 * 60;
  const crvPerLpPerYear =
    (Number(crvRewardRate) / Number(totalSupply)) * secondsPerYear;

  const rewardPoolAbi = [
    {
      name: "extraRewards",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "", type: "uint256" }],
      outputs: [{ name: "", type: "address" }],
    },
  ] as const;

  const extraRewardAbi = [
    {
      name: "rewardRate",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const publicClient = getPublicClient(strategyChain.id);
  if (!publicClient) {
    console.log(
      `Failed to get public client for chain id: ${strategyChain.id}`,
    );
    return 0;
  }

  let cvxPerTokenPerYear = 0;
  try {
    const extraRewardAddress = await publicClient.readContract({
      address: convexRewardPool,
      abi: rewardPoolAbi,
      functionName: "extraRewards",
      args: [0n],
    });

    const cvxRewardRate = await publicClient.readContract({
      address: extraRewardAddress,
      abi: extraRewardAbi,
      functionName: "rewardRate",
    });

    if (totalSupply === 0n) return 0;

    const secondsPerYear = 31536000;
    cvxPerTokenPerYear =
      (Number(cvxRewardRate) * secondsPerYear) / Number(totalSupply);

    const lpPriceInInput = Number(virtualPrice) / 1e18;
    const lpPriceInUSD =
      inputToken.symbol === "ETH.ETH"
        ? lpPriceInInput * ethTokenPrice
        : lpPriceInInput;

    // Step 4: APY Calculation
    const crvApy = (crvPerLpPerYear * crvTokenPrice) / lpPriceInUSD;
    const cvxApy = (cvxPerTokenPerYear * cvxTokenPrice) / lpPriceInUSD;

    const annualApy = crvApy + cvxApy;
    return annualApy;
  } catch (error) {
    console.log("calculateConvexEthereumRewardsAPY failed:", error);
    return 0;
  }
}

export async function calculateConvexArbitrumRewardsAPY(
  poolAddress: Address,
  inputToken: Token,
  convexRewardPool: Address,
  strategyChain: Chain,
  crvTokenPrice: number,
  ethTokenPrice: number,
): Promise<number> {
  const provider = arbitrumProvider;

  const rewardPool = new ethers.Contract(
    convexRewardPool,
    convexRewardPoolABI,
    provider,
  );

  try {
    const currentRewards = await rewardPool.rewards(0);
    const currentRewardsIntegral: bigint = ethers.toBigInt(
      currentRewards.reward_integral,
    );
    // Fetch the current block number and determine the number of blocks for 7 days
    const currentBlockNumber = await provider.getBlockNumber();
    const averageBlockTimeInSeconds = BLOCK_TIME[strategyChain.id] ?? 12;
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds,
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    const pastRewards = await rewardPool.rewards(0, {
      blockTag: pastBlockNumber,
    });
    const pastRewardsIntegral: bigint = ethers.toBigInt(
      pastRewards.reward_integral,
    );

    const curvePoolAbi = [
      {
        name: "get_virtual_price",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
      },
    ] as const;

    const publicClient = getPublicClient(strategyChain.id);
    if (!publicClient) {
      return 0;
    }

    const virtualPrice = await publicClient.readContract({
      address: poolAddress,
      abi: curvePoolAbi,
      functionName: "get_virtual_price",
    });

    const rewardsPerToken7Days = currentRewardsIntegral - pastRewardsIntegral;
    const secondsPerWeek = 7 * 24 * 60 * 60;
    const secondsPerYear = 365 * 24 * 60 * 60;

    const ratePerSecond = Number(rewardsPerToken7Days) / secondsPerWeek;
    const annualCrvPerToken = ratePerSecond * secondsPerYear;
    const lpPriceInInput = Number(virtualPrice) / 1e18;
    const lpPriceInUSD =
      inputToken.symbol === "ETH.ETH"
        ? lpPriceInInput * ethTokenPrice
        : lpPriceInInput;

    const crvApy =
      ((Number(annualCrvPerToken) / 1e20) * crvTokenPrice) / lpPriceInUSD;
    //console.log("CRV APY:", crvApy);
    return crvApy;
  } catch (err) {
    console.log("CRV APY calculation failed:", err);
    return 0;
  }
}

export async function calculateCombinedBalancerAPY({
  receiptTokenAddress,
  liquidityGaugeAddress,
  rewardTokenAddress,
  inputTokenAddress,
  opTokenPrice,
  strategyChain,
}: {
  receiptTokenAddress: Address;
  liquidityGaugeAddress: Address;
  rewardTokenAddress: Address;
  inputTokenAddress: Address;
  opTokenPrice: number;
  strategyChain: Chain;
}): Promise<{ baseAPY: number; rewardsAPY: number; totalAPY: number }> {
  const provider = new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE,
  );

  const stablePool = new ethers.Contract(
    receiptTokenAddress,
    IBalancerStablePoolABI,
    provider,
  );

  const gauge = new ethers.Contract(
    liquidityGaugeAddress,
    IBalancerLiquidityGaugeABI,
    provider,
  );

  try {
    // --- Base APY calculation ---
    const currentRate = await stablePool.getRate();
    const currentBlock = await provider.getBlockNumber();

    const avgBlockTime = BLOCK_TIME[strategyChain.id] ?? 12;
    const blocksIn7Days = Math.floor((7 * 24 * 60 * 60) / avgBlockTime);
    const pastBlock = currentBlock - blocksIn7Days;

    const pastRate = await stablePool.getRate({ blockTag: pastBlock });

    const rateDelta =
      ((BigInt(currentRate) - BigInt(pastRate)) * 1_000_000n) /
      BigInt(pastRate);
    const rateOfChange = Number(rateDelta) / 1_000_000;
    const baseAPY = Math.pow(1 + rateOfChange, 52.14) - 1;
    console.log("Base APY:", baseAPY);
    // --- Rewards APY calculation ---
    const rewardData = await gauge.reward_data(rewardTokenAddress);
    const rewardRate = rewardData.rate;
    const totalSupply = await gauge.totalSupply();

    if (BigInt(totalSupply) === 0n) {
      return { baseAPY, rewardsAPY: 0, totalAPY: baseAPY };
    }

    const rewardToken = new ethers.Contract(
      rewardTokenAddress,
      IERC20MetadataABI,
      provider,
    );
    const inputToken = new ethers.Contract(
      inputTokenAddress,
      IERC20MetadataABI,
      provider,
    );

    const [rewardDecimals, inputDecimals] = await Promise.all([
      rewardToken.decimals(),
      inputToken.decimals(),
    ]);

    const secondsPerYear = 365 * 24 * 60 * 60;

    const rewardsPerYear =
      (Number(rewardRate) * secondsPerYear) /
      Math.pow(10, Number(rewardDecimals));
    console.log("Rewards per year:", rewardsPerYear);
    const rewardsPerYearUSD = rewardsPerYear * opTokenPrice;
    console.log("Rewards per year in USD:", rewardsPerYearUSD);
    const rateDecimal = Number(currentRate) / 1e18; // assuming 18 decimals
    const totalSupplyUSD =
      parseFloat(ethers.formatUnits(totalSupply, 18)) * rateDecimal;
    console.log("Total supply in USD:", totalSupplyUSD);
    const rewardsAPR = rewardsPerYearUSD / totalSupplyUSD;
    const rewardsAPY = Math.pow(1 + rewardsAPR / 365, 365) - 1; // assumes daily compounding of the rewards

    console.log("Rewards APY:", rewardsAPY);
    return { baseAPY, rewardsAPY, totalAPY: baseAPY + rewardsAPY };
  } catch (error) {
    console.log("calculateCombinedBalancerAPY failed:", error);
    return { baseAPY: 0, rewardsAPY: 0, totalAPY: 0 };
  }
}

export async function calculateAaveRewardsAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
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
  const rewardsAPY = 5;
  return rewardsAPY;
}

export async function calculateMoonwellAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const moonwellVault = new ethers.Contract(
    receiptTokenAddress,
    moonwellVaultABI,
    baseProvider,
  );
  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await baseProvider.getBlockNumber();
  const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
  const pastBlockNumber = BigInt(currentBlockNumber - blocksIn7Days);
  const currentPrice = ethers.toBigInt(
    await moonwellVault.convertToAssets(BigInt(1e18)),
  );
  const pastPrice = ethers.toBigInt(
    await moonwellVault.convertToAssets(BigInt(1e18), {
      blockTag: pastBlockNumber,
    }),
  );
  const rateOfChange = ((currentPrice - pastPrice) * 10n ** 18n) / pastPrice;
  const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);
  return Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;
}

export async function calculateCompoundAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const publicClient = getPublicClient(strategyChain.id);
  if (!publicClient) {
    console.log(`Failed to get public client with id ${strategyChain.id}`);
    return 0;
  }
  const currentUtilization = await publicClient.readContract({
    address: receiptTokenAddress,
    abi: [parseAbiItem("function getUtilization() view returns (uint256)")],
    functionName: "getUtilization",
  });

  const currentSupplyRate = await publicClient.readContract({
    address: receiptTokenAddress,
    abi: [
      parseAbiItem("function getSupplyRate(uint256) view returns (uint256)"),
    ],
    functionName: "getSupplyRate",
    args: [currentUtilization],
  });

  const secondsInAYear = 31536000; // 365 * 24 * 60 * 60
  const currentSupplyRateScaled = Number(currentSupplyRate) / Number(1e18);
  console.log("Current Supply Rate Scaled:", currentSupplyRateScaled);
  const currentAPY = Math.pow(1 + currentSupplyRateScaled, secondsInAYear) - 1;
  console.log("Current APY:", currentAPY);
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
  compUsdPrice: number,
): Promise<number> {
  // const cometContract = getContract({
  //   client,
  //   chain: strategyChain,
  //   address: cometAddress,
  // });

  // let baseTrackingSupplySpeed = await readContract({
  //   contract: cometContract,
  //   method: "function baseTrackingSupplySpeed() view returns (uint256)",
  // });

  // // Get the CometRewards contract
  // const rewardsContract = getContract({
  //   client,
  //   chain: strategyChain,
  //   address: rewardsContractAddress,
  // });
  // const SECONDS_IN_YEAR = 365 * 24 * 60 * 60;

  // // Fetch COMP reward emission per second
  // const rewardConfig = await readContract({
  //   contract: rewardsContract,
  //   method:
  //     "function rewardConfig(address) view returns (address token, uint64 rescaleFactor, bool shouldUpscale)",
  //   params: [cometAddress],
  // });
  // const rescaleFactor = rewardConfig[1];
  // const shouldUpscale = rewardConfig[2];
  // // if (shouldUpscale) {
  // //   baseTrackingSupplySpeed *= rescaleFactor
  // // } else {
  // //   baseTrackingSupplySpeed /= rescaleFactor
  // // }

  // const totalSupply = await readContract({
  //   contract: cometContract,
  //   method: "function totalSupply() view returns (uint256)",
  // });

  // // Calculate rewards APY:

  // // Ensure baseTrackingSupplySpeed is a BigInt before dividing
  // const baseTrackingSupplySpeedBN = BigInt(baseTrackingSupplySpeed);

  // // Apply rescale factor adjustment
  // let scaledAPR: bigint;
  // if (shouldUpscale) {
  //   scaledAPR = baseTrackingSupplySpeedBN * BigInt(rescaleFactor);
  // } else {
  //   scaledAPR = baseTrackingSupplySpeedBN / BigInt(rescaleFactor);
  // }

  // // Convert scaledAPR to a number
  // const apr = Number(scaledAPR) / 1e18;
  // if (apr <= 0) {
  //   throw new Error("Invalid APR value: APR should be greater than 0.");
  // }

  // // Convert APR to APY using continuous compounding
  // const rewardsAPY = Math.exp(apr) - 1;

  return Number(0); // currently no rewards for our Compound V3 vault
}

export async function calculateVenusAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const vTokenAbi = [
    {
      name: "supplyRatePerBlock",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const publicClient = getPublicClient(strategyChain.id);
  if (!publicClient) {
    console.log(`Failed to get client for chain: ID ${strategyChain.id}`);
    return 0;
  }

  try {
    const supplyRatePerBlock = await publicClient.readContract({
      address: receiptTokenAddress,
      abi: vTokenAbi,
      functionName: "supplyRatePerBlock",
    });

    const blocksPerYear = 10512000;
    const ratePerBlock = Number(supplyRatePerBlock) / 1e18;

    const currentAPY = Math.pow(1 + ratePerBlock, blocksPerYear) - 1;

    console.log("vToken APY:", currentAPY);

    return currentAPY;
  } catch (error) {
    console.log("failed to get vToken APY:", error);
    return 0;
  }
}

export async function calculateVenusRewardsAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  // It looks like this is an XVS reward, but you have to stake >1000 XVS in order to qualify for it
  // It also looks like there's a 90 day lockup period for the rewards
  return Number(0.067);
}

export const executeDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  walletContext: WalletContextState | undefined,
  activeAccount: GetUserResult,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function,
  sendUserOperation: Function,
  activeConnector?: Connector | null
) => {
  if (activeChain.id === CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectDeposit(
      vaultData,
      inputToken,
      activeAccount,
      activeChain,
      transactionAmount,
      sendUserOperation,
      activeConnector
    );
  } else if (activeChain.id === CHAIN_ID.solana) {
    return executeSolanaDeposit(
      vaultData,
      inputToken,
      walletContext!,
      activeChain,
      transactionAmount,
      setcrossChainTxId,
    );
  } else {
    return executeCrossChainDeposit(
      vaultData,
      inputToken,
      activeAccount,
      activeChain,
      transactionAmount,
      setcrossChainTxId,
      activeConnector
    );
  }
};

export const waitForReceiptSol = async (txHash: string) => {
  const promise = new Promise<any>((resolve, reject) => {
    // Track attempts to avoid infinite loops
    let attempts = 0;
    const maxAttempts = 10000; // Set a reasonable max

    const fetchCrossTx = async () => {
      try {
        attempts++;
        const res = await axios.get(`${crossChainTxUrl}/${txHash}`);

        if (res.data.CrossChainTxs) {
          resolve(res.data);
        } else if (attempts >= maxAttempts) {
          reject(
            new Error(
              `Failed to get CrossChainTxs after ${maxAttempts} attempts`,
            ),
          );
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(fetchCrossTx, 2000);
        }
      }
    };

    // Start the polling process
    fetchCrossTx();
  });

  return promise;
};

export const Approvedeposit = async (
  vaultId: Address,
  inputToken: Address,
  activeAccount: UseUserResult,
  activeChain: Chain,
  transactionAmount: bigint,
  sendUserOperation: any,
  connector?: Connector | null
) => {
  //console.log("Executing DepositApprove");
  const walletClient = await getWalletClient(activeChain.id, connector);
  if ((!walletClient && !sendUserOperation) || !activeAccount?.address) {
    console.log("No wallet client or active account found");
    return false;
}

  console.log("Executing DepositApprove");
  console.log("inputToken", inputToken);
  try {
    let spender = EVM_GATEWAY_ADDRESSES[activeChain.id];
    if (activeChain.id === 7000 || activeChain.id === 7001) {
      spender = vaultId;
    } else {
      spender = EVM_GATEWAY_ADDRESSES[activeChain.id];
    }

    const erc20ApproveAbi = [
      parseAbiItem("function approve(address to, uint256 value)"),
    ] as const;

    let txHash;

    if (activeAccount.type === "sca" && sendUserOperation) {
      const { hash } = await sendUserOperation({
        uo: [
          {
            target: inputToken,
            data: encodeFunctionData({
              abi: erc20ApproveAbi,
              functionName: "approve",
              args: [spender, transactionAmount],
            }),
          },
        ],
      });
      txHash = hash;
    } else if (!!walletClient) {
      const eoaClient = walletClient;

      txHash = await eoaClient.writeContract({
        address: inputToken,
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [spender, transactionAmount],
        account: activeAccount?.address,
        chain: eoaClient.chain!,
      });
    }

    const publicClient = getPublicClient(activeChain.id);
    if (!publicClient) {
      return false;
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });
    if (receipt.status === "success") {
      console.log("success approve");
      return receipt;
    } else {
      console.log("error approve");
      return false;
    }
  } catch (error: any) {
    return false;
  }
};

const getPathDataAndMinSharesOut = async (
  vaultData: VaultData,
  inputToken: Token,
  transactionAmount: bigint,
  activeChain: Chain,
): Promise<{ swapPath: `0x${string}`; minSharesOut: bigint }> => {
  const inputTokenZeta = isZetachain(activeChain.id)
    ? inputToken
    : inputToken?.ZRC20equivalent;
  if (!inputTokenZeta) {
    throw new Error("Input token not found on Zetachain");
  }
  let assetsConversionAmount: bigint = transactionAmount;
  let swapPath: `0x${string}` = "0x";

  if (inputTokenZeta.address !== vaultData.inputToken.address) {
    const { encodedPath, amountOut } = await getPathDataAndAmountOut(
      transactionAmount,
      inputTokenZeta,
      vaultData.inputToken,
      vaultData.id as Address,
      getCurrentSlippage() * 100,
    );
    swapPath = encodedPath ?? "0x";
    assetsConversionAmount = amountOut;
  }

  const publicClient = getPublicClient(vaultData.protocol.chainId);
  if (!publicClient) throw new Error("Error get public client");

  const sharesOutForUnderlying = await publicClient.readContract({
    address: vaultData.protocol.strategyAddress as Address,
    abi: [
      parseAbiItem("function convertToShares(uint256) view returns (uint256)"),
    ],
    functionName: "convertToShares",
    args: [assetsConversionAmount],
  });

  const minSharesOut =
    (sharesOutForUnderlying * BigInt(10000 - getCurrentSlippage() * 100)) /
    BigInt(10000);

  return {
    swapPath,
    minSharesOut,
  };
};

const getPathDataAndMinAmountOut = async (
  vaultData: VaultData,
  outputToken: Token,
  transactionAmount: bigint,
) => {
  const slippageBps = Number(getCurrentSlippage() * 100); // e.g. 0.5% → 50 BPS
  const minAmountOut =
    (transactionAmount * BigInt(10000 - Number(slippageBps))) / BigInt(10000);

  let swapPath: `0x${string}` = "0x";

  if (outputToken.address !== vaultData.inputToken.address) {
    const result = await getPathDataAndAmountOut(
      transactionAmount,
      vaultData.inputToken,
      outputToken,
      vaultData.id as Address,
      slippageBps,
    );
    swapPath = result.encodedPath ?? "0x";
  }

  return { swapPath, minAmountOut };
};

const executeDirectDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  activeAccount: UseUserResult,
  activeChain: Chain,
  transactionAmount: bigint,
  sendUserOperation: Function,
  activeConnector?: Connector | null
) => {
  if (!activeAccount)
    throw new Error("no activeAccount found for perform deposit");
  console.log("Executing Direct Deposit");
  const { swapPath, minSharesOut } = await getPathDataAndMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain,
  );
  const walletClient = await getWalletClient(activeChain.id, activeConnector);

  let txHash;
  if (activeAccount.type === "sca" && sendUserOperation) {
    const { hash } = await sendUserOperation({
      uo: [
        {
          target: inputToken,
          data: encodeFunctionData({
            abi: [
              parseAbiItem(
                "function deposit(uint256 assets, uint256 minSharesOut, address receiver)",
              ),
            ],
            functionName: "deposit",
            args: [transactionAmount, minSharesOut, activeAccount.address],
          }),
        },
      ],
    });
    txHash = hash;
  } else if (!!walletClient) {
  txHash = await walletClient.writeContract({
    address: vaultData.id as Address,
    abi: [
      parseAbiItem(
        "function deposit(uint256 assets, uint256 minSharesOut, address receiver)",
      ),
    ],
    functionName: "deposit",
    args: [transactionAmount, minSharesOut, activeAccount.address],
    account: activeAccount.address,
    chain: walletClient.chain,
  });
}
  return { transactionHash: txHash };
};

// Helper function to generate a unique transaction ID (bytes32)
const generateTransactionId = (
  accountAddress: string,
  activeChain: Chain,
): `0x${string}` => {
  const timestamp = Date.now().toString(); // Current timestamp in milliseconds
  const randomValue = Math.floor(Math.random() * 100000).toString(); // Random number
  const inputString = `${accountAddress}-${activeChain.id}-${timestamp}-${randomValue}`;
  return keccak256(toUtf8Bytes(inputString)) as `0x${string}`;
};

const executeCrossChainDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  activeAccount: UseUserResult,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function,
  activeConnector?: Connector | null
) => {
  const walletClient = await getWalletClient(activeChain.id, activeConnector);
  if (!activeAccount || !walletClient) return { transactionHash: null };
  console.log("Executing Cross-Chain Deposit");
  const { swapPath, minSharesOut } = await getPathDataAndMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain,
  );

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain,
  );

  const nonEvmAddress = "0x";

  let contract, approveTx, receipt, payload, revertOptions;
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);

  payload = abiCoder.encode(
    [
      "address",
      "address",
      "uint256",
      "uint256",
      "uint16",
      "bytes",
      "bytes",
      "bytes32",
    ],
    [
      ZeroAddress,
      inputToken.address,
      0,
      minSharesOut,
      slippageValue,
      nonEvmAddress,
      swapPath,
      keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`,
    ],
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(
    ["string", "bytes", "address"],
    ["_crossChainDepositFailed", nonEvmAddress, activeAccount.address],
  );

  console.log("payload", payload);
  console.log("revertMessage", revertMessage);

  // Prepare revertOptions
  revertOptions = [
    contractWithdrawalReceiverAddress, // revertAddress
    true, // callOnRevert
    activeAccount.address, // abortAddress
    revertMessage as `0x${string}`, // revertMessage
    BigInt(1000000), // onRevertGasLimit
  ] as const;

  const data = encodeFunctionData({
    abi: [
      parseAbiItem(
        "function depositAndCall(address receiver, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
      ),
    ],
    functionName: "depositAndCall",
    args: [vaultData.id, payload, revertOptions],
  });
  // Case 1: Native token (ETH, BNB, etc.)
  if (inputToken.isNative) {
    console.log("Native token deposit detected");

    // console.log("depositTx", depositTx);
    const txHash = await walletClient.sendTransaction({
      account: activeAccount.address,
      data,
      value: transactionAmount,
      chain: activeChain,
      to: EVM_GATEWAY_ADDRESSES[activeChain.id],
    });

    console.log("txHash:", txHash);

    const publicClient = getPublicClient(activeChain.id);
    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      console.log("receipt:", receipt);

      return receipt;
    }
    console.log("Deposit executed");
    // setcrossChainTxId(transactionId);
    //console.log("Deposit executed");
    console.log("receipt", receipt);
    return { transactionHash: txHash };
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
    if (!walletClient?.chain) {
      console.log("failed to get chain from WalletClient.");
      return { transactionHash: null };
    }
    updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });
    try {
      const txHash = await walletClient.writeContract({
        address: EVM_GATEWAY_ADDRESSES[activeChain.id],
        abi: [
          parseAbiItem(
            "function depositAndCall(address receiver, uint256 amount, address asset, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
          ),
        ],
        functionName: "depositAndCall",
        args: [
          vaultData.id,
          transactionAmount,
          inputToken.address,
          payload,
          revertOptions,
        ],
        chain: walletClient.chain,
        account: activeAccount.address,
      });

      console.log("depositAndCall txHash:", txHash);

      const publicClient = getPublicClient(activeChain.id);
      if (!publicClient) {
        console.warn(`Failed to get ${activeChain.id}.`);
        setcrossChainTxId(transactionId);
        return { transactionHash: txHash };
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status === "success") {
        console.log("depositAndCall success", receipt);
      } else {
        console.log("depositAndCall failed", receipt);
      }
      setcrossChainTxId(transactionId);
      return receipt;
    } catch (error) {
      console.log("failed depositAndCall:", error);
      return { transactionHash: null };
    }
  }
};

const executeSolanaDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  walletContext: WalletContextState,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function,
) => {
  console.log("Executing Cross-Chain Deposit");
  const { swapPath, minSharesOut } = await getPathDataAndMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain,
  );
  console.log("swapPath", swapPath);
  console.log("minSharesOut", minSharesOut);
  const walletAddress = walletContext.publicKey!.toBase58();

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(walletAddress, activeChain);

  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);
  const wallet = {
    publicKey: walletContext.publicKey,
    signTransaction: walletContext.signTransaction,
    signAllTransactions: walletContext.signAllTransactions,
  } as Wallet;
  const client = new SolanaZetaClient(wallet);
  updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });
  const solanaWalletAddress = new TextEncoder().encode(
    walletContext.publicKey!.toBase58(),
  );

  if (inputToken.isNative) {
    // Case 1: Native token (ETH, BNB, etc.)
    const args = {
      types: [
        "address",
        "address",
        "uint256",
        "uint256",
        "uint16",
        "bytes",
        "bytes",
        "bytes32",
      ],
      values: [
        ZeroAddress,
        getSolanaEVMAddress(inputToken.address),
        0,
        minSharesOut,
        slippageValue,
        solanaWalletAddress,
        swapPath,
        keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`,
      ],
    };
    const txHash = await client.solanaDepositAndCall(
      Number(transactionAmount),
      vaultData.id,
      args,
    );
    //console.log("Deposit executed");
    setcrossChainTxId(transactionId);
    return { transactionHash: txHash };
  } else {
    // Case 2: SPL token
    const evmAddress = getSolanaEVMAddress(inputToken.address);
    const args = {
      types: [
        "address",
        "address",
        "uint256",
        "uint256",
        "uint16",
        "bytes",
        "bytes",
        "bytes32",
      ],
      values: [
        ZeroAddress,
        evmAddress,
        0,
        minSharesOut,
        slippageValue,
        solanaWalletAddress,
        swapPath,
        keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`,
      ],
    };
    //console.log("SPL token deposit detected");
    const txHash = await client.depositSplTokenAndCall(
      inputToken.address,
      Number(transactionAmount),
      vaultData.id,
      args,
    );
    //console.log("Deposit executed");
    setcrossChainTxId(transactionId);
    return { transactionHash: txHash };
  }
};

export const executeSolanaWithdrawal = async (
  vaultData: VaultData,
  walletContext: WalletContextState,
  activeChain: Chain,
  withdrawAssetAmount: bigint,
  splMint: string,
  withdrawZRC20: Token,
  setcrossChainTxId: Function,
) => {
  console.log("Executing Solana Cross-Chain Withdrawal");
  const { swapPath, minAmountOut } = await getPathDataAndMinAmountOut(
    vaultData,
    withdrawZRC20,
    withdrawAssetAmount,
  );
  const solanaWalletAddress = new TextEncoder().encode(
    walletContext.publicKey!.toBase58(),
  );
  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    walletContext.publicKey!.toBase58(),
    activeChain,
  );

  const slippage = getCurrentSlippage();

  const slippageValue = (slippage * 100).toFixed(0);

  const wallet = {
    publicKey: walletContext.publicKey,
    signTransaction: walletContext.signTransaction,
    signAllTransactions: walletContext.signAllTransactions,
  } as Wallet;
  const client = new SolanaZetaClient(wallet);

  // Prepare payload (calldata to pass to the receiver)
  const args = {
    types: [
      "address",
      "address",
      "uint256",
      "uint256",
      "uint16",
      "bytes",
      "bytes",
      "bytes32",
    ],
    values: [
      withdrawZRC20.address,
      getSolanaEVMAddress(splMint),
      withdrawAssetAmount,
      minAmountOut,
      slippageValue,
      solanaWalletAddress,
      swapPath,
      keccak256(toUtf8Bytes("WithdrawInitiated")) as `0x${string}`,
    ],
  };

  updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });

  const txHash = await client.solanaWithdrawal(vaultData.id, args);
  console.log("Withdrawal executed");
  setcrossChainTxId(transactionId);
  return { transactionHash: txHash };
};

export const executeWithdrawal = async (
  vaultData: VaultData,
  walletContext: WalletContextState,
  activeAccount: UseUserResult,
  activeChain: Chain,
  withdrawAssetAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Token,
  setcrossChainTxId: Function,
  sendUserOperation: Function,
  activeConnector?: Connector | null
) => {
  console.log("Executing Withdrawal");
  console.log("To chain ID:", activeChain.id);
  if (activeChain.id == CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectWithdrawal(
      vaultData,
      activeAccount,
      activeChain,
      withdrawAssetAmount,
      sendUserOperation,
      activeConnector
    );
  } else if (activeChain.id == CHAIN_ID.solana) {
    console.log("Solana withdrawal detected");
    return executeSolanaWithdrawal(
      vaultData,
      walletContext,
      activeChain,
      withdrawAssetAmount,
      withdrawERC20,
      withdrawZRC20,
      setcrossChainTxId,
    );
  } else {
    return executeCrossChainWithdrawal(
      vaultData,
      activeAccount,
      activeChain,
      withdrawAssetAmount,
      withdrawERC20,
      withdrawZRC20,
      setcrossChainTxId,
      activeConnector
    );
  }
};

const executeDirectWithdrawal = async (
  vaultData: VaultData,
  activeAccount: UseUserResult,
  activeChain: Chain,
  withdrawAssetAmount: bigint,
  sendUserOperation: Function,
  activeConnector?: Connector | null
) => {
  //vaultId: string
  const { swapPath, minAmountOut } = await getPathDataAndMinAmountOut(
    vaultData,
    vaultData.inputToken,
    withdrawAssetAmount,
  );
  const walletClient = await getWalletClient(activeChain.id, activeConnector);

  if (
    ((!walletClient || !walletClient.chain) && !sendUserOperation) ||
    !activeAccount?.address
  ) {
    console.log("Failet go get WalletClient.");
    return { transactionHash: null };
  }
  console.log(walletClient?.chain, "walletClient.chain");
  let txHash;
  if (activeAccount?.type === "sca" && sendUserOperation) {
    const { hash } = await sendUserOperation({
      uo: [
        {
          target: vaultData.id,
          data: encodeFunctionData({
            abi: [
              parseAbiItem(
                "function withdraw(uint256 assets, uint256 minimumOut, address receiver, address owner)",
              ),
            ],
            functionName: "withdraw",
            args: [
              withdrawAssetAmount,
              minAmountOut,
              activeAccount?.address,
              activeAccount?.address,
            ],
          }),
        },
      ],
    });
    txHash = hash;
  } else if (walletClient) {
    txHash = await walletClient.writeContract({
      address: vaultData.id,
      abi: [
        parseAbiItem(
          "function withdraw(uint256 assets, uint256 minimumOut, address receiver, address owner)",
        ),
      ],
      functionName: "withdraw",
      args: [
        withdrawAssetAmount,
        minAmountOut,
        activeAccount?.address,
        activeAccount?.address,
      ],
      chain: walletClient.chain,
      account: activeAccount?.address,
    });
  }

  console.log("executeDirectWithdrawal txHash:", txHash);

  const publicClient = getPublicClient(activeChain.id);
  if (!publicClient) {
    console.warn(`failed to get publicClient for chain id: ${activeChain.id}.`);
    return { transactionHash: null };
  }

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  if (receipt.status === "success") {
    console.log("tx success", receipt);
  } else {
    console.log("tx failed.", receipt);
  }

  return receipt;
};

const executeCrossChainWithdrawal = async (
  vaultData: VaultData,
  activeAccount: UseUserResult,
  activeChain: Chain,
  withdrawAssetAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Token,
  setcrossChainTxId: Function,
  activeConnector?: Connector | null
) => {
  const walletClient = await getWalletClient(activeChain.id, activeConnector);
  if (!activeAccount || !walletClient) return { transactionHash: null };
  //console.log("Executing Cross-Chain Withdrawal");
  const { swapPath, minAmountOut } = await getPathDataAndMinAmountOut(
    vaultData,
    withdrawZRC20,
    withdrawAssetAmount,
  );

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain,
  );

  const slippage = getCurrentSlippage();
  const nonEvmAddress = "0x";
  const slippageValue = (slippage * 100).toFixed(0);
  const payload = encodeAbiParameters(
    [
      { type: "address" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint16" },
      { type: "bytes" },
      { type: "bytes" },
      { type: "bytes32" },
    ],
    [
      withdrawZRC20.address,
      withdrawERC20,
      withdrawAssetAmount,
      minAmountOut,
      Number(slippageValue),
      nonEvmAddress,
      swapPath,
      keccak256(toUtf8Bytes("WithdrawInitiated")) as `0x${string}`,
    ],
  ) as `0x${string}`;
  const revertMessage = abiCoder.encode(
    ["string", "bytes32", "address"],
    ["_crossChainWithdrawFailed", transactionId, activeAccount.address],
  );

  const revertOptions = [
    contractWithdrawalReceiverAddress, // revertAddress
    false, // callOnRevert
    activeAccount.address, // abortAddress
    revertMessage as `0x${string}`, // revertMessage
    BigInt(1000000), // onRevertGasLimit
  ] as const;

  updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });
  // const txOptions = {
  //   gasLimit: BigInt(1000000), // Example value, update as needed
  //   gasPrice: BigInt(100000), // This will have to change depending on the chain
  // };

  try {
    const txHash = await walletClient.writeContract({
      address: EVM_GATEWAY_ADDRESSES[activeChain.id],
      abi: [
        parseAbiItem(
          "function call(address receiver, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
        ),
      ],
      functionName: "call",
      args: [vaultData.id, payload, revertOptions],
      chain: activeChain,
      account: activeAccount.address,
    });

    const publicClient = getPublicClient(activeChain.id);
    if (!publicClient) {
      console.warn(`failed to get public client ${activeChain.id}.`);
      return { transactionHash: null };
    }

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    if (receipt.status === "success") {
      console.log("call success", receipt);
    } else {
      console.log("tx failed:", receipt);
    }
    setcrossChainTxId(transactionId);
    return receipt;
  } catch (error) {
    console.log("error call tx:", error);
    return { transactionHash: null };
  }
};

export const fetchUserVaultBalance = async (
  userAddress: string,
  vaultAddress: string,
  decimals: number,
) => {
  const vaultAbi = [
    {
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "convertToAssets",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "shares", type: "uint256" }],
      outputs: [{ name: "assets", type: "uint256" }],
    },
  ] as const;

  const publicClient = getPublicClient(SUPPORTED_CHAINS[0].chain.id);
  if (!publicClient) {
    console.log(
      `Failed to fetch public client for chai id ID ${SUPPORTED_CHAINS[0].chain.id}`,
    );
    return null;
  }

  try {
    const shares = await publicClient.readContract({
      address: vaultAddress,
      abi: vaultAbi,
      functionName: "balanceOf",
      args: [userAddress],
    });

    const balanceInAssets = await publicClient.readContract({
      address: vaultAddress,
      abi: vaultAbi,
      functionName: "convertToAssets",
      args: [shares],
    });

    return formatUnits(balanceInAssets, decimals);
  } catch (error) {
    return null;
  }
};

export const fetchUserVaultMaxRedeem = async (
  decimals: number,
  userAddress: Address,
  vaultAddress: Address,
) => {
  const maxRedeemAbi = [
    {
      name: "maxRedeem",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "owner", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const publicClient = getPublicClient(SUPPORTED_CHAINS[0].chain.id);
  if (!publicClient) {
    console.log(`Error get public client ${SUPPORTED_CHAINS[0].chain.id}`);
    return null;
  }

  try {
    const maxRedeemAmount = await publicClient.readContract({
      address: vaultAddress,
      abi: maxRedeemAbi,
      functionName: "maxRedeem",
      args: [userAddress],
    });

    return formatUnits(maxRedeemAmount, decimals);
  } catch (error) {
    console.log("Failed get maxRedeem:", error);
    return null;
  }
};

export const fetchUserVaultMaxWithdraw = async (
  decimals: number,
  userAddress: Address,
  vaultAddress: Address,
) => {
  console.log("🔍 Calling fetchUserVaultMaxWithdraw:", {
    userAddress,
    vaultAddress,
    decimals,
  });

  const publicClient = getPublicClient(SUPPORTED_CHAINS[0].chain.id);
  if (!publicClient) throw new Error("failed to get publicClient");
  const maxWithdraw = await publicClient.readContract({
    address: vaultAddress,
    abi: [parseAbiItem("function maxWithdraw(address) view returns (uint256)")],
    functionName: "maxWithdraw",
    args: [userAddress],
  });

  const formatted = formatUnits(maxWithdraw, decimals);
  console.log(
    `✅ maxWithdraw result: ${maxWithdraw.toString()} raw -> ${formatted} formatted`,
  );

  // Use formatUnits instead of Number conversion
  return formatted;
};

export const fetchTotalAssets = async (vaultAddress: Address) => {
  const vaultData = await apiService.api.getVaultData(vaultAddress);
  return vaultData.total_assets;
  // const contract = getContract({
  //   client,
  //   chain: SUPPORTED_CHAINS[0], // This will always be Zetachain, as it's a balance on the vault
  //   address: vaultAddress,
  // });
  // const balance = await readContract({
  //   contract,
  //   method: "function totalAssets() view returns (uint256)",
  // });
  // const decimals = await readContract({
  //   contract,
  //   method: "function decimals() view returns (uint8)",
  // });
  // return formatUnits(balance, decimals);
};

const beamConnection: IConnection = {
  host: "https://public-beam-backend-mainnet.codemelt.codes",
  headers: {
    "x-api-key": process.env.NEXT_PUBLIC_BEAM_API_KEY!,
  },
};

export const getBeamTokenId = async (
  tokenAddress: string,
): Promise<number | null> => {
  try {
    const response = await api.functional.api.currency.partners.getPartners(
      beamConnection,
      "7000",
    ); // hardcoded for ZC

    const data = response.data as {
      data: { address: string; id: number }[];
    };

    const token = data.data.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase(),
    );
    return token?.id ?? null;
  } catch (err) {
    console.log("Failed to fetch token ID:", err);
    return null;
  }
};

export const getPathDataAndAmountOut = async (
  amount: bigint,
  inputToken: Token,
  outputToken: Token,
  userAddress: string,
  slippage: Number,
): Promise<{ encodedPath: `0x${string}` | null; amountOut: bigint }> => {
  console.log("inputToken address:", inputToken.address);
  console.log("outputToken address:", outputToken.address);
  const [inputTokenId, outputTokenId] = await Promise.all([
    getBeamTokenId(inputToken.address),
    getBeamTokenId(outputToken.address),
  ]);

  if (!inputTokenId || !outputTokenId) {
    console.warn("❌ Missing Beam token ID(s)");
    return { encodedPath: null, amountOut: BigInt(0) };
  }

  const swapDetails: swap.native.getSwapData.Input = {
    tokenAId: inputTokenId,
    tokenBId: outputTokenId,
    slippage: Number(slippage), // e.g. 500 for 0.5%
    amount: formatUnits(amount, inputToken.decimals), // ✅ string with decimals
    sender: userAddress,
    recipient: userAddress,
  };

  try {
    console.log("🚀 Fetching Beam quote...");
    const beamQuote = (await swap.native.getSwapData(
      beamConnection,
      swapDetails,
    )) as {
      data?: {
        data?: {
          path?: string[];
          expectedAmountOut?: number;
        };
      };
    };
    console.log("✅ Beam quote fetched successfully:", beamQuote);
    const path = beamQuote.data?.data?.path;
    const expectedAmountOut = beamQuote.data?.data?.expectedAmountOut;
    if (expectedAmountOut == null) {
      throw new Error("Beam quote is missing expectedAmountOut");
    }

    if (!path || !Array.isArray(path) || path.length < 2) {
      throw new Error("Beam quote returned invalid path");
    }

    const encodedPath = solidityPacked(
      Array(path.length).fill("address"),
      path,
    ) as `0x${string}`;

    console.log("✅ Encoded path:", encodedPath);
    console.log("✅ Expected amount out:", expectedAmountOut);

    const amountOutRaw = (
      expectedAmountOut *
      10 ** outputToken.decimals
    ).toFixed(0);
    return {
      encodedPath,
      amountOut: BigInt(amountOutRaw),
    };
  } catch (e: any) {
    console.log("❌ Beam swap fetch failed:", e.message || e);
    return { encodedPath: null, amountOut: BigInt(0) };
  }
};

export const getSharesFromDeposit = async (
  amount: bigint,
  vaultData: VaultData,
) => {
  const previewDepositAbi = [
    {
      inputs: [{ name: "assets", type: "uint256" }],
      name: "previewDeposit",
      outputs: [{ name: "shares", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const publicClient = getPublicClient(SUPPORTED_CHAINS[0].chain.id);

  if (!publicClient) {
    const errorMsg = `can't get publicClient for chain with id: ${SUPPORTED_CHAINS[0].chain.id}`;
    console.log(errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const sharesAsBigInt = await publicClient.readContract({
      address: vaultData.id,
      abi: previewDepositAbi,
      functionName: "previewDeposit",
      args: [amount],
    });

    const formattedShares = formatUnits(
      sharesAsBigInt,
      vaultData.inputToken.decimals,
    );

    console.log("'shares' (bigint):", sharesAsBigInt);
    console.log("formatted 'shares':", formattedShares);

    return formattedShares;
  } catch (e) {
    return "0";
  }
};

export const getAssetsFromShares = async (
  amount: bigint,
  vaultData: VaultData,
  chainId: number,
) => {
  const previewRedeemAbi = [
    {
      inputs: [{ name: "shares", type: "uint256" }],
      name: "previewRedeem",
      outputs: [{ name: "assets", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  const publicClient = getPublicClient(chainId);

  if (!publicClient) {
    console.log(`error get publicClient  for chain with ID ${chainId}`);
    return 0n;
  }

  try {
    const result = await publicClient.readContract({
      address: vaultData.id,
      abi: previewRedeemAbi,
      functionName: "previewRedeem",
      args: [amount],
    });

    //console.log("result", result);
    return result;
  } catch (e) {
    //console.log("Error reading contract:", e);
    return BigInt("0");
  }
};

export const getPerformanceFee = async (vaultId: Address, chainId: number) => {
  const publicClient = getPublicClient(chainId);
  if (!publicClient) return 1;
  const abi = [
    {
      type: "function",
      name: "perfFee",
      stateMutability: "view",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "uint16",
          internalType: "uint16",
        },
      ],
    },
  ] as const;

  const perfFee = await publicClient.readContract({
    address: vaultId,
    abi: abi,
    functionName: "perfFee",
  });

  return perfFee;
};

export const updatePythPrices = async () => {};

export async function fetchReceiptTokens(
  vaults: VaultData[],
): Promise<Record<string, string>> {
  const CACHE_KEY = RECEIPT_LOCAL_STORAGE_KEY;
  let cache: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) cache = JSON.parse(raw);
  } catch {}

  const missingIds = vaults.map((v) => v.id).filter((id) => !(id in cache));

  if (missingIds.length === 0) {
    return cache;
  }

  const toFetch = vaults.filter((v) => missingIds.includes(v.id));

  const groups = toFetch.reduce(
    (acc, v) => {
      (acc[v.protocol.chainId] ??= []).push(v);
      return acc;
    },
    {} as Record<number, VaultData[]>,
  );

  const receiptIface = new Interface([
    "function receiptToken() view returns (address)",
  ]);
  const mcIface = new Interface(multicall3Abi);
  const result: Record<string, string> = {};

  for (const [chainIdStr, group] of Object.entries(groups)) {
    const chainId = Number(chainIdStr);
    const rpcUrl = getRpcUrl(chainConfigs[chainId]);
    if (!rpcUrl) continue;
    const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
    const mcAddr = MULTICALL_ADDRS[chainId]?.address;
    const receiptTokenAbi = [
      {
        name: "receiptToken",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
      },
    ] as const;

    if (group.length > 1 && mcAddr) {
      const calls = group.map((v) => ({
        target: v.protocol.strategyAddress,
        allowFailure: true,
        callData: receiptIface.encodeFunctionData("receiptToken", []),
      }));
      const data = await provider.call({
        to: mcAddr,
        data: mcIface.encodeFunctionData("aggregate3", [calls]),
      });
      const [rows] = mcIface.decodeFunctionResult("aggregate3", data) as any;

      group.forEach((v, i) => {
        const r = rows[i];
        result[v.id] = r.success
          ? ethers.getAddress(hexDataSlice(r.returnData, 12))
          : ethers.ZeroAddress;
      });
    } else {
      for (const v of group) {
        try {
          const publicClient = getPublicClient(chainId);
          if (!publicClient) {
            console.log(
              `Failed to get public client for chain id: ${chainId}`,
            );
            result[v.id] = ethers.ZeroAddress;
            continue;
          }
          const receiptTokenAddress = await publicClient.readContract({
            address: v.protocol.strategyAddress,
            abi: receiptTokenAbi,
            functionName: "receiptToken",
          });
          result[v.id] = receiptTokenAddress;
        } catch {
          result[v.id] = ethers.ZeroAddress;
        }
      }
    }
  }

  const updatedCache = { ...cache, ...result };
  localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
  return updatedCache;
}
