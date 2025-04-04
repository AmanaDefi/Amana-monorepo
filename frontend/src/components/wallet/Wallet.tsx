import React, { useState } from "react";
import { PayEmbed, useActiveWalletChain } from "thirdweb/react";
import { client } from "../../utils/client";
import { useAbstractAccount } from "@/hooks/useAbstractAccount";
import Image from "next/image";
import WalletPortfolio from "./Portfolio";
import { WalletIcon } from "@heroicons/react/24/outline";
import DepositModal from "../modal/DepositModal";
import { ZC_USDC_ETH_ADDRESS } from "../../../../constants";

const Wallet: React.FC = ({ }) => {
    const activeChain = useActiveWalletChain();

    const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);

    const { walletPriceUSD } = useAbstractAccount();

    const openDepositModal = () => {
        setIsDepositModalOpen(true);
    }
    return (
        <div className="flex justify-center mt-16 h-full w-full">
            <div className="flex-1">
                <h1 className="text-xl font-bold">Wallet</h1>
                <div className="flex justify-between items-center gap-3">
                    <div className="font-bold text-3xl">{`$${walletPriceUSD}`}</div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center shadow-lg gap-2 rounded-lg bg-grayBtn p-2 border border-transparent hover:border-borderBtn hover:bg-grayBtnHover duration-300 transition-all cursor-pointer" onClick={openDepositModal}>
                            <WalletIcon width={24} />
                            Deposit
                        </div>
                    </div>
                </div>
                <WalletPortfolio />
                <DepositModal isOpen={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} />
            </div>
        </div>
    );
};

export default Wallet;
