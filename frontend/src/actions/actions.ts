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
import { getBalance } from "thirdweb/extensions/erc20";
import { ethers, getBytes, } from "ethers";
import moonwellVaultABI from "../../abis/moonwellVaultABI.json";
import fourPoolABI from "../../abis/fourPoolABI.json";
import beefyVaultABI from "../../abis/beefyVaultABI.json";
import curvePoolABI from "../../abis/curvePoolABI.json";
import convexRewardPoolABI from "../../abis/convexRewardPoolABI.json";
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
import { baseProvider, ethereumProvider, arbitrumProvider } from "../utils/providers";

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
import { trackEvent } from "@/utils/trackEvent";

dotenv.config();

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
    baseProvider
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(
      await eddyFinancePool.get_virtual_price()
    );

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await baseProvider.getBlockNumber();
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
    baseProvider
  );

  try {
    // Fetch the current virtual price
    const currentPrice = ethers.toBigInt(
      await beefyVault.getPricePerFullShare()
    );

    // Fetch the block number and determine the number of seconds in the past (e.g., 7 days)
    const currentBlockNumber = await baseProvider.getBlockNumber();
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
  let relevant_provider = baseProvider;
  if (strategyChain.id === 1) {
    relevant_provider = ethereumProvider;
   } else if (strategyChain.id === 42161) {
  relevant_provider = arbitrumProvider;
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
  const provider = arbitrumProvider;

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
    baseProvider
  );
  const averageBlockTimeInSeconds = 2;
  const secondsInADay = 24 * 60 * 60;
  const secondsIn7Days = 7 * secondsInADay;

  const currentBlockNumber = await baseProvider.getBlockNumber();
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

  return Number(0.02); // TODO replace with proper value
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
      activeChain,
      transactionAmount,
      inputToken,
    });
    console.log("Approval confirmed");
    return true;
  } catch (error: any) {
    return false;
  }
};

const getMinSharesOut = async (vaultData: VaultData, inputToken: Token, transactionAmount: bigint, activeChain: Chain) => {
  const inputTokenAddress = isZetachain(activeChain.id) ? inputToken?.address : inputToken?.ZRC20equivalent;
  let assetsConversionAmount: bigint = transactionAmount;
  if (inputTokenAddress !== vaultData.inputToken.address) {
    assetsConversionAmount = await getAmountOutFromSwap(
      transactionAmount,
      inputToken,
      vaultData.inputToken,
      vaultData.id as Address
    );
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
  const minSharesOut = sharesOutForUnderlying * BigInt(10000 - getCurrentSlippage() * 100) / BigInt(10000);
  return minSharesOut;
};

const getMinAmountOut = async (
  vaultId: string,
  transactionAmount: bigint,
  strategyAddress: Address,
  strategyChainId: number
) => {
  const vaultContract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0], // Zetachain
    address: vaultId,
  });
  const vaultTotalSupply = await readContract({
    contract: vaultContract,
    method: "function totalSupply() view returns (uint256)",
  });
  const fractionOfTotalShares =
    (transactionAmount * ethers.parseEther("1")) / vaultTotalSupply;
  const strategyChain = defineChain(strategyChainId);
  const contract = getContract({
    client,
    chain: strategyChain,
    address: strategyAddress,
  });
  const strategyWithdrawShareAmount = await readContract({
    contract,
    method:
      "function getStrategyWithdrawShareAmount(uint256) public view returns (uint256)",
    params: [fractionOfTotalShares],
  });
  const amountOutForShares = await readContract({
    contract,
    method: "function convertToAssets(uint256) view returns (uint256)",
    params: [strategyWithdrawShareAmount],
  });
  const minAmountOut =
    (amountOutForShares * BigInt(10000 - getCurrentSlippage() * 100)) /
    BigInt(10000);
  return minAmountOut;
};

const executeDirectDeposit = async (vaultData: VaultData, inputToken: Token, activeAccount: Account, activeChain: Chain, transactionAmount: bigint) => {
  console.log("Executing Direct Deposit");
  const minSharesOut: bigint = await getMinSharesOut(vaultData, inputToken, transactionAmount, activeChain);
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
  console.log("Executing Cross-Chain Deposit");
  const minSharesOut = await getMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain
  );

  // Generate a unique transaction ID
  const transactionId = generateTransactionId(
    activeAccount.address,
    activeChain
  );

  // Determine if the inputToken is a native asset (ETH, BNB, MATIC, etc.)
  const isNativeToken = inputToken.address === ZeroAddress;

  let contract, approveTx, receipt, payload, revertOptions;
  const slippage = getCurrentSlippage();
  const slippageValue = (slippage * 100).toFixed(0);

  // Prepare payload (calldata to pass to the receiver)

  payload = abiCoder.encode(
    ["address", "uint256", "uint16", "bytes32"],
    [inputToken.address, minSharesOut, slippageValue, transactionId]
  ) as `0x${string}`;

  const revertMessage = abiCoder.encode(
    ["string", "bytes32", "address"],
    ["_crossChainDepositFailed", transactionId, activeAccount.address]
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
    setcrossChainTxId(transactionId);
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
  const minSharesOut = await getMinSharesOut(
    vaultData,
    inputToken,
    transactionAmount,
    activeChain
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

  if (inputToken.isNative) {
    // Case 1: Native token (ETH, BNB, etc.)
    const args = {
      types: ["address", "uint256", "uint16", "bytes32"],
      values: [
        getSolanaEVMAddress(inputToken.address),
        minSharesOut,
        slippageValue,
        transactionId,
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
      types: ["address", "uint256", "uint16", "bytes32"],
      values: [evmAddress, minSharesOut, slippageValue, transactionId],
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
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  walletContext: WalletContextState,
  activeChain: Chain,
  withdrawShareAmount: bigint,
  splMint: string,
  withdrawZRC20: Address,
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Withdrawal");
  const minAmountOut = await getMinAmountOut(
    vaultId,
    withdrawShareAmount,
    strategyAddress,
    strategyChainId
  );

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
    types: ["address", "address", "uint256", "uint256", "uint16", "bytes32"],
    values: [
      withdrawZRC20,
      getSolanaEVMAddress(splMint),
      withdrawShareAmount,
      minAmountOut,
      slippageValue,
      transactionId,
    ],
  };

  const txHash = await client.solanaWithdrawal(vaultId, args);
  console.log("Withdrawal executed");
  setcrossChainTxId(transactionId);
  return { transactionHash: txHash };
};

export const executeWithdrawal = async (
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  walletContext: WalletContextState,
  activeAccount: Account,
  activeChain: Chain,
  withdrawShareAmount: bigint,
  withdrawERC20: Address,
  withdrawZRC20: Token,
  setcrossChainTxId: Function
) => {
  if (activeChain.id == CHAIN_ID.zetachain) {
    // if active chain is Zetachain (main or testnet)
    return executeDirectWithdrawal(
      vaultId,
      strategyAddress,
      strategyChainId,
      activeAccount,
      activeChain,
      withdrawShareAmount
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
      setcrossChainTxId
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
      setcrossChainTxId
    );
  }
};

const executeDirectWithdrawal = async (
  vaultId: Address,
  strategyAddress: Address,
  strategyChainId: number,
  activeAccount: Account,
  activeChain: Chain,
  withdrawShareAmount: bigint
) => {
  //vaultId: string
  const minAmountOut = await getMinAmountOut(
    vaultId,
    withdrawShareAmount,
    strategyAddress,
    strategyChainId
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
  setcrossChainTxId: Function
) => {
  console.log("Executing Cross-Chain Withdrawal");
  const minAmountOut = await getMinAmountOut(
    vaultId,
    withdrawShareAmount,
    strategyAddress,
    strategyChainId
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
    address: vaultId,
  });

  const slippageValue = (slippage * 100).toFixed(0);
  // Prepare payload (calldata to pass to the receiver)
  const payload = abiCoder.encode(
    ["address", "address", "uint256", "uint256", "uint16", "bytes32"],
    [
      withdrawZRC20.address,
      withdrawERC20,
      withdrawShareAmount,
      minAmountOut,
      slippageValue,
      transactionId,
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
    params: [vaultId, payload, revertOptions],
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
  host: "https://public-beam-backend-mainnet.codemelt.codes", // Replace with actual Beam API host
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

export const getAmountOutFromSwap = async (
  amount: bigint,
  inputToken: Token,
  outputToken: Token,
  userAddress: string
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
      console.log("🚀 Getting quote from Beam API...");
      const beamQuote = await swap.native.getSwapData(
        beamConnection,
        swapDetails
      );

      if (!beamQuote.success) {
        console.warn("⚠️ Beam quote unsuccessful, falling back to Eddy");
      } else if (
        !beamQuote.data ||
        !beamQuote.data.status ||
        !beamQuote.data.data
      ) {
        console.warn(
          "⚠️ Beam quote returned invalid structure:",
          beamQuote.data?.message || "Unknown error"
        );
      } else {
        const quoteAmount = beamQuote.data.data.expectedAmountOut;

        if (quoteAmount > 0) {
          console.log("✅ Beam quote found");
          const quoteAmountRaw = (
            quoteAmount *
            10 ** outputToken.decimals
          ).toFixed(0);
          return BigInt(quoteAmountRaw);
        }

        console.warn("⚠️ Beam quote returned zero amount");
      }
    } catch (e: any) {
      console.warn(
        "⚠️ Beam quote threw error, falling back to Eddy:",
        e.message || e
      );
    }

    // Step 3: Fallback to Eddy
    try {
      console.log("🌐 Trying Eddy as fallback...");
      const eddyQuote = await sdk.bridge.getQuoteForBridge({
        inputTokenAddress: inputToken.address,
        outputTokenAddress: outputToken.address,
        sourceChainId: sourceChainId,
        destinationChainId: destinationChainId,
        amount: amount.toString(),
        slippage: 0.5,
      });

      console.log("✅ Eddy quote found");
      return BigInt(eddyQuote.quoteAmount);
    } catch (e) {
      console.error("❌ Eddy quote failed:", e);
      return BigInt(0);
    }
  }
  // 🛠️ Final catch-all return
  console.warn(
    "❌ Could not get Beam token IDs or all fallback methods failed"
  );
  return BigInt(0);
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
  const contract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: vaultData.id as Address,
  });

  try {
    return await readContract({
      contract,
      method: "function previewRedeem(uint shares) view returns (uint assets)",
      params: [amount],
    });
  } catch (e) {
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
