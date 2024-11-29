import React, { useEffect, useState } from "react";
import { VaultData, UserVaultBalance, VaultTotalAssets, VaultAPY } from "../types/types";
import LargeCardStat from "@/components/common/LargeCardStat";
import Image from 'next/image';
import { formatBalance } from '@/utils/utils';
import { client } from "@/utils/client";
import { ethers } from "ethers";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { Address, getContract } from "thirdweb";
import { getBalance } from "thirdweb/extensions/erc20";

export default function VaultHeader({
    vaultData,
    userVaultBalances,
    selectedVaultId,
    vaultTotalAssets,
    vaultAPYs
}: {
    vaultData: VaultData;
    userVaultBalances: UserVaultBalance[];
    selectedVaultId: string
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

    const [walletData, setWalletData] = useState<string>("")

    useEffect(() => {
        const fetchData = async () => {
            const contract = getContract({
                client,
                chain: activeChain,
                address: vaultData.inputToken.address as Address,
            });
            const { value, decimals } = await getBalance({
                contract,
                address: EOAaccount?.address as Address,
            });

            const formattedBalance = ethers.formatUnits(value, decimals);
            setWalletData(formattedBalance)
        };

        // Call the async function
        fetchData();

    }, [])

    const data = formatBalance(Number(0.000000002232243));
    const price = vaultData.inputToken.price;
    const symbol = vaultData.inputToken.symbol;

    return (
        <section className="md:border-b border-customNeutral100 pt-10 pb-6 px-4 md:px-0 ">
            <div className="w-full mb-12 flex flex-row items-center">
                <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
                    <div className="relative">
                        <Image
                            src={vaultData.inputToken.imgURL}
                            alt={vaultData.inputToken.symbol}
                            width={1200} // Adjust to your desired width
                            height={800} // Adjust to your desired height                          
                            className={`w-6 md:w-10 h-6 md:h-10`}
                        />
                    </div>
                    <h2 className="font-bold text-white" >{symbol}</h2>
                    <div className="relative">
                        <Image
                            src={vaultData.protocol.imgURL}
                            alt={vaultData.protocol.name}
                            width={1200} // Adjust to your desired width
                            height={800} // Adjust to your desired height                          
                            className={`w-6 md:w-10 h-6 md:h-10`}
                        />
                    </div>
                    <h2 className="font-bold text-white" >{vaultData.protocol.name}</h2>
                </div>
            </div>
            <div className="w-full md:flex md:flex-row md:justify-between space-y-4 md:space-y-0 mt-4 md:mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-6 md:pr-10 gap-4 md:gap-10">
                    <div>

                        <LargeCardStat
                            id={"deposits"}
                            label="Deposits"
                            value={'$ ' + (Number(data ? data : "0") * (price ? price : 0)).toFixed(6).toString()}
                            secondaryValue={data + " " + symbol}
                            tooltip="Value of your vault deposits"
                        />
                    </div>
                    <div>
                        <LargeCardStat
                            id={"wallet"}
                            label="Your Wallet"
                            value={'$ ' + (Number(walletData) * price).toString()}
                            secondaryValue={walletData + " " + symbol}
                            tooltip="Value of deposit assets held in your wallet"
                        />
                    </div>
                    <div>
                        <LargeCardStat
                            id={"APY"}
                            label="7d APY"
                            value={(Number(vaultAPYs.find((APY7d) => APY7d.vaultId === selectedVaultId)?.APY7d) * 100).toFixed(2) + "%"}
                            tooltip="Value of deposit assets held in your wallet"
                        />
                    </div>
                </div>
            </div>
        </section>
    );

}
