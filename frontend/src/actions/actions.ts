import {
  Address,
  getContract,
  prepareContractCall,
  sendAndConfirmTransaction,
  sendTransaction,
  readContract,
  defineChain,
} from "thirdweb";
import { client } from "../utils/client";
import {
  CHAIN_ID,
  crossChainTxUrl,
  SUPPORTED_CHAINS,
  zeroSolAddress,
  EVM_GATEWAY_ADDRESSES,
} from "../constants/chainConfig";
import { Account } from "thirdweb/wallets";
import { getBalance, withdraw } from "thirdweb/extensions/erc20";
import { ethers, JsonRpcProvider } from "ethers";
import { solidityPacked } from "ethers";
import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import beefyVaultABI from "../../abis/beefyVaultABI.json";
import curvePoolABI from "../../abis/curvePoolABI.json";
import convexRewardPoolABI from "../../abis/convexRewardPoolABI.json";
import IBalancerStablePoolABI from "../../abis/IBalancerStablePoolABI.json";
import IBalancerLiquidityGaugeABI from "../../abis/IBalancerLiquidityGauge.json";
import IERC20MetadataABI from "../../abis/IERC20MetadataABI.json";

import { Chain } from "thirdweb";
import { toUtf8Bytes, ZeroAddress, AbiCoder } from "ethers";
import { keccak256 } from "thirdweb";
const Nori = require("nori-sdk").Nori;
const sdk = new Nori();
import { formatUnits } from "viem";
import {
  getCurrentSlippage,
  isZetachain,
  getSolanaEVMAddress,
} from "@/utils/utils";
import { ZRC20_TOKENS_BY_ADDRESS } from "../constants/ZRC20TokensByAddress";
import { calculateGasFeeInVaultAsset, convertGasFeeToInputToken } from "../utils/gasFeeCalculations";

// import { fetchEthPrice } from "@/utils/utils";

import * as dotenv from "dotenv";
import { Token, VaultData } from "@/types/types";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { SolanaZetaClient } from "@/lib/solanaGateway/cli/scripts";
import { Wallet } from "@coral-xyz/anchor";
import axios from "axios";
import { swap } from "codemelt-retro-api-sdk/functional/api";
import api from "codemelt-retro-api-sdk";

import type { IConnection } from 'codemelt-retro-api-sdk';
import { ApiService } from "@/service";
import { read } from "fs";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { trackEvent } from "@/utils/trackEvent";

dotenv.config();
const provider = new JsonRpcProvider(
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE
);
const provider_ethereum = new JsonRpcProvider(
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ETH
);

const abiCoder = new AbiCoder();

const isTestnet = process.env.NEXT_PUBLIC_DEPLOY_ENV === 'testnet';
const contractWithdrawalReceiverAddress = (isTestnet ? process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS_TESTNET : process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS) as `0x${string}`

// To do - move this to chainConfig
const BLOCK_TIME: { [chainId: number]: number } = {
  1: 12,     // Ethereum
  137: 2,    // Polygon
  8453: 2,   // Base
  42161: 0.250, // Arbitrum
};

export async function calculateEddyAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain
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
    provider
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(
      await eddyFinancePool.get_virtual_price()
    );

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await provider.getBlockNumber();
    const averageBlockTimeInSeconds = 5; // Adjust this based on the average block time for Eddy Finance
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await eddyFinancePool.get_virtual_price({ blockTag: pastBlockNumber })
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
  strategyChain: Chain
) {
  const beefyVault = new ethers.Contract(
    receiptTokenAddress,
    beefyVaultABI,
    provider
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(
      await beefyVault.getPricePerFullShare()
    );

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await provider.getBlockNumber();
    const averageBlockTimeInSeconds = 2; // Adjust this based on the average block time for Eddy Finance
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await beefyVault.getPricePerFullShare({ blockTag: pastBlockNumber })
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
  strategyChain: Chain
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
  const liquidityRate = reserveData[2]; // Assuming this is the correct index for liquidity rate in reserveData
  const depositAPR = Number(liquidityRate) / 1e27;
  // Calculate APY using compounding
  const depositAPY =
    Math.pow(1 + depositAPR / SECONDS_IN_YEAR, SECONDS_IN_YEAR) - 1;

  return depositAPY;
}

export async function calculateAaveFlashAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain
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

export async function calculateCurveAPY(poolAddress: Address, strategyChain: Chain) {
  let relevant_provider = provider;
  if (strategyChain.id === 1) {
    relevant_provider = provider_ethereum;
  } else if (strategyChain.id === 42161) {
    relevant_provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ARBITRUM_ONE);
  }
  const curvePool = new ethers.Contract(
    poolAddress,
    curvePoolABI,
    relevant_provider
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(await curvePool.get_virtual_price());
    // Fetch the current block number and determine the number of blocks for 7 days
    const currentBlockNumber = await relevant_provider.getBlockNumber();
    const averageBlockTimeInSeconds = BLOCK_TIME[strategyChain.id] ?? 12;
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(
      secondsIn7Days / averageBlockTimeInSeconds
    );
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    // Fetch the virtual price from 7 days ago
    const pastPrice = ethers.toBigInt(
      await curvePool.get_virtual_price({ blockTag: pastBlockNumber })
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
  ethTokenPrice: number
): Promise<number> {
  const secondsPerYear = 365 * 24 * 60 * 60;
  const rewardPoolContract = getContract({
    client,
    address: convexRewardPool,
    chain: strategyChain,
  });

  try {
    // Step 1: CRV rewards
    const crvRewardRate: bigint = await readContract({
      contract: rewardPoolContract,
      method: "function rewardRate() view returns (uint256)",
    });

    const totalSupply: bigint = await readContract({
      contract: rewardPoolContract,
      method: "function totalSupply() view returns (uint256)",
    });

    const crvPerLpPerYear =
      (Number(crvRewardRate) / Number(totalSupply)) * secondsPerYear;

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

    // Step 3: LP token price
    const curvePool = getContract({
      client,
      chain: strategyChain,
      address: poolAddress,
    });

    const virtualPrice: bigint = await readContract({
      contract: curvePool,
      method: "function get_virtual_price() view returns (uint256)",
    });

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
  ethTokenPrice: number
): Promise<number> {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ARBITRUM_ONE);

  const rewardPool = new ethers.Contract(convexRewardPool, convexRewardPoolABI, provider);

  try {
    const currentRewards = await rewardPool.rewards(0);
    const currentRewardsIntegral: bigint = ethers.toBigInt(currentRewards.reward_integral);
    // Fetch the current block number and determine the number of blocks for 7 days
    const currentBlockNumber = await provider.getBlockNumber();
    const averageBlockTimeInSeconds = BLOCK_TIME[strategyChain.id] ?? 12;
    const secondsIn7Days = 7 * 24 * 60 * 60;
    const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
    const pastBlockNumber = currentBlockNumber - blocksIn7Days;

    const pastRewards = await rewardPool.rewards(0, { blockTag: pastBlockNumber });
    const pastRewardsIntegral: bigint = ethers.toBigInt(pastRewards.reward_integral);

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
    const lpPriceInUSD = inputToken.symbol === "ETH.ETH"
      ? lpPriceInInput * ethTokenPrice
      : lpPriceInInput;

    const crvApy = (Number(annualCrvPerToken) / 1e20) * crvTokenPrice / lpPriceInUSD;
    console.log("CRV APY:", crvApy);
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
  strategyChain
}: {
  receiptTokenAddress: Address;
  liquidityGaugeAddress: Address;
  rewardTokenAddress: Address;
  inputTokenAddress: Address;
  opTokenPrice: number;
  strategyChain: Chain;
}): Promise<{ baseAPY: number; rewardsAPY: number; totalAPY: number }> {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE);

  const stablePool = new ethers.Contract(
    receiptTokenAddress,
    IBalancerStablePoolABI,
    provider
  );

  const gauge = new ethers.Contract(
    liquidityGaugeAddress,
    IBalancerLiquidityGaugeABI,
    provider
  );

  try {
    // --- Base APY calculation ---
    const currentRate = await stablePool.getRate();
    const currentBlock = await provider.getBlockNumber();

    const avgBlockTime = BLOCK_TIME[strategyChain.id] ?? 12;
    const blocksIn7Days = Math.floor((7 * 24 * 60 * 60) / avgBlockTime);
    const pastBlock = currentBlock - blocksIn7Days;

    const pastRate = await stablePool.getRate({ blockTag: pastBlock });

    const rateDelta = (BigInt(currentRate) - BigInt(pastRate)) * 1_000_000n / BigInt(pastRate);
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

    const rewardToken = new ethers.Contract(rewardTokenAddress, IERC20MetadataABI, provider);
    const inputToken = new ethers.Contract(inputTokenAddress, IERC20MetadataABI, provider);

    const [rewardDecimals, inputDecimals] = await Promise.all([
      rewardToken.decimals(),
      inputToken.decimals(),
    ]);

    const secondsPerYear = 365 * 24 * 60 * 60;

    const rewardsPerYear =
      Number(rewardRate) * secondsPerYear / Math.pow(10, Number(rewardDecimals));
    console.log("Rewards per year:", rewardsPerYear);
    const rewardsPerYearUSD = rewardsPerYear * opTokenPrice;
    console.log("Rewards per year in USD:", rewardsPerYearUSD);
    const rateDecimal = Number(currentRate) / 1e18; // assuming 18 decimals
    const totalSupplyUSD = parseFloat(ethers.formatUnits(totalSupply, 18)) * rateDecimal;
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
  strategyChain: Chain
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
  strategyChain: Chain
) {
  const moonwellVault = new ethers.Contract(
    receiptTokenAddress,
    moonwellVaultABI,
    provider
  );
  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await provider.getBlockNumber();
  const blocksIn7Days = Math.floor(secondsIn7Days / averageBlockTimeInSeconds);
  const pastBlockNumber = BigInt(currentBlockNumber - blocksIn7Days);
  const currentPrice = ethers.toBigInt(
    await moonwellVault.convertToAssets(BigInt(1e18))
  );
  const pastPrice = ethers.toBigInt(
    await moonwellVault.convertToAssets(BigInt(1e18), {
      blockTag: pastBlockNumber,
    })
  );
  const rateOfChange = ((currentPrice - pastPrice) * 10n ** 18n) / pastPrice;
  const normalizedRateOfChange = Number(rateOfChange) / Number(10n ** 18n);
  return Math.pow(1 + normalizedRateOfChange, 365 / 7) - 1;
}

export async function calculateCompoundAPY(
  receiptTokenAddress: Address,
  strategyChain: Chain
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
  compUsdPrice: number
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
  strategyChain: Chain
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
  strategyChain: Chain
) {
  // It looks like this is an XVS reward, but you have to stake >1000 XVS in order to qualify for it
  // It also looks like there's a 90 day lockup period for the rewards
  return Number(0.067);
}

export const executeDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  walletContext: WalletContextState | undefined,
  activeAccount: Account,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function
) => {
  if (activeChain.id === CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectDeposit(
      vaultData,
      inputToken,
      activeAccount,
      activeChain,
      transactionAmount
    );
  } else if (activeChain.id === CHAIN_ID.solana) {
    return executeSolanaDeposit(
      vaultData,
      inputToken,
      walletContext!,
      activeChain,
      transactionAmount,
      setcrossChainTxId
    );
  } else {
    return executeCrossChainDeposit(
      vaultData,
      inputToken,
      activeAccount,
      activeChain,
      transactionAmount,
      setcrossChainTxId
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
              `Failed to get CrossChainTxs after ${maxAttempts} attempts`
            )
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
  activeAccount: Account,
  activeChain: Chain,
  transactionAmount: bigint
) => {
  console.log("Executing DepositApprove");
  console.log("inputToken", inputToken);
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
    console.log("Approval confirmed");
    return true;
  } catch (error: any) {
    return false;
  }
};

const getPathDataAndMinSharesOut = async (
  vaultData: VaultData,
  inputToken: Token,
  transactionAmount: bigint,
  activeChain: Chain
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
      getCurrentSlippage() * 100
    );
    swapPath = encodedPath ?? "0x";
    assetsConversionAmount = amountOut;
  }

  const strategyChain = defineChain(vaultData.protocol.chainId);
  const contract = getContract({
    client,
    chain: strategyChain,
    address: vaultData.protocol.strategyAddress,
  });

  const sharesOutForUnderlying = await readContract({
    contract,
    method: "function convertToShares(uint256) view returns (uint256)",
    params: [assetsConversionAmount],
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
  transactionAmount: bigint
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
      slippageBps
    );
    swapPath = result.encodedPath ?? "0x";
  }

  return { swapPath, minAmountOut };
};



const executeDirectDeposit = async (vaultData: VaultData, inputToken: Token, activeAccount: Account, activeChain: Chain, transactionAmount: bigint) => {
  console.log("🚀 Executing Direct Deposit");
  console.log("📊 Direct Deposit - Initial Data:", {
    vaultId: vaultData.id,
    vaultName: vaultData.name,
    inputTokenSymbol: inputToken.symbol,
    originalTransactionAmount: transactionAmount.toString(),
    depositFeePaidFromGasTank: vaultData.depositFeePaidFromGasTank
  });
  
  // Calculate the actual deposit amount after gas fee deduction if needed (using centralized helper)
  let actualDepositAmount = transactionAmount;
  console.log("📍 Direct Deposit - Using centralized gas fee calculation");
  
  const gasFeeResult = await calculateGasFeeInVaultAsset(
    vaultData,
    inputToken,
    activeChain,
    1, // Not needed for direct deposits, only for USD formatting which we don't use here
    1, // Not needed for direct deposits, only for ETH formatting which we don't use here
    (amount: number) => amount.toString(), // Simple formatter
    (usd: number, ethPrice: number) => usd / ethPrice // Simple converter
  );

  if (gasFeeResult.needsDeduction) {
    const beforeDeduction = actualDepositAmount;
    actualDepositAmount = transactionAmount > gasFeeResult.gasFeeInVaultAsset ? 
      transactionAmount - gasFeeResult.gasFeeInVaultAsset : 0n;
    
    console.log("💰 Direct Deposit - Gas fee deduction summary:", {
      originalAmount: beforeDeduction.toString(),
      gasFeeDeducted: gasFeeResult.gasFeeInVaultAsset.toString(),
      finalDepositAmount: actualDepositAmount.toString(),
      deductionPercentage: ((Number(gasFeeResult.gasFeeInVaultAsset) / Number(beforeDeduction)) * 100).toFixed(4) + "%"
    });
  } else {
    console.log("✅ Direct Deposit - Gas fee paid from gas tank, no deduction needed");
  }
  
  const { swapPath, minSharesOut } = await getPathDataAndMinSharesOut(
    vaultData,
    inputToken,
    actualDepositAmount,
    activeChain
  );
  
  console.log("🎯 Direct Deposit - MinSharesOut Calculation:", {
    inputForCalculation: actualDepositAmount.toString(),
    originalAmount: transactionAmount.toString(),
    amountChanged: actualDepositAmount !== transactionAmount,
    minSharesOut: minSharesOut.toString(),
    swapPathLength: swapPath.length
  });
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
  console.log("assets", transactionAmount);
  console.log("minSharesOut", minSharesOut);
  console.log("receiver", activeAccount?.address);
  console.log("supplyTx", supplyTx);
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: supplyTx,
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
  vaultData: VaultData,
  inputToken: Token,
  activeAccount: Account,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function
) => {
  console.log("🌐 Executing Cross-Chain Deposit");
  console.log("📊 Cross-Chain Deposit - Initial Data:", {
    vaultId: vaultData.id,
    vaultName: vaultData.name,
    inputTokenSymbol: inputToken.symbol,
    activeChainId: activeChain.id,
    originalTransactionAmount: transactionAmount.toString(),
    depositFeePaidFromGasTank: vaultData.depositFeePaidFromGasTank,
    isZetachainDeposit: isZetachain(activeChain.id)
  });
  
  // Calculate the actual deposit amount after gas fee deduction if needed (using centralized helper)
  let actualDepositAmount = transactionAmount;
  console.log("📍 Cross-Chain Deposit - Using centralized gas fee calculation");
  
  const gasFeeResult = await calculateGasFeeInVaultAsset(
    vaultData,
    inputToken,
    activeChain,
    1, // Not needed for cross-chain deposits, only for USD formatting which we don't use here
    1, // Not needed for cross-chain deposits, only for ETH formatting which we don't use here
    (amount: number) => amount.toString(), // Simple formatter
    (usd: number, ethPrice: number) => usd / ethPrice // Simple converter
  );

  if (gasFeeResult.needsDeduction) {
    // For cross-chain deposits, convert gas fee to input token terms if needed
    const gasFeeInInputTokens = await convertGasFeeToInputToken(
      gasFeeResult.gasFeeInVaultAsset,
      vaultData,
      inputToken,
      activeChain
    );
    
    const beforeDeduction = actualDepositAmount;
    actualDepositAmount = transactionAmount > gasFeeInInputTokens ? 
      transactionAmount - gasFeeInInputTokens : 0n;
    
    console.log("💰 Cross-Chain Deposit - Gas fee deduction summary:", {
      originalAmount: beforeDeduction.toString(),
      gasFeeInVaultAsset: gasFeeResult.gasFeeInVaultAsset.toString(),
      gasFeeInInputTokens: gasFeeInInputTokens.toString(),
      finalDepositAmount: actualDepositAmount.toString(),
      deductionPercentage: ((Number(gasFeeInInputTokens) / Number(beforeDeduction)) * 100).toFixed(4) + "%"
    });
  } else {
    console.log("✅ Cross-Chain Deposit - Gas fee paid from gas tank, no deduction needed");
  }
  
  const { swapPath, minSharesOut } = await getPathDataAndMinSharesOut(
    vaultData,
    inputToken,
    actualDepositAmount,
    activeChain
  );
  
  console.log("🎯 Cross-Chain Deposit - MinSharesOut Calculation:", {
    inputForCalculation: actualDepositAmount.toString(),
    originalAmount: transactionAmount.toString(),
    amountChanged: actualDepositAmount !== transactionAmount,
    minSharesOut: minSharesOut.toString(),
    swapPathLength: swapPath.length
  });

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain
  );

  const nonEvmAddress = "0x"
  // Determine if the inputToken is a native asset (ETH, BNB, MATIC, etc.)
  const isNativeToken = inputToken.address === ZeroAddress;

  let contract, approveTx, receipt, payload, revertOptions;
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);

  // Prepare payload (calldata to pass to the receiver)

  payload = abiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
    [ZeroAddress, inputToken.address, 0, minSharesOut, slippageValue, nonEvmAddress, swapPath, keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`
    ]
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(
    ["string", "bytes", "address"],
    ["_crossChainDepositFailed", nonEvmAddress, activeAccount.address]
  );

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
  if (inputToken.isNative) {
    console.log("Native token deposit detected");
    contract = getContract({
      client,
      chain: activeChain,
      address: EVM_GATEWAY_ADDRESSES[activeChain.id],
    });
    const depositTx = prepareContractCall({
      contract,
      method:
        "function depositAndCall(address receiver, bytes calldata payload, (address,bool,address,bytes,uint256) revertOptions)",
      params: [vaultData.id, payload, revertOptions],
      value: transactionAmount,
    });

    receipt = await sendAndConfirmTransaction({
      account: activeAccount,
      transaction: depositTx,
      // ...txOptions,
    });
    console.log("Deposit executed");
    // setcrossChainTxId(transactionId);
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
    try {
      const receipt = await sendAndConfirmTransaction({
        account: activeAccount,
        transaction: depositTx,
        // ...txOptions,
      });

      console.log("Deposit executed");
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
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Deposit");
  const { swapPath, minSharesOut } = await getPathDataAndMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain
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
  const solanaWalletAddress = new TextEncoder().encode(walletContext.publicKey!.toBase58());

  if (inputToken.isNative) {
    // Case 1: Native token (ETH, BNB, etc.)
    const args = {
      types: ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      values: [
        ZeroAddress,
        getSolanaEVMAddress(inputToken.address),
        0,
        minSharesOut,
        slippageValue,
        solanaWalletAddress,
        swapPath,
        keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`
      ],
    };
    const txHash = await client.solanaDepositAndCall(
      Number(transactionAmount),
      vaultData.id,
      args
    );
    console.log("Deposit executed");
    setcrossChainTxId(transactionId);
    return { transactionHash: txHash };
  } else {
    // Case 2: SPL token
    const evmAddress = getSolanaEVMAddress(inputToken.address);
    const args = {
      types: ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      values: [ZeroAddress, evmAddress, 0, minSharesOut, slippageValue, solanaWalletAddress, swapPath, keccak256(toUtf8Bytes("DepositInitiated")) as `0x${string}`
      ],
    };
    console.log("SPL token deposit detected");
    const txHash = await client.depositSplTokenAndCall(
      inputToken.address,
      Number(transactionAmount),
      vaultData.id,
      args
    );
    console.log("Deposit executed");
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
  setcrossChainTxId: Function
) => {
  console.log("Executing Solana Cross-Chain Withdrawal");
  const { swapPath, minAmountOut } = await getPathDataAndMinAmountOut(
    vaultData,
    withdrawZRC20,
    withdrawAssetAmount
  );
  const solanaWalletAddress = new TextEncoder().encode(walletContext.publicKey!.toBase58());
  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    walletContext.publicKey!.toBase58(),
    activeChain
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
    types: ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
    values: [
      withdrawZRC20.address,
      getSolanaEVMAddress(splMint),
      withdrawAssetAmount,
      minAmountOut,
      slippageValue,
      solanaWalletAddress,
      swapPath,
      keccak256(toUtf8Bytes("WithdrawInitiated")) as `0x${string}`
    ],
  };

  const txHash = await client.solanaWithdrawal(vaultData.id, args);
  console.log("Withdrawal executed");
  setcrossChainTxId(transactionId);
  return { transactionHash: txHash };
};

export const executeWithdrawal = async (
  vaultData: VaultData,
  walletContext: WalletContextState,
  activeAccount: Account,
  activeChain: Chain,
  withdrawAssetAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Token,
  setcrossChainTxId: Function
) => {
  console.log("Executing Withdrawal");
  console.log("To chain ID:", activeChain.id);
  if (activeChain.id == CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectWithdrawal(
      vaultData,
      activeAccount,
      activeChain,
      withdrawAssetAmount
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
      setcrossChainTxId
    );
  } else {
    return executeCrossChainWithdrawal(
      vaultData,
      activeAccount,
      activeChain,
      withdrawAssetAmount,
      withdrawERC20,
      withdrawZRC20,
      setcrossChainTxId
    );
  }
};

const executeDirectWithdrawal = async (
  vaultData: VaultData,
  activeAccount: Account,
  activeChain: Chain,
  withdrawAssetAmount: bigint
) => {
  //vaultId: string
  const { swapPath, minAmountOut } = await getPathDataAndMinAmountOut( // TODO simplify this here to reduce lag
    vaultData,
    vaultData.inputToken,
    withdrawAssetAmount
  );
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultData.id,
  });
  const withdrawTx = prepareContractCall({
    contract,
    method:
      "function withdraw(uint256 assets, uint256 minimumOut, address receiver, address owner)",
    params: [
      withdrawAssetAmount,
      minAmountOut,
      activeAccount?.address,
      activeAccount?.address
    ],
  });
  const receipt = await sendTransaction({
    account: activeAccount,
    transaction: withdrawTx,
  });
  return receipt;
};

const executeCrossChainWithdrawal = async (
  vaultData: VaultData,
  activeAccount: Account,
  activeChain: Chain,
  withdrawAssetAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Token,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Withdrawal");
  const { swapPath, minAmountOut } = await getPathDataAndMinAmountOut(
    vaultData,
    withdrawZRC20,
    withdrawAssetAmount
  );

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain
  );
  const slippage = getCurrentSlippage();
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // this will always be Zetachain
    address: vaultData.id,
  });
  const nonEvmAddress = "0x";
  const slippageValue = (slippage * 100).toFixed(0);
  // Prepare payload (calldata to pass to the receiver)
  const payload = abiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
    [
      withdrawZRC20.address,
      withdrawERC20,
      withdrawAssetAmount,
      minAmountOut,
      slippageValue,
      nonEvmAddress,
      swapPath,
      keccak256(toUtf8Bytes("WithdrawInitiated")) as `0x${string}`
    ]
  ) as `0x${string}`;
  const revertMessage = abiCoder.encode(
    ["string", "bytes32", "address"],
    ["_crossChainWithdrawFailed", transactionId, activeAccount.address]
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
    params: [vaultData.id, payload, revertOptions],
  });

  try {
    const receipt = await sendAndConfirmTransaction({
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
  userAddress: Address,
  vaultAddress: Address
) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // This will always be Zetachain, as it's a balance on the vault
    address: vaultAddress,
  });
  const { value: shares, decimals } = await getBalance({
    contract,
    address: userAddress,
  });
  console.log("shares", shares);
  console.log("decimals", decimals);
  const balance = await readContract({
    contract,
    method: "function convertToAssets(uint256) view returns (uint256)",
    params: [shares],
  });
  console.log("balance", balance);
  return formatUnits(balance, decimals);
};

export const fetchUserVaultMaxRedeem = async (
  decimals: number,
  userAddress: Address,
  vaultAddress: Address
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

export const fetchUserVaultMaxWithdraw = async (
  decimals: number,
  userAddress: Address,
  vaultAddress: Address
) => {
  console.log("🔍 Calling fetchUserVaultMaxWithdraw:", { userAddress, vaultAddress, decimals });

  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // Always Zetachain
    address: vaultAddress,
  });

  const maxWithdraw = await readContract({
    contract,
    method: "function maxWithdraw(address) view returns (uint256)",
    params: [userAddress],
  });

  const formatted = formatUnits(maxWithdraw, decimals);
  console.log(`✅ maxWithdraw result: ${maxWithdraw.toString()} raw -> ${formatted} formatted`);

  // Use formatUnits instead of Number conversion
  return formatted;
};

export const fetchTotalAssets = async (vaultAddress: Address) => {
  const vaultData = await new ApiService().api.getVaultData(vaultAddress);
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
  tokenAddress: string
): Promise<number | null> => {
  try {
    const response = await api.functional.api.currency.partners.getPartners(
      beamConnection,
      "7000"
    ); // hardcoded for ZC

    const data = response.data as {
      data: { address: string; id: number }[];
    };

    const token = data.data.find(
      (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
    );
    return token?.id ?? null;
  } catch (err) {
    console.error("Failed to fetch token ID:", err);
    return null;
  }
};

export const getPathDataAndAmountOut = async (
  amount: bigint,
  inputToken: Token,
  outputToken: Token,
  userAddress: string,
  slippage: Number
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
    const beamQuote = await swap.native.getSwapData(
      beamConnection,
      swapDetails
    ) as {
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
      path
    ) as `0x${string}`;

    console.log("✅ Encoded path:", encodedPath);
    console.log("✅ Expected amount out:", expectedAmountOut);

    const amountOutRaw = (expectedAmountOut * 10 ** outputToken.decimals).toFixed(0);
    return {
      encodedPath,
      amountOut: BigInt(amountOutRaw),
    };
  } catch (e: any) {
    console.error("❌ Beam swap fetch failed:", e.message || e);
    return { encodedPath: null, amountOut: BigInt(0) };
  }
};

export const getSharesFromDeposit = async (
  amount: bigint,
  vaultData: VaultData
) => {
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vaultData.id as Address,
  });

  try {
    const shares = await readContract({
      contract,
      method: "function previewDeposit(uint assets) view returns (uint shares)",
      params: [amount],
    });
    const formattedShares =
      Number(shares) / 10 ** vaultData.inputToken.decimals;
    return formattedShares.toString();
  } catch (e) {
    return "0";
  }
};

export const getAssetsFromShares = async (
  amount: bigint,
  vaultData: VaultData
) => {
  console.log("amount", amount);
  console.log("vault address", vaultData.id);
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vaultData.id as Address,
  });
  console.log("contract", contract);
  try {
    const result = await readContract({
      contract,
      method: "function previewRedeem(uint shares) view returns (uint assets)",
      params: [amount],
    });
    console.log("result", result);
    return result;
  } catch (e) {
    console.log("Error reading contract:", e);
    return BigInt("0");
  }
};

export const getPerformanceFee = async (vaultId: Address) => {
  let contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // Zetachain
    address: vaultId,
  });

  const perfFee = await readContract({
    contract,
    method: "function perfFee() view returns (uint16)",
  });

  return perfFee;
};

export const updatePythPrices = async () => { };
