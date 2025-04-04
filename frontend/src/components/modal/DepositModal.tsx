import { XMarkIcon } from "@heroicons/react/24/outline";
import { PayEmbed, useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import CopyTextButton from "../common/CopyTextButton";
import { client } from "@/utils/client";
import { ZC_USDC_ETH_ADDRESS } from "../../../../constants";

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {

    if (!isOpen) return null;
    const account = useActiveAccount();
    const activeChain = useActiveWalletChain();
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-md">
            <div className="relative gap-4 flex flex-col">
                <button
                    className="absolute top-4 right-4 rounded-md bg-grayBtn border border-transparent hover:border-borderBtn hover:bg-grayBtnHover duration-300 transition-all z-10"
                    onClick={onClose}
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                {activeChain &&
                    <PayEmbed client={client}
                        payOptions={{
                            mode: "fund_wallet",
                            // prefillBuy: {
                            //     // token: {
                            //     //   address: ZC_USDC_ETH_ADDRESS,
                            //     //   name: "Base Sepolia USDC",
                            //     //   symbol: "USDC",
                            //     //   icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
                            //     // },
                            //     chain: activeChain,
                            //     allowEdits: {
                            //         amount: true, // allow editing buy amount
                            //         token: false, // disable selecting buy token
                            //         chain: false, // disable selecting buy chain
                            //     },
                            // },
                            buyWithCrypto: {
                                prefillSource: {
                                    allowEdits: {
                                        chain: false,
                                        token: true,
                                    },
                                    chain: activeChain,
                                    token: {
                                        address: ZC_USDC_ETH_ADDRESS,
                                        name: "Base USDC",
                                        symbol: "USDC",
                                    }
                                }
                            },
                            // buyWithFiat:
                            // {
                            // },
                            metadata: { name: "Fund Wallet" },
                        }}
                    />}
            </div>
        </div>
    );
}