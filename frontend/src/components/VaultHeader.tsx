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
    userVaultBalances,
    selectedVaultId,
    vaultTotalAssets,
    vaultAPYs
}: {
    vaultData: VaultData;
    userVaultBalances: UserVaultBalance[];
    selectedVaultId: string;
    vaultTotalAssets: VaultTotalAssets[];
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

    const [inputToken, setInputToken] = useState<Token>(vaultData.inputToken);
    const [walletData, setWalletData] = useState<string>("");

    // Determine which token to use based on the active chain
    useEffect(() => {
        if (activeChain.id === 7001) {
            // If on ZetaChain testnet, set inputToken to the vault token
            setInputToken(vaultData.inputToken);
        } else {
            // On other chains, use APPROVED_TOKENS to set available tokens
            const approvedTokens = APPROVED_TOKENS[activeChain.id];
            setInputToken(approvedTokens ? approvedTokens[0] : vaultData.inputToken);
        }
    }, [activeChain, vaultData]);

    const { data: walletBalance, isLoading, isError } = useWalletBalance({
        chain: activeChain,
        address: userAddress,
        client
    });

    useEffect(() => {
        const fetchData = async () => {
            if (inputToken.isNative) {
                if (!isLoading && !isError && walletBalance) {
                    // If it's a native token, use the wallet balance
                    setWalletData(Number(walletBalance.displayValue).toFixed(2) || "0.00");
                }
            } else {
                // If it's an ERC-20 token, use getContract and getBalance
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
                setWalletData(Number(formattedBalance).toFixed(2));
            }
        };

        // Call the async function to fetch balance data
        fetchData();

    }, [inputToken, userAddress, activeChain, walletBalance, isLoading, isError]);

    const data = formatBalance(Number(userVaultBalances.find((balance) => balance.vaultId === selectedVaultId)?.balance));
    const price = inputToken.price;
    const symbol = inputToken.symbol;

    return (
        <section className="md:border-b border-customNeutral100 pt-10 pb-6 px-4 md:px-0 ">
            <div className="w-full mb-12 flex flex-row items-center">
                <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
                    <div className="relative">
                        <Image
                            src={inputToken.imgURL}
                            alt={inputToken.symbol}
                            width={1200} // Adjust to your desired width
                            height={800} // Adjust to your desired height                          
                            className={`w-6 md:w-10 h-6 md:h-10`}
                        />
                    </div>
                    <h2 className="font-bold text-white">{symbol}</h2>
                    <div className="relative">
                        <Image
                            src={vaultData.protocol.imgURL}
                            alt={vaultData.protocol.name}
                            width={1200} // Adjust to your desired width
                            height={800} // Adjust to your desired height                          
                            className={`w-6 md:w-10 h-6 md:h-10`}
                        />
                    </div>
                    <h2 className="font-bold text-white">{vaultData.protocol.name}</h2>
                </div>
            </div>
            <div className="w-full md:flex md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 md:pr-10 gap-4 md:gap-20">
                    <div>
                        <LargeCardStat
                            id={"deposits"}
                            label="Deposits"
                            value={formatCurrency(Number(data)).toString() + " " + vaultData.symbol}
                            secondaryValue={'$ ' + formatCurrency((Number(data ? data : "0") * (price ? price : 0))).toString()}
                            tooltip="Value of your vault deposits"
                        />
                    </div>
                    <div>
                        <LargeCardStat
                            id={"wallet"}
                            label="Your Wallet"
                            value={formatCurrency(Number(walletData)).toString() + " " + symbol}
                            secondaryValue={'$ ' + formatCurrency((Number(walletData) * price)).toString()}
                            tooltip="Value of deposit assets held in your wallet"
                        />
                    </div>
                    <div>
                        <LargeCardStat
                            id={"APY"}
                            label="7d APY"
                            value={
                                Number.isNaN(Number(vaultAPYs.find((APY7d) => APY7d.vaultId === selectedVaultId)?.APY7d) * 100) ? "0.00%" :
                                    (Number(vaultAPYs.find((APY7d) => APY7d.vaultId === selectedVaultId)?.APY7d) * 100).toFixed(2) + "%"}
                            tooltip="Value of deposit assets held in your wallet"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
