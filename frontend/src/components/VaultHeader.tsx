import React, { useEffect, useState } from "react";
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
  
  // Debug full userVaultBalance object
  console.log("Full userVaultBalance:", userVaultBalance);
  
  // Determine input token based on user selection or active chain
  useEffect(() => {
    if (selectedToken) {
      // If there's a user-selected token, use it
      setInputToken(selectedToken);
    } else if (activeChain?.id === 7000 || activeChain?.id === 7001) {
      // Fallback: If on ZetaChain, use vault input token
      setInputToken(vaultData.inputToken);
    } else {
      // Fallback: For other chains, determine the appropriate token
      setInputToken(
        determineVaultTokenFromApprovedTokens(
          activeChain?.id as number,
          vaultData.inputToken
        )
      );
    }
  }, [activeChain, vaultData, selectedToken]);

  const { balance: walletTokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  const symbol = inputToken?.symbol || "";
  const price = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol) || 0;

  // Format wallet balance according to token type
  const formattedWalletBalance = formatTokenBalance(walletTokenBalance.formatted, symbol);

  useEffect(() => {
    // Update deposit amount whenever the vault balance changes
    if (userVaultBalance) {
      console.log("User vault balance type:", typeof userVaultBalance);
      
      // Handle when userVaultBalance is a simple string (direct from fetchUserVaultBalance)
      if (typeof userVaultBalance === 'string') {
        console.log("Using string balance:", userVaultBalance);
        setDepositAmount(userVaultBalance);
      } 
      // Handle when userVaultBalance is a Balance object
      else if (typeof userVaultBalance === 'object') {
        console.log("userVaultBalance keys:", Object.keys(userVaultBalance));
        
        if (userVaultBalance.formatted) {
          console.log("Using formatted value:", userVaultBalance.formatted);
          setDepositAmount(userVaultBalance.formatted);
        } else if ('value' in userVaultBalance && userVaultBalance.value) {
          console.log("Using value property:", userVaultBalance.value);
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
              />
            </div>
            <h2 className="font-bold text-white">{vaultData.name}</h2>
          </div>
        </div>
      </div>
      <div className="w-full md:flex md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:pr-10 gap-4 md:gap-20">
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
            value={
              Number.isNaN(
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
            tooltip="APY for the last 7 days"
          />
        </div>
      </div>
    </section>
  );
}
