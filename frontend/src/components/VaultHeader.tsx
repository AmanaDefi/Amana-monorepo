import React, { useEffect, useState, useRef } from "react";
import { VaultData, VaultTotalAssets, VaultAPY, Token, Balance } from "@/types/types";
import LargeCardStat from "@/components/common/LargeCardStat";
import Image from "next/image";
import {
  determineVaultTokenFromApprovedTokens,
  formatBalance,
  formatCurrency,
} from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { formatTokenBalance } from "@/utils/utils";
import { APPROVED_TOKENS } from "@/constants/chainConfig";
import PointsIcon from "@/components/svg/PointsIcon";
import ResponsiveTooltip from "@/components/common/Tooltip";

// Helper function to get points message for specific protocols
const getPointsMessage = (protocolName: string) => {
  switch (protocolName) {
    case 'Aegis':
      return {
        message: 'Earn 15 points daily per $1 deposited',
        logo: '/aegis.jpeg'
      };
    case 'YieldFi':
      return {
        message: 'Earn 5 YieldCrumbs daily per $1 deposited',
        logo: '/yieldfi.png'
      };
    default:
      return null;
  }
};

// Helper function to get points information for tooltip
const getPointsInfo = (protocolName: string) => {
  switch (protocolName) {
    case 'Aegis':
      return {
        points: '15 pts/$/day',
        nativeYield: 'Aegis native yield',
        displayPoints: true
      };
    case 'YieldFi':
      return {
        points: '5 pts/$/day',
        nativeYield: 'YieldFi native yield',
        displayPoints: true
      };
    default:
      return {
        points: '',
        nativeYield: '',
        displayPoints: false
      };
  }
};

export default function VaultHeader({
  vaultData,
  userVaultBalance,
  selectedVaultId,
  vaultTotalAsset,
  vaultAPYs,
  transactionCompleted,
  selectedToken,
}: {
  vaultData: VaultData;
  userVaultBalance?: Balance | string;
  selectedVaultId: string;
  vaultTotalAsset?: VaultTotalAssets;
  vaultAPYs: VaultAPY[];
  transactionCompleted: boolean;
  selectedToken?: Token;
}): JSX.Element {
  const { activeChain } = useMultiChain();
  const [inputToken, setInputToken] = useState<Token | undefined>();
  const [depositAmount, setDepositAmount] = useState("0");
  const lastVaultIdRef = useRef<string | null>(null);
  const lastActiveChainRef = useRef<number | null>(null);
  
  // Debug full userVaultBalance object
  
  // Determine input token based on user selection or active chain
  useEffect(() => {
    const vaultId = vaultData.id as string;
    const isNewVault = vaultId !== lastVaultIdRef.current;
    const isChainChanged = activeChain?.id !== lastActiveChainRef.current;
    
    // Always log vault changes
    if (isNewVault) {
    }
    
    if (isChainChanged) {
    }
    
    // First priority: If there's a user-selected token from parent component, use it
    if (selectedToken) {
      setInputToken(selectedToken);
    } 
    // Only auto-select if there's no token already selected or if we have a new vault/chain
    else if (!inputToken || isNewVault || isChainChanged) {
      const isZetaChain = activeChain?.id === 7000 || activeChain?.id === 7001;
      
      if (isZetaChain) {
        // Special handling for ZetaChain - prioritize tokens from the connected chain
        const vaultTokenSymbol = vaultData.inputToken.symbol.split('.')[0];
        const isStablecoin = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX', 'LUSD'].includes(vaultTokenSymbol.toUpperCase());
        
        if (isStablecoin && APPROVED_TOKENS[7000]) {
          // Look for chain-specific stablecoin tokens (e.g., USDC.ARB vs USDC.ETH)
          const chainSpecificTokens = APPROVED_TOKENS[7000].filter((token: Token) => {
            const tokenParts = token.symbol.split('.');
            if (tokenParts.length === 2) {
              const tokenBaseSymbol = tokenParts[0];
              return tokenBaseSymbol.toUpperCase() === vaultTokenSymbol.toUpperCase();
            }
            return false;
          });
          
          if (chainSpecificTokens.length > 0) {
            // Get user's connected chain suffix if possible
            let connectedChainSuffix = "";
            
            // Check if we can determine a chain suffix from the active wallet connection
            if (activeChain?.id) {
              // These are mappings of chain IDs to their suffix in token symbols
              const chainIdToSuffix: Record<number, string> = {
                1: "ETH",   // Ethereum
                8453: "BASE", // Base
                137: "POL",   // Polygon
                42161: "ARB",  // Arbitrum
                43114: "AVAX", // Avalanche
                56: "BSC"     // BNB Chain
              };
              
              connectedChainSuffix = chainIdToSuffix[activeChain.id] || "";
            }
            
            // Extract the vault token's chain suffix if it has one
            const vaultTokenParts = vaultData?.inputToken?.symbol.split('.') || [];
            const vaultTokenSuffix = vaultTokenParts.length === 2 ? vaultTokenParts[1] : "";
            
            
            // Sort by our prioritization logic
            const sortedTokens = [...chainSpecificTokens].sort((a, b) => {
              const aSuffix = a.symbol.split('.')[1] || '';
              const bSuffix = b.symbol.split('.')[1] || '';
              
              // If one token matches the current chain, it wins
              if (aSuffix === connectedChainSuffix && bSuffix !== connectedChainSuffix) return -1;
              if (bSuffix === connectedChainSuffix && aSuffix !== connectedChainSuffix) return 1;
              
              // If one token matches the vault token's original suffix, it comes next
              if (vaultTokenSuffix) {
                if (aSuffix === vaultTokenSuffix && bSuffix !== vaultTokenSuffix) return -1;
                if (bSuffix === vaultTokenSuffix && aSuffix !== vaultTokenSuffix) return 1;
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
        const determinedToken = determineVaultTokenFromApprovedTokens(
          activeChain.id as number,
          vaultData.inputToken
        );
        setInputToken(determinedToken);
      }
    }
    
    // Update the last vault ID reference
    lastVaultIdRef.current = vaultId;
    // Update the last active chain reference
    if (activeChain) {
      lastActiveChainRef.current = activeChain.id;
    }
  }, [activeChain, vaultData.id, vaultData.inputToken, selectedToken, inputToken]);

  const { balance: walletTokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  const symbol = inputToken?.symbol || "";
  const price = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol) || 0;

  // Format wallet balance according to token type
  const formattedWalletBalance = formatTokenBalance(walletTokenBalance.formatted, symbol);

  // Refresh wallet balance when input token changes
  useEffect(() => {
    if (inputToken) {
      fetchBalance();
    }
  }, [inputToken, fetchBalance]);

  useEffect(() => {
    // Update deposit amount whenever the vault balance changes
    if (userVaultBalance) {
      
      // Handle when userVaultBalance is a simple string (direct from fetchUserVaultBalance)
      if (typeof userVaultBalance === 'string') {
        setDepositAmount(userVaultBalance);
      } 
      // Handle when userVaultBalance is a Balance object
      else if (typeof userVaultBalance === 'object') {
        
        if (userVaultBalance.formatted) {
          setDepositAmount(userVaultBalance.formatted);
        } else if ('value' in userVaultBalance && userVaultBalance.value) {
          setDepositAmount(userVaultBalance.value.toString());
        }
      }
    } else {
      setDepositAmount("0");
    }
  }, [userVaultBalance, transactionCompleted]);

  // Parse the deposit amount to a number for calculations
  const depositAmountNumber = parseFloat(depositAmount) || 0;
  
  return (
    <section className="md:border-b border-customNeutral100 pt-10 pb-6 px-4 md:px-0 ">
      <div className="w-full mb-12 flex flex-row items-center">
        <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.imgURL ?? ""}
                alt={vaultData.protocol.network}
                width={1200}
                height={800}
                className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
                sizes="(max-width: 768px) 24px, 40px"
              />
            </div>
            <h2 className="font-bold text-white">
              {vaultData.protocol.network}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.protocol.imgURL}
                alt={vaultData.protocol.name}
                width={1200}
                height={800}
                className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
                sizes="(max-width: 768px) 24px, 40px"
              />
            </div>
            <h2 className="font-bold text-white">{vaultData.protocol.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.inputToken.imgURL}
                alt={vaultData.name}
                width={1200}
                height={800}
                className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
                sizes="(max-width: 768px) 24px, 40px"
              />
            </div>
            <h2 className="font-bold text-white">{vaultData.name}</h2>
          </div>
        </div>
      </div>



      <div className="w-full md:flex md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 md:pr-10 gap-4 md:gap-8">
          <LargeCardStat
            id="deposits"
            label="Deposits"
            value={`${formatTokenBalance(depositAmount, vaultData.inputToken.symbol)} ${
              vaultData.inputToken.symbol
            }`}
            secondaryValue={`$ ${formatCurrency(
              depositAmountNumber * vaultTokenPrice
            )}`}
            tooltip="Value of your vault deposits"
          />
          <LargeCardStat
            id="wallet"
            label="Your Wallet"
            value={`${formattedWalletBalance} ${symbol}`}
            secondaryValue={`$ ${formatCurrency(
              Number(walletTokenBalance.formatted) * price
            )}`}
            tooltip="Value of deposit assets held in your wallet"
          />
          <LargeCardStat
            id="APY"
            label="7d APY"
            // tooltip="APY for the last 7 days"
          >
            <div className="flex items-center gap-1">
              <p className="text-2xl lg:text-3xl font-bold whitespace-nowrap text-white leading-0">
                {selectedVaultId === "0xCF18fc631e05BA7DcBCadCd212176C381256FAA8"
                  ? `${((Number(vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d || 0) * 100) + 16.37).toFixed(2)}%`
                  : Number.isNaN(
                      Number(
                        vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)
                          ?.APY7d
                      )
                    )
                  ? "0%"
                  : `${(
                      Number(
                        vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)
                          ?.APY7d
                      ) * 100
                    ).toFixed(2)}%`
                }
              </p>
              {getPointsInfo(vaultData.protocol.name).displayPoints && (
                <div className="flex items-center">
                  <button
                    id={`apy-points-tooltip-${selectedVaultId}`}
                    className="ml-1"
                  >
                    <PointsIcon className="w-8 h-8" color="#06afbc" />
                  </button>
                  <ResponsiveTooltip
                    id={`apy-points-tooltip-${selectedVaultId}`}
                    content={
                      <div className="w-48">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300 text-sm">
                            {getPointsInfo(vaultData.protocol.name).nativeYield}
                          </span>
                          <span className="text-cyan-400 font-medium">
                            {selectedVaultId === "0xCF18fc631e05BA7DcBCadCd212176C381256FAA8" 
                              ? `${((Number(vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d || 0) * 100) + 16.37).toFixed(2)}%`
                              : `${(Number(vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d || 0) * 100).toFixed(2)}%`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300 text-sm">
                            {vaultData.protocol.name === 'YieldFi' ? '+ YieldCrumbs' : '+ Aegis Points'}
                          </span>
                          <span className="text-white font-medium">
                            {getPointsInfo(vaultData.protocol.name).points
                            }
                          </span>
                        </div>
                      </div>
                    }
                  />
                </div>
              )}
            </div>
          </LargeCardStat>
        </div>
      </div>
    </section>
  );
}
