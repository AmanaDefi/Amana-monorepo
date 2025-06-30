import React, { useEffect, useState, useRef } from "react";
import {
  VaultData,
  VaultTotalAssets,
  VaultAPY,
  Token,
  Balance,
} from "@/types/types";
import LargeCardStat from "@/components/common/LargeCardStat";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { formatTokenBalance, getOnlyTokenSymbol } from "@/utils/utils";
import { APPROVED_TOKENS } from "@/constants/chainConfig";
import PointsIcon from "@/components/svg/PointsIcon";
import ResponsiveTooltip from "@/components/common/Tooltip";
import { getPointsInfo } from "@/utils/helpers";

interface VaultStatsProps {
  vaultData: VaultData;
  userVaultBalance?: Balance | string;
  selectedVaultId: string;
  vaultAPYs: VaultAPY[];
  transactionCompleted: boolean;
  selectedToken?: Token;
  isDeposit: boolean;
  onDepositDataUpdate?: (
    amount: string,
    symbol: string,
    usdValue: number,
  ) => void;
}

export default function VaultStats({
  vaultData,
  userVaultBalance,
  selectedVaultId,
  vaultAPYs,
  transactionCompleted,
  selectedToken,
  onDepositDataUpdate,
  isDeposit,
}: VaultStatsProps): JSX.Element {
  const { activeChain, walletAddress } = useMultiChain();
  const [inputToken, setInputToken] = useState<Token | undefined>();
  const [depositAmount, setDepositAmount] = useState("0");
  const lastVaultIdRef = useRef<string | null>(null);
  const lastActiveChainRef = useRef<number | null>(null);

  // Determine input token based on user selection or active chain
  useEffect(() => {
    const vaultId = vaultData.id as string;
    const isNewVault = vaultId !== lastVaultIdRef.current;
    const isChainChanged = activeChain?.id !== lastActiveChainRef.current;

    // First priority: If there's a user-selected token from parent component, use it
    if (selectedToken) {
      setInputToken(selectedToken);
    }
    // Only auto-select if there's no token already selected or if we have a new vault/chain
    else if (!inputToken || isNewVault || isChainChanged) {
      const isZetaChain = activeChain?.id === 7000 || activeChain?.id === 7001;

      if (isZetaChain) {
        // Special handling for ZetaChain - prioritize tokens from the connected chain
        const vaultTokenSymbol = vaultData.inputToken.symbol.split(".")[0];
        const isStablecoin = [
          "USDT",
          "USDC",
          "DAI",
          "BUSD",
          "TUSD",
          "USDP",
          "FRAX",
          "LUSD",
        ].includes(vaultTokenSymbol.toUpperCase());

        if (isStablecoin && APPROVED_TOKENS[7000]) {
          // Look for chain-specific stablecoin tokens (e.g., USDC.ARB vs USDC.ETH)
          const chainSpecificTokens = APPROVED_TOKENS[7000].filter(
            (token: Token) => {
              const tokenParts = token.symbol.split(".");
              if (tokenParts.length === 2) {
                const tokenBaseSymbol = tokenParts[0];
                return (
                  tokenBaseSymbol.toUpperCase() ===
                  vaultTokenSymbol.toUpperCase()
                );
              }
              return false;
            },
          );

          if (chainSpecificTokens.length > 0) {
            // Get user's connected chain suffix if possible
            let connectedChainSuffix = "";

            // Check if we can determine a chain suffix from the active wallet connection
            if (activeChain?.id) {
              // These are mappings of chain IDs to their suffix in token symbols
              const chainIdToSuffix: Record<number, string> = {
                1: "ETH", // Ethereum
                8453: "BASE", // Base
                137: "POL", // Polygon
                42161: "ARB", // Arbitrum
                43114: "AVAX", // Avalanche
                56: "BSC", // BNB Chain
              };

              connectedChainSuffix = chainIdToSuffix[activeChain.id] || "";
            }

            // Extract the vault token's chain suffix if it has one
            const vaultTokenParts =
              vaultData?.inputToken?.symbol.split(".") || [];
            const vaultTokenSuffix =
              vaultTokenParts.length === 2 ? vaultTokenParts[1] : "";

            // Sort by our prioritization logic
            const sortedTokens = [...chainSpecificTokens].sort((a, b) => {
              const aSuffix = a.symbol.split(".")[1] || "";
              const bSuffix = b.symbol.split(".")[1] || "";

              // If one token matches the current chain, it wins
              if (
                aSuffix === connectedChainSuffix &&
                bSuffix !== connectedChainSuffix
              )
                return -1;
              if (
                bSuffix === connectedChainSuffix &&
                aSuffix !== connectedChainSuffix
              )
                return 1;

              // If one token matches the vault token's original suffix, it comes next
              if (vaultTokenSuffix) {
                if (
                  aSuffix === vaultTokenSuffix &&
                  bSuffix !== vaultTokenSuffix
                )
                  return -1;
                if (
                  bSuffix === vaultTokenSuffix &&
                  aSuffix !== vaultTokenSuffix
                )
                  return 1;
              }

              // Otherwise, alphabetical order
              return aSuffix.localeCompare(bSuffix);
            });

            setInputToken(sortedTokens[0]);
          } else {
            // Fallback to vault input token
            setInputToken(vaultData.inputToken);
          }
        } else {
          // Non-stablecoin or no tokens available - use vault input token
          setInputToken(vaultData.inputToken);
        }
      } else if (activeChain) {
        // For other chains, determine the appropriate token using existing helper
        // const determinedToken = determineVaultTokenFromApprovedTokens(
        //   activeChain.id as number,
        //   vaultData.inputToken
        // );
        // setInputToken(determinedToken);
      }
    }

    // Update the last vault ID reference
    lastVaultIdRef.current = vaultId;
    // Update the last active chain reference
    if (activeChain) {
      lastActiveChainRef.current = activeChain.id;
    }
  }, [activeChain, vaultData.id, vaultData.inputToken, selectedToken]);

  const { balance: walletTokenBalance } = useMultichainTokenBalance(inputToken);

  const symbol = inputToken?.symbol || "";
  const price = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice =
    useTokenPriceBySymbol(vaultData.inputToken?.symbol) || 0;

  // Format wallet balance according to token type
  const formattedWalletBalance = formatTokenBalance(
    walletTokenBalance.formatted,
    symbol,
  );

  useEffect(() => {
    // Update deposit amount whenever the vault balance changes
    if (userVaultBalance) {
      // Handle when userVaultBalance is a simple string (direct from fetchUserVaultBalance)
      if (typeof userVaultBalance === "string") {
        setDepositAmount(userVaultBalance);
      }
      // Handle when userVaultBalance is a Balance object
      else if (typeof userVaultBalance === "object") {
        if (userVaultBalance.formatted) {
          setDepositAmount(userVaultBalance.formatted);
        } else if ("value" in userVaultBalance && userVaultBalance.value) {
          setDepositAmount(userVaultBalance.value.toString());
        }
      }
    } else {
      setDepositAmount("0");
    }
  }, [userVaultBalance, transactionCompleted]);

  // Parse the deposit amount to a number for calculations
  const depositAmountNumber = parseFloat(depositAmount) || 0;

  useEffect(() => {
    if (onDepositDataUpdate && vaultData?.inputToken?.symbol) {
      const usdValue = depositAmountNumber * vaultTokenPrice;
      onDepositDataUpdate(depositAmount, vaultData.inputToken.symbol, usdValue);
    }
  }, [
    depositAmount,
    vaultData?.inputToken?.symbol,
    depositAmountNumber,
    vaultTokenPrice,
    onDepositDataUpdate,
  ]);

  if (!walletAddress || !isDeposit) {
    return <></>;
  }

  return (
    <div className="w-full flex flex-col md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
      <div className="grid grid-cols-3 px-[26px] py-4 gap-4 md:gap-6 before-gradient-border rounded-lg max-h-[80px] w-full ">
        <LargeCardStat
          id="deposits"
          label="Deposits"
          value={`${formatTokenBalance(depositAmount, vaultData.inputToken.symbol)} ${
            vaultData.inputToken.symbol
              ? getOnlyTokenSymbol(vaultData.inputToken.symbol)
              : ""
          }`}
          tooltip="Value of your vault deposits"
        />
        <LargeCardStat
          id="wallet"
          label="Your Wallet"
          value={`${formattedWalletBalance} ${
            symbol ? getOnlyTokenSymbol(symbol) : ""
          }`}
          tooltip="Value of deposit assets held in your wallet"
        />
        <LargeCardStat
          id="rewards"
          label="Your rewards"
          value="0 Points"
          tooltip="Your rewards"
        />
      </div>
    </div>
  );
}
