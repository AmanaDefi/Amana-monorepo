import { client } from "../utils/client";
import {
  CHAIN_ID,
  crossChainTxUrl,
  SUPPORTED_CHAINS,
  EVM_GATEWAY_ADDRESSES,
  chainConfigs,
  MULTICALL_ADDRS,
} from "../constants/chainConfig";
import { ethers, getAddress, Interface } from "ethers";

import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import beefyVaultABI from "../../abis/beefyVaultABI.json";
import curvePoolABI from "../../abis/curvePoolABI.json";
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
  prepareEncodeFunctionData,
  Chain,
  keccak256,
  Address,
} from "viem";
import {
  getCurrentSlippage,
  isZetachain,
  getSolanaEVMAddress,
} from "@/utils/utils";
import {
  baseProvider,
  ethereumProvider,
  arbitrumProvider,
} from "../utils/providers";

import * as dotenv from "dotenv";
import { Token, VaultData } from "@/types/types";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { SolanaZetaClient } from "@/lib/solanaGateway/cli/scripts";
import { Wallet } from "@coral-xyz/anchor";
import axios from "axios";
import { swap } from "codemelt-retro-api-sdk/functional/api";
import api from "codemelt-retro-api-sdk";

import type { IConnection } from "codemelt-retro-api-sdk";
import { apiService } from "@/service";
import { trackEvent } from "@/utils/trackEvent";
import multicall3Abi from "../../abis/multicall3ABI.json";
import { hexDataSlice } from "@ethersproject/bytes";
import { RECEIPT_LOCAL_STORAGE_KEY } from "@/constants";
import { updateLocalStorageObject } from "@/utils/localStorageUtils";
import { GetUserResult } from "@account-kit/core";
import { UseUserResult } from "@account-kit/react";
import { getContractCustom } from "@/utils/getContractCustom";
import {
  getPublicClient,
  getRpcUrl,
  getWalletClient,
} from "@/utils/getPublicClient";

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
  const receiptTokenContract = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress,
  });
  const poolAddress = await readContract({
    contract: receiptTokenContract,
    method: "function minter() view returns (address)",
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
    console.error("Error calculating APY for Eddy Finance:", error);
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
    console.error("Error calculating APY for Eddy Finance:", error);
    return 0;
  }
}

export async function calculateAaveAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const rpcUrl = strategyChain.rpc;
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
  const aaveLendingPool = getContract({
    client,
    chain: strategyChain,
    address: poolAddress,
  });

  const reserveData = await readContract({
    contract: aaveLendingPool,
    method:
      "function getReserveData(address) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128)",
    params: [underlyingAssetAddress as Address],
  });

  const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;

  // Get the liquidity rate (in Ray) and normalize it
  const liquidityRate = reserveData[2]; // Assuming this is the correct index for liquidity rate in reserveData
  const depositAPR = Number(liquidityRate) / 1e27;
  // Calculate APY using compounding
  const depositAPY =
    Math.pow(1 + depositAPR / SECONDS_IN_YEAR, SECONDS_IN_YEAR) - 1;

  return depositAPY;
}

export async function calculateAaveFlashAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
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
    address: poolAddress,
  });

  const reserveData = await readContract({
    contract: aaveLendingPool,
    method:
      "function getReserveData(address) view returns (uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16, address, address, address, address, uint128, uint128, uint128)",
    params: [underlyingAssetAddress as Address],
  });

  const SECONDS_IN_YEAR = 60 * 60 * 24 * 365;

  // Get the liquidity rate (in Ray) and normalize it
  const liquidityRate = Number(reserveData[2]); // Supply rate (Ray format)
  const depositAPR = liquidityRate / 1e27;
  const depositAPY =
    Math.pow(1 + depositAPR / SECONDS_IN_YEAR, SECONDS_IN_YEAR) - 1;

  // Get the variable borrow rate (Ray format)
  const variableBorrowRate = Number(reserveData[4]); // Borrow rate (Ray format)
  const borrowAPR = variableBorrowRate / 1e27;
  const borrowAPY =
    Math.pow(1 + borrowAPR / SECONDS_IN_YEAR, SECONDS_IN_YEAR) - 1;

  // Flash Loan Strategy: Using 5x leverage (borrowing $4 and using a $1 deposit)
  const leveragedAPY = 5 * depositAPY - 4 * borrowAPY;

  return leveragedAPY;
}

export async function calculateCurveAPY(
  poolAddress: Address,
  strategyChain: Chain,
) {
  let relevant_provider = baseProvider;
  if (strategyChain.id === 1) {
    relevant_provider = ethereumProvider;
  } else if (strategyChain.id === 42161) {
    relevant_provider = arbitrumProvider;
  }

  const curvePool = new ethers.Contract(
    poolAddress,
    curvePoolABI,
    relevant_provider,
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(await curvePool.get_virtual_price());
    // Fetch the current block number and determine the number of blocks for 7 days
    const currentBlockNumber = await relevant_provider.getBlockNumber();
    const averageBlockTimeInSeconds = BLOCK_TIME[strategyChain.id] ?? 12;
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds,
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await curvePool.get_virtual_price({ blockTag: pastBlockNumber }),
    );
    // Calculate the rate of change in the virtual price over 7 days
    const rateOfChange = ((currentPrice - pastPrice) * 10n ** 18n) / pastPrice;
    const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);

    // Calculate the annualized APY based on the 7-day change
    const depositAPY = Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;

    return depositAPY;
  } catch (error) {
    console.error("Error calculating APY for Curve:", error);
    return 0;
  }
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
  const rpcUrl = strategyChain.rpc;
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
  const extraRewardAddress = getAddress(extraAddrRaw || "");
  const virtualPrice = BigInt(results[3].returnData);

  const secondsPerYear = 365 * 24 * 60 * 60;
  const crvPerLpPerYear =
    (Number(crvRewardRate) / Number(totalSupply)) * secondsPerYear;

  const rewardPoolContract = getContract({
    client,
    address: convexRewardPool,
    chain: strategyChain,
  });

  try {
    // Step 2: CVX rewards via extraRewards
    let cvxPerTokenPerYear = 0;
    try {
      const extraRewardAddress: string = await readContract({
        contract: rewardPoolContract,
        method: "function extraRewards(uint256) view returns (address)",
        params: [BigInt(0)],
      });

      const extraRewardContract = getContract({
        client,
        address: extraRewardAddress,
        chain: strategyChain,
      });

      const cvxRewardRate: bigint = await readContract({
        contract: extraRewardContract,
        method: "function rewardRate() view returns (uint256)",
      });

      cvxPerTokenPerYear =
        (Number(cvxRewardRate) / Number(totalSupply)) * secondsPerYear;
    } catch (e) {
      console.warn("No CVX reward info found or failed to fetch extraRewards");
    }

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
    console.error("calculateConvexEthereumRewardsAPY failed:", error);
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

    const curvePool = getContract({
      client,
      chain: strategyChain,
      address: poolAddress,
    });
    const virtualPrice = await readContract({
      contract: curvePool,
      method: "function get_virtual_price() view returns (uint256)",
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
    console.error("CRV APY calculation failed:", err);
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
    console.error("calculateCombinedBalancerAPY failed:", error);
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
  const compoundVault = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress,
  });

  const secondsInAYear = 365 * 24 * 60 * 60;
  const currentUtilization = await readContract({
    contract: compoundVault,
    method: "function getUtilization() view returns (uint256)",
  });
  const currentSupplyRate = await readContract({
    contract: compoundVault,
    method: "function getSupplyRate(uint256) view returns (uint256)",
    params: [currentUtilization],
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
  compUsdPrice: number,
): Promise<number> {
  /*
  const cometContract = getContract({
    client,
    chain: strategyChain,
    address: cometAddress,
  });

  let baseTrackingSupplySpeed = await readContract({
    contract: cometContract,
    method: "function baseTrackingSupplySpeed() view returns (uint256)",
  });

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
    method:
      "function rewardConfig(address) view returns (address token, uint64 rescaleFactor, bool shouldUpscale)",
    params: [cometAddress],
  });
  const rescaleFactor = rewardConfig[1];
  const shouldUpscale = rewardConfig[2];
  // if (shouldUpscale) {
  //   baseTrackingSupplySpeed *= rescaleFactor
  // } else {
  //   baseTrackingSupplySpeed /= rescaleFactor
  // }

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
*/

  return Number(0.02); // TODO replace with proper value
}

export async function calculateVenusAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain,
) {
  const vToken = getContract({
    client,
    chain: strategyChain,
    address: receiptTokenAddress,
  });
  const blocksPerYear = 10512000;
  const supplyRatePerBlock = await readContract({
    contract: vToken,
    method: "function supplyRatePerBlock() view returns (uint256)",
  });
  const ratePerBlock = Number(supplyRatePerBlock) / 1e18;
  const currentAPY = (1 + ratePerBlock) ** blocksPerYear - 1;
  return Number(currentAPY);
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
) => {
  if (activeChain.id === CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectDeposit(
      vaultData,
      inputToken,
      activeAccount,
      activeChain,
      transactionAmount,
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
) => {
  //console.log("Executing DepositApprove");

  try {
    let contract = getContract({
      client,
      chain: activeChain,
      address: inputToken,
    });
    let spender;
    if (activeChain.id === 7000 || activeChain.id === 7001) {
      spender = vaultId;
    } else {
      spender = EVM_GATEWAY_ADDRESSES[activeChain.id];
    }
    const approveTx = prepareContractCall({
      contract,
      method: "function approve(address to, uint256 value)",
      params: [spender, transactionAmount],
    });
    await sendAndConfirmTransaction({
      account: activeAccount,
      transaction: approveTx,
    });
    trackEvent("Approve Confirmed", {
      vaultId,
      chainId: activeChain.id,
      chainName: activeChain.name,
      transactionAmount: transactionAmount.toString(),
      inputTokenSymbol: inputToken,
    });
    //console.log("Approval confirmed");
    return true;
  } catch (error: any) {
    return false;
  }
};

const getMinSharesOut = async (
  vaultData: VaultData,
  inputToken: Token,
  transactionAmount: bigint,
  activeChain: Chain,
) => {
  const inputTokenAddress = isZetachain(activeChain.id)
    ? inputToken?.address
    : inputToken?.ZRC20equivalent;

  let assetsToConvert = transactionAmount;

  if (inputTokenAddress !== vaultData.inputToken.address) {
    assetsToConvert = await getAmountOutFromSwap(
      transactionAmount,
      inputToken,
      vaultData.inputToken,
      vaultData.id as Address,
    );
  }

  const publicClient = getPublicClient(vaultData.protocol.chainId);
  if (!publicClient) {
    throw new Error(
      `Failed to get client for chain id: ${vaultData.protocol.chainId}`,
    );
  }

  const strategyAbi = [
    {
      name: "convertToShares",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "assets", type: "uint256" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const sharesOutForUnderlying = await publicClient.readContract({
    address: vaultData.protocol.strategyAddress,
    abi: strategyAbi,
    functionName: "convertToShares",
    args: [assetsToConvert],
  });

  const slippage = getCurrentSlippage();
  const slippageFactor = BigInt(10000 - slippage * 100);

  const minSharesOut =
    (sharesOutForUnderlying * slippageFactor) / BigInt(10000);

  return minSharesOut;
};

const getMinAmountOut = async (
  vaultId: string,
  transactionAmount: bigint,
  strategyAddress: Address,
  strategyChainId: number,
) => {
  const vaultAbi = [
    {
      name: "totalSupply",
      type: "function",
      stateMutability: "view",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const strategyAbi = [
    {
      name: "getStrategyWithdrawShareAmount",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "fraction", type: "uint256" }],
      outputs: [{ name: "", type: "uint256" }],
    },
    {
      name: "convertToAssets",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "shares", type: "uint256" }],
      outputs: [{ name: "", type: "uint256" }],
    },
  ] as const;

  const publicClient = getPublicClient(strategyChainId);

  if (!publicClient) {
    throw new Error("failed to get clients");
  }

  try {
    const vaultTotalSupply = await publicClient.readContract({
      address: vaultId,
      abi: vaultAbi,
      functionName: "totalSupply",
    });
    if (vaultTotalSupply === 0n) {
      return 0n;
    }
    const fractionOfTotalShares = (transactionAmount * BigInt(10**18)) / vaultTotalSupply;

    const strategyWithdrawShareAmount = await publicClient.readContract({
      address: strategyAddress,
      abi: strategyAbi,
      functionName: "getStrategyWithdrawShareAmount",
      args: [fractionOfTotalShares],
    });

    const amountOutForShares = await publicClient.readContract({
      address: strategyAddress,
      abi: strategyAbi,
      functionName: "convertToAssets",
      args: [strategyWithdrawShareAmount],
    });

    const slippage = getCurrentSlippage(); 
    const slippageFactor = BigInt(10000 - slippage * 100);
    const minAmountOut = (amountOutForShares * slippageFactor) / BigInt(10000);

    return minAmountOut;

  } catch (error) {
    console.error("error geet min amount out:", error);
    throw error; 
  }
};

const executeDirectDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  activeAccount: UseUserResult,
  activeChain: Chain,
  transactionAmount: bigint,
) => {
  //console.log("Executing Direct Deposit");
  const minSharesOut: bigint = await getMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain,
  );
  let contract = getContract({
    client,
    chain: activeChain,
    address: vaultData.id,
  });
  const supplyTx = prepareContractCall({
    contract,
    method:
      "function deposit(uint256 assets, uint256 minSharesOut, address receiver)",
    params: [transactionAmount, minSharesOut, activeAccount?.address],
  });
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: supplyTx,
  });
  return receipt;
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
) => {
  const walletClient = getWalletClient(activeChain.id);
  if (!activeAccount || !walletClient) return;
  //console.log("Executing Cross-Chain Deposit");
  const minSharesOut = await getMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain,
  );

  console.log("executeCrossChainDeposit", minSharesOut);

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain,
  );

  console.log("transactionId", transactionId);

  const nonEvmAddress = "0x";

  let contract, approveTx, receipt, payload, revertOptions;
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);

  // Prepare payload (calldata to pass to the receiver)

  const gatewayDepositAbi = [
    {
      type: "function",
      name: "depositAndCall",
      stateMutability: "payable",
      inputs: [
        { name: "receiver", type: "address" },
        { name: "payload", type: "bytes" },
        {
          name: "revertOptions",
          type: "tuple",
          components: [
            { name: "revertAddress", type: "address" },
            { name: "callOnRevert", type: "bool" },
            { name: "abortAddress", type: "address" },
            { name: "revertMessage", type: "bytes" },
            { name: "onRevertGasLimit", type: "uint256" },
          ],
        },
      ],
      outputs: [],
    },
  ] as const;

  payload = abiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes32"],
    [
      ZeroAddress,
      inputToken.address,
      0,
      minSharesOut,
      slippageValue,
      nonEvmAddress,
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

  const revertOptionsObject = {
    revertAddress: contractWithdrawalReceiverAddress,
    callOnRevert: true,
    abortAddress: activeAccount.address,
    revertMessage: revertMessage as `0x${string}`,
    onRevertGasLimit: BigInt(1000000),
  };

  // const txOptions = {
  //   gasLimit: 1000000, // Example value, update as needed
  //   gasPrice: 100000, // TODO - this will have to change, depending on the chain?
  // };

  // Case 1: Native token (ETH, BNB, etc.)
  if (inputToken.isNative) {
    console.log("Native token deposit detected");

    const data = encodeFunctionData({
      abi: gatewayDepositAbi,
      functionName: "depositAndCall",
      args: [vaultData.id, payload, revertOptionsObject],
    });

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
      address: EVM_GATEWAY_ADDRESSES[activeChain.id],
    });
    const depositTx = prepareContractCall({
      contract,
      method:
        "function depositAndCall(address receiver, uint256 amount, address asset, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
      params: [
        vaultData.id,
        transactionAmount,
        inputToken.address,
        payload,
        revertOptions,
      ],
    });
    console.log("depositTx", depositTx, "transactionId", transactionId);
    updateLocalStorageObject(vaultData.id, {
      depositTx,
      crossChainTxId: transactionId,
    });
    try {
      const receipt = await sendAndConfirmTransaction({
        account: activeAccount,
        transaction: depositTx,
        // ...txOptions,
      });

      console.log("Deposit executed");
      console.log("receipt", receipt);
      setcrossChainTxId(transactionId);
      return receipt;
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error; // Rethrow the error to allow upstream handling if needed
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
  //console.log("Executing Cross-Chain Deposit");
  const minSharesOut = await getMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain,
  );

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
  const depositorBytes = walletContext.publicKey!.toBytes();
  updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });

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
        "bytes32",
      ],
      values: [
        ZeroAddress,
        getSolanaEVMAddress(inputToken.address),
        0,
        minSharesOut,
        slippageValue,
        depositorBytes,
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
        "bytes32",
      ],
      values: [
        ZeroAddress,
        evmAddress,
        0,
        minSharesOut,
        slippageValue,
        depositorBytes,
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
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  walletContext: WalletContextState,
  activeChain: Chain,
  withdrawShareAmount: bigint,
  splMint: string,
  withdrawZRC20: Address,
  setcrossChainTxId: Function,
) => {
  //console.log("Executing Solana Cross-Chain Withdrawal");
  const minAmountOut = await getMinAmountOut(
    vaultId,
    withdrawShareAmount,
    strategyAddress,
    strategyChainId,
  );
  const depositorBytes = walletContext.publicKey!.toBytes();

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
      "bytes32",
    ],
    values: [
      withdrawZRC20,
      getSolanaEVMAddress(splMint),
      withdrawShareAmount,
      minAmountOut,
      slippageValue,
      depositorBytes,
      keccak256(toUtf8Bytes("WithdrawInitiated")) as `0x${string}`,
    ],
  };

  updateLocalStorageObject(vaultId, { crossChainTxId: transactionId });
  const txHash = await client.solanaWithdrawal(vaultId, args);
  //console.log("Withdrawal executed");
  setcrossChainTxId(transactionId);
  return { transactionHash: txHash };
};

export const executeWithdrawal = async (
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  walletContext: WalletContextState,
  activeAccount: UseUserResult,
  activeChain: Chain,
  withdrawShareAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Token,
  setcrossChainTxId: Function,
) => {
  if (activeChain.id == CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectWithdrawal(
      vaultId,
      strategyAddress,
      strategyChainId,
      activeAccount,
      activeChain,
      withdrawShareAmount,
    );
  } else if (activeChain.id == CHAIN_ID.solana) {
    return executeSolanaWithdrawal(
      vaultId,
      strategyAddress,
      strategyChainId,
      walletContext,
      activeChain,
      withdrawShareAmount,
      withdrawERC20,
      withdrawZRC20.address as Address,
      setcrossChainTxId,
    );
  } else {
    return executeCrossChainWithdrawal(
      vaultId,
      strategyAddress,
      strategyChainId,
      activeAccount,
      activeChain,
      withdrawShareAmount,
      withdrawERC20,
      withdrawZRC20,
      setcrossChainTxId,
    );
  }
};

const executeDirectWithdrawal = async (
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  activeAccount: Account,
  activeChain: Chain,
  withdrawShareAmount: bigint,
) => {
  //vaultId: string
  const minAmountOut = await getMinAmountOut(
    vaultId,
    withdrawShareAmount,
    strategyAddress,
    strategyChainId,
  );
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultId,
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function redeem(uint256 shares, uint256 minAmountOut, address receiver, address owner)",
    params: [
      withdrawShareAmount,
      minAmountOut,
      activeAccount?.address,
      activeAccount?.address,
    ],
  });
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: withdrawTx,
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
  withdrawZRC20: Token,
  setcrossChainTxId: Function,
) => {
  //console.log("Executing Cross-Chain Withdrawal");
  const minAmountOut = await getMinAmountOut(
    vaultId,
    withdrawShareAmount,
    strategyAddress,
    strategyChainId,
  );

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain,
  );
  const slippage = getCurrentSlippage();
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultId,
  });
  const nonEvmAddress = "0x";
  const slippageValue = (slippage * 100).toFixed(0);
  // Prepare payload (calldata to pass to the receiver)
  const payload = abiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes32"],
    [
      withdrawZRC20.address,
      withdrawERC20,
      withdrawShareAmount,
      minAmountOut,
      slippageValue,
      nonEvmAddress,
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
  // const txOptions = {
  //   gasLimit: BigInt(1000000), // Example value, update as needed
  //   gasPrice: BigInt(100000), // This will have to change depending on the chain
  // };

  // Get the Gateway contract to initiate the withdrawal
  contract = getContract({
    client,
    chain: activeChain,
    address: EVM_GATEWAY_ADDRESSES[activeChain.id],
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function call(address receiver, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
    params: [vaultId, payload, revertOptions],
  });

  updateLocalStorageObject(vaultId, { crossChainTxId: transactionId });
  try {
    const receipt = await sendTransaction({
      account: activeAccount,
      transaction: withdrawTx,
      // ...txOptions,
    });

    setcrossChainTxId(transactionId);
    return receipt;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error; // Rethrow the error for upstream handling
  }
};

export const fetchUserVaultBalance = async (
  userAddress: string,
  vaultAddress: string,
) => {
  const contract = getContractCustom({
    chainId: SUPPORTED_CHAINS[0].chain.id, // This will always be Zetachain, as it's a balance on the vault
    address: vaultAddress,
    abi: "",
  });
  const { value: shares, decimals } = await getBalance({
    contract,
    address: userAddress,
  });
  //console.log("shares", shares);
  //console.log("decimals", decimals);
  const balance = await readContract({
    contract,
    method: "function convertToAssets(uint256) view returns (uint256)",
    params: [shares],
  });
  //console.log("balance", balance);
  return formatUnits(balance, decimals);
};

export const fetchUserVaultMaxRedeem = async (
  decimals: number,
  userAddress: Address,
  vaultAddress: Address,
) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // Always Zetachain
    address: vaultAddress,
  });

  const maxRedeem = await readContract({
    contract,
    method: "function maxRedeem(address) view returns (uint256)",
    params: [userAddress],
  });

  // Use formatUnits instead of Number conversion
  return formatUnits(maxRedeem, decimals);
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
  host: "https://public-beam-backend-mainnet.codemelt.codes", // Replace with actual Beam API host
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
    console.error("Failed to fetch token ID:", err);
    return null;
  }
};

export const getAmountOutFromSwap = async (
  amount: bigint,
  inputToken: Token,
  outputToken: Token,
  userAddress: string,
): Promise<bigint> => {
  // const BeamApi = require('codemelt-retro-api-sdk/functional/api');

  const sourceChainId = 7000;
  const destinationChainId = 7000;
  const inputTokenAddress = inputToken.address;
  const outputTokenAddress = outputToken.address;

  // Step 1: Get Beam token IDs
  const [inputTokenId, outputTokenId] = await Promise.all([
    getBeamTokenId(inputTokenAddress),
    getBeamTokenId(outputTokenAddress),
  ]);

  const swapDetails: swap.native.getSwapData.Input = {
    tokenAId: inputTokenId,
    tokenBId: outputTokenId,
    slippage: 500,
    amount: Number(amount) / 10 ** inputToken.decimals,
    sender: userAddress,
    recipient: userAddress,
  };
  // Step 2: If both token IDs are found, try Beam API first
  if (inputTokenId && outputTokenId) {
    try {
      //console.log("🚀 Getting quote from Beam API...");
      const beamQuote = await swap.native.getSwapData(
        beamConnection,
        swapDetails,
      );

      if (!beamQuote.success) {
        //console.warn("⚠️ Beam quote unsuccessful, falling back to Eddy");
      } else if (
        !beamQuote.data ||
        !beamQuote.data.status ||
        !beamQuote.data.data
      ) {
        /*console.warn(
          "⚠️ Beam quote returned invalid structure:",
          beamQuote.data?.message || "Unknown error",
        );*/
      } else {
        const quoteAmount = beamQuote.data.data.expectedAmountOut;

        if (quoteAmount > 0) {
          //console.log("✅ Beam quote found");
          const quoteAmountRaw = (
            quoteAmount *
            10 ** outputToken.decimals
          ).toFixed(0);
          return BigInt(quoteAmountRaw);
        }

        //console.warn("⚠️ Beam quote returned zero amount");
      }
    } catch (e: any) {
      /*console.warn(
        "⚠️ Beam quote threw error, falling back to Eddy:",
        e.message || e,
      );*/
    }

    // Step 3: Fallback to Eddy
    try {
      //console.log("🌐 Trying Eddy as fallback...");
      const eddyQuote = await sdk.bridge.getQuoteForBridge({
        inputTokenAddress: inputToken.address,
        outputTokenAddress: outputToken.address,
        sourceChainId: sourceChainId,
        destinationChainId: destinationChainId,
        amount: amount.toString(),
        slippage: 0.5,
      });

      //console.log("✅ Eddy quote found");
      return BigInt(eddyQuote.quoteAmount);
    } catch (e) {
      console.error("❌ Eddy quote failed:", e);
      return BigInt(0);
    }
  }
  // 🛠️ Final catch-all return
  console.warn(
    "❌ Could not get Beam token IDs or all fallback methods failed",
  );
  return BigInt(0);
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
    console.error(errorMsg);
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
    console.error(`error get publicClient  for chain with ID ${chainId}`);
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

  console.log(vaultId, chainId)
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
          const chain = defineChain(chainId);
          const contract = getContract({
            client,
            chain,
            address: v.protocol.strategyAddress,
          });
          const receipt = await readContract({
            contract,
            method: "function receiptToken() view returns (address)",
          });
          result[v.id] = receipt as string;
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
