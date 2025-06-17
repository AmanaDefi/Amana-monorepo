"use client";

import { Modal } from "../base/Modal";
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
import { useConnect } from "@account-kit/react";
import { Connector } from "wagmi";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { showInfoToast } from "@/toasts";

const AllWAllets = () => {
  const { step, successAuth, closeAll } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
  } = useFundWalletStore();
  const { connectors, connect, isPending: isConnectingWallet } = useConnect();
  const walletConnectConnector = connectors.findLast(
    (con) => con.id === "walletConnect",
  );
  const metaMaskConnector = connectors.find((con) => con.id === "io.metamask");
  const uniSwapConnector = connectors.find(
    (con) => con.id === "org.uniswap.app",
  );
  const coinbaseConnector = connectors.find(
    (con) => con.id === "com.coinbase.wallet",
  );
  const okxConnector = connectors.find((con) => con.id === "com.okex.wallet");

  //Solana providers
  const solflareConnector = connectors.find((con) => con.id === ""); //We have no this connector on evm
  const phantomConnector = connectors.find((con) => con.id === "app.phantom");

  const fundWalletConnect = () => {
    setStep("confirm");
  };

  const handleExternalWalletConnect = (connector: Connector) => {
    if (isConnectingWallet) return;
    connect(
      { connector },
      {
        onSuccess: (result) => {
          if (fundWalletStep === "connectWallet") {
            setActiveConnector(connector);
            setWalletAddress(result.accounts[0]);
            return fundWalletConnect();
          }
          return successAuth();
        },
        onError: (error) => {
          console.log(error);

          if (error.name === "ConnectorAlreadyConnectedError") {
            connector.disconnect();

            showInfoToast("Please try to connect wallet again");
          }
        },
      },
    );
  };

  const handleClose = () => {
    if (fundWalletStep === "connectWallet") {
      setStep("setValues");
    } else {
      closeAll();
    }
  };

  return (
    <Modal
      isOpen={step === "allWallets" || fundWalletStep === "connectWallet"}
      onClose={handleClose}
      paddingClass="pt-[28px] w-full pl-[40px] pb-[26px] pr-[24px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[940px]"
      minHeight="min-h-[560px]"
      customCloseButton={
        <button
          onClick={handleClose}
          className="absolute top-[20px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      }
    >
      <div className="flex w-full flex-col justify-between min-h-[489px]">
        <div className="flex w-full flex-row justify-between gap-5">
          <div className="flex flex-col justify-between mt-3">
            <ConnectWallet />
          </div>
          <div className="flex flex-col min-w-[50%]">
            <PopularOptions />
            <div className="flex max-w-[500px] flex-row flex-wrap gap-2 mt-6">
              {metaMaskConnector && (
                <ModalButton
                  label="MetaMask"
                  icon={<MetaMaskIcon width={35} height={32} />}
                  onClick={() => {
                    handleExternalWalletConnect(metaMaskConnector);
                  }}
                />
              )}
              <ModalButton
                label="WalletConnect"
                icon={<WalletConnectIcon width={24} height={16} />}
                onClick={() => {
                  if (walletConnectConnector) {
                    handleExternalWalletConnect(walletConnectConnector);
                  } else {
                    console.log("no WalletConnect connector");
                  }
                }}
              />
              {solflareConnector && (
                <ModalButton
                  label="Solflare Wallet"
                  icon={<SolflareWalletIcon width={32} height={32} />}
                  onClick={() => {
                    handleExternalWalletConnect(solflareConnector);
                  }}
                />
              )}
              {phantomConnector && (
                <ModalButton
                  label="Phantom"
                  icon={<PhantomIcon width={24} height={20} />}
                  onClick={() => {
                    handleExternalWalletConnect(phantomConnector);
                  }}
                />
              )}
            </div>
            <div className="mt-10">
              <p className="mb-4 text-sm font-normal text-[#535E73]">
                Other options
              </p>
              <div className="flex w-full flex-row flex-wrap gap-2 mt-6">
                {uniSwapConnector && (
                  <ModalButton
                    label="Uniswap"
                    icon={<UniswapIcon width={24} height={24} />}
                    onClick={() => {
                      handleExternalWalletConnect(uniSwapConnector);
                    }}
                  />
                )}
                {coinbaseConnector && (
                  <ModalButton
                    label="Coinbase Wallet"
                    icon={<CoinbaseWalletIcon width={24} height={24} />}
                    onClick={() => {
                      handleExternalWalletConnect(coinbaseConnector);
                    }}
                  />
                )}

                {okxConnector && (
                  <ModalButton
                    label="OKX Wallet"
                    icon={<OKXWalletIcon width={24} height={24} />}
                    onClick={() => {
                      handleExternalWalletConnect(okxConnector);
                    }}
                  />
                )}
                <ModalButton
                  label="All Wallets (500+)"
                  icon={<AllWalletsIcon width={28} height={27} />}
                  onClick={() => {
                    if (walletConnectConnector) {
                      handleExternalWalletConnect(walletConnectConnector);
                    } else {
                      console.log("no WalletConnect connector");
                    }
                  }}
                />
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
