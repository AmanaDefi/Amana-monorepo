"use client";

import { Modal } from "../Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import SmartWalletIcon from "@/components/svg/SmartWalletIcon";
import ModalButton from "../shared/ModalButton";
import AllWalletsIcon from "@/components/svg/AllWalletsIcon";
import BackedBy from "../shared/BackedBy";
import MetaMaskIcon from "@/components/svg/MetaMaskIcon";
import WalletConnectIcon from "@/components/svg/WalletConnectIcon";
import SolflareWalletIcon from "@/components/svg/SolflareWallet";
import PhantomIcon from "@/components/svg/PhantomIcon";
import CoinbaseWalletIcon from "@/components/svg/CoinbaseWalletIcon";
import OKXWalletIcon from "@/components/svg/OKXWalletIcon";
import UniswapIcon from "@/components/svg/UniswapIcon";

const AllWAllets = () => {
  const { step, closeAll, openStep } = useAuthStore();

  return (
    <Modal
      isOpen={step === "allWallets"}
      onClose={closeAll}
      paddingClass="pt-[28px] pl-[50px] pb-[26px] pr-[24px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[940px]"
      minHeight="min-h-[560px]"
      customCloseButton={
        <button
          onClick={closeAll}
          className="absolute top-[20px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      }
    >
      <div className="flex flex-col justify-between min-h-[489px]">
        <div className="flex max-w-[761px] flex-row gap-[56px]">
          <div className="flex flex-col justify-between mt-3">
            <ConnectWallet />
          </div>
          <div className="flex flex-col ">
            <PopularOptions />
            <div className="flex flex-col gap-4 mt-6">
              <div className="flex flex-row gap-[11px]">
                <ModalButton
                  label="MetaMask"
                  icon={<MetaMaskIcon width={35} height={32} />}
                />
                <ModalButton
                  label="WalletConnect"
                  icon={<WalletConnectIcon width={24} height={16} />}
                  onClick={() => {}}
                />
              </div>
              <div className="flex flex-row gap-[11px]">
                <ModalButton
                  label="Solflare Wallet"
                  icon={<SolflareWalletIcon width={32} height={32} />}
                  onClick={() => {}}
                />
                <ModalButton
                  label="Phantom"
                  icon={<PhantomIcon width={24} height={20} />}
                  onClick={() => {}}
                />
              </div>
            </div>
            <div className="mt-10">
              <p className="mb-4 text-sm font-normal color-[#535E73]">
                Other options
              </p>
              <div className="flex flex-col gap-4 mt-6">
                <div className="flex flex-row gap-[11px]">
                  <ModalButton
                    label="Uniswap"
                    icon={<UniswapIcon width={24} height={24} />}
                  />
                  <ModalButton
                    label="Coinbase Wallet"
                    icon={<CoinbaseWalletIcon width={24} height={24} />}
                    onClick={() => {}}
                  />
                </div>
                <div className="flex flex-row gap-[11px]">
                  <ModalButton
                    label="OKX Wallet"
                    icon={<OKXWalletIcon width={24} height={24} />}
                    onClick={() => {}}
                  />
                  <ModalButton
                    label="All Wallets (500+)"
                    icon={<AllWalletsIcon width={28} height={27} />}
                    onClick={() => {}}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <BackedBy />
        </div>
      </div>
    </Modal>
  );
};

export default AllWAllets;
