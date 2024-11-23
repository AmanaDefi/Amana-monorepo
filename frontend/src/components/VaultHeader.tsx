import React from 'react'
import { VaultData, UserVaultBalance, VaultTotalAssets, VaultAPY } from "../types/types";
import LargeCardStat from "@/components/common/LargeCardStat";


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

    return (
        <section className="md:border-b border-customNeutral100 pt-10 pb-6 px-4 md:px-0 ">
            <div className="w-full mb-12 flex flex-row items-center">
                <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
                    <div className="relative">
                        <img
                            src={vaultData.inputToken.imgURL}
                            className={`w-6 md:w-10 h-6 md:h-10`}
                        />
                    </div>
                    <h2 className="font-bold text-white" >{vaultData.inputToken.symbol}</h2>
                    <div className="relative">
                        <img
                            src={vaultData.protocol.imgURL}
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
                            value={Number(vaultTotalAssets.find((asset) => asset.vaultId === selectedVaultId)?.totalAssets).toFixed(2)}
                            secondaryValue={Number(vaultTotalAssets.find((asset) => asset.vaultId === selectedVaultId)?.totalAssets).toFixed(2)}
                            tooltip="Value of your vault deposits"
                        />
                    </div>
                    <div>
                        <LargeCardStat
                            id={"wallet"}
                            label="Your Wallet"
                            value={Number(userVaultBalances.find((balance) => balance.vaultId === selectedVaultId)?.balance).toFixed(2)}
                            secondaryValue={Number(userVaultBalances.find((balance) => balance.vaultId === selectedVaultId)?.balance).toFixed(2)}
                            tooltip="Value of deposit assets held in your wallet"
                        />
                    </div>
                    <div>
                        <LargeCardStat
                            id={"APY"}
                            label="7d APY"
                            value={(Number(vaultAPYs.find((APY7d) => APY7d.vaultId === selectedVaultId)?.APY7d) * 100).toFixed(2)}
                            secondaryValue={Number(userVaultBalances.find((balance) => balance.vaultId === selectedVaultId)?.balance).toFixed(2)}
                            tooltip="Value of deposit assets held in your wallet"
                        />
                    </div>
                </div>
            </div>
        </section>
    );

}
