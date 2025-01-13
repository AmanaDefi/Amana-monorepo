import React, { useEffect, useState } from "react";
import { VaultData, UserVaultBalance, VaultTotalAssets, VaultAPY, Token } from "../types/types";
import LargeCardStat from "@/components/common/LargeCardStat";
import Image from 'next/image';
import { formatBalance, formatCurrency } from '@/utils/utils';
import { client } from "@/utils/client";
import { ethers } from "ethers";
import { useActiveAccount, useActiveWalletChain, useWalletBalance } from "thirdweb/react";
import { Address, getContract } from "thirdweb";
import { getBalance } from "thirdweb/extensions/erc20";
import { APPROVED_TOKENS } from "../constants/chainConfig";

export default function VaultHeader({
    vaultData,
    userVaultBalance,
    selectedVaultId,
    vaultTotalAsset,
    vaultAPYs,
}: {
    vaultData: VaultData;
    userVaultBalance?: string;
    selectedVaultId: string;
    vaultTotalAsset?: VaultTotalAssets;
    vaultAPYs: VaultAPY[];
}): JSX.Element {
    const activeChain = useActiveWalletChain();
    const EOAaccount = useActiveAccount();

    if (!EOAaccount) {
        throw new Error("No active account found");
    }

    if (!activeChain) {
        throw new Error("No active chain found");
    }

    const userAddress = EOAaccount.address;
    const { data: walletBalance, isLoading, isError } = useWalletBalance({
        chain: activeChain,
        address: userAddress,
        client,
    });
    const [inputToken, setInputToken] = useState<Token | undefined>();
    const [walletData, setWalletData] = useState<string>("");
    const [data1, setdata1] = useState('')

    // Step 1: Determine inputToken based on activeChain
    useEffect(() => {
        if (activeChain.id === 7001) {
            setInputToken(vaultData.inputToken);
        } else {
            const approvedTokens = APPROVED_TOKENS[activeChain.id];
            setInputToken(approvedTokens ? approvedTokens[0] : vaultData.inputToken);
        }
    }, [activeChain, vaultData]);

    

    useEffect(() => {
        setdata1(formatBalance(
            Number(userVaultBalance)
        ))
    }, [userVaultBalance])
    

    // Step 2: Fetch wallet data when inputToken is set
    useEffect(() => {
        if (!inputToken) return;

        const fetchData = async () => {
            try {
                console.log("Value of inputToken: ", inputToken);

                if (inputToken.isNative) {
                    if (!isLoading && !isError && walletBalance) {
                        setWalletData(walletBalance.displayValue);
                    } else {
                        setWalletData("0");
                    }
                } else {
                    const contract = getContract({
                        client,
                        chain: activeChain,
                        address: inputToken.address as Address,
                    });
                    const { value, decimals } = await getBalance({
                        contract,
                        address: userAddress as Address,
                    });
                    const formattedBalance = ethers.formatUnits(value, decimals);
                    setWalletData(formattedBalance);
                }
            } catch (error) {
                console.error("Error fetching wallet data: ", error);
            }
        };

        fetchData();
    }, [inputToken, userAddress, activeChain, data1]);

    // Handle undefined states gracefully
    if (!inputToken) {
        return <p>Loading...</p>;
    }



    const price = inputToken.price || 0;
    const symbol = inputToken.symbol || "";

    return (
        <section className="md:border-b border-customNeutral100 pt-10 pb-6 px-4 md:px-0 ">
            <div className="w-full mb-12 flex flex-row items-center">
                <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
                    <div className="relative">
                        <Image
                            src={inputToken.imgURL}
                            alt={symbol}
                            width={1200}
                            height={800}
                            className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
                        />
                    </div>
                    <h2 className="font-bold text-white">{symbol}</h2>
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
            </div>
            <div className="w-full md:flex md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 md:pr-10 gap-4 md:gap-20">
                    <LargeCardStat
                        id="deposits"
                        label="Deposits"
                        value={`${formatBalance(Number(data1))} ${vaultData.symbol}`}
                        secondaryValue={`$ ${formatCurrency(Number(data1) * price)}`}
                        tooltip="Value of your vault deposits"
                    />
                    <LargeCardStat
                        id="wallet"
                        label="Your Wallet"
                        value={`${formatBalance(Number(walletData))} ${symbol}`}
                        secondaryValue={`$ ${formatCurrency(Number(walletData) * price)}`}
                        tooltip="Value of deposit assets held in your wallet"
                    />
                    <LargeCardStat
                        id="APY"
                        label="7d APY"
                        value={
                            Number.isNaN(Number(vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d) * 100)
                                ? "0%"
                                : `${(Number(vaultAPYs.find((apy) => apy.vaultId === selectedVaultId)?.APY7d) * 100).toFixed(2)}%`
                        }
                        tooltip="APY for the last 7 days"
                    />
                </div>
            </div>
        </section>
    );
}
