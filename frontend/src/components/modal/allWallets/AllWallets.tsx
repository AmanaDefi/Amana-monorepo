"use client";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import ModalButton from "../shared/ModalButton";
import BackedBy from "../shared/BackedBy";
import { Connector, useConnect } from "wagmi";

import { useFundWalletStore } from "@/store/fundWalletStore";
import { showInfoToast } from "@/toasts";

import { ConnectorIcon } from "./components/ConnectorIcon";
import { chainConfigs } from "@/constants/chainConfig";
import { useEffect, useState } from "react";
import { useWallets } from "@privy-io/react-auth";

const AllWAllets = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 1024);
    };

    checkIsMobile();
    window?.addEventListener("resize", checkIsMobile);

    return () => window?.removeEventListener("resize", checkIsMobile);
  }, []);
  const { step, successAuth, closeAll } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
    setChain
  } = useFundWalletStore();

  const {wallets} = useWallets();
  const activeAccount = wallets[0];

  const fundWalletConnect = () => {
    setStep("confirm");
  };

  const {
    connectors,
    connect,
    isPending: isConnectingWallet,
  } = useConnect({
    mutation: {
      onSuccess: (result) => {
        if (fundWalletStep === "connectWallet") {
          setWalletAddress(result.accounts[0]);
          setChain(chainConfigs[result.chainId]);
          localStorage.removeItem("connectorId");
          return fundWalletConnect();
        }
        return successAuth(null, activeAccount || undefined, true);
      },
    },
  });

  const handleExternalWalletConnect = (connector: Connector) => {
    if (isConnectingWallet) return;
    setActiveConnector(connector);
    localStorage.setItem("connectorId", connector.id);
    connect(
      { connector },
      {
        onError: (error) => {
          console.log(error);

          if (error.name === "ConnectorAlreadyConnectedError") {
            connector.disconnect();
            console.log("connectorId removed from error");
            localStorage.removeItem("connectorId");

            setActiveConnector(null);
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
      isOpen={!isMobile && (step === "allWallets" || fundWalletStep === "connectWallet")}
      onClose={handleClose}
      paddingClass="pt-[28px] w-full pl-[40px] pb-[26px] pr-[24px] flex"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[940px]"
      minHeight="min-h-[560px]"
      customCloseButton={
        <button
          onClick={handleClose}
          className="absolute top-[20px] right-[16px] z-20 rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      }
    >
      <div className="flex w-full flex-col justify-between min-h-[489px]">
        <div className="flex w-full h-[95%] mt-[5%] flex-row justify-between gap-5">
          <div className="flex flex-col justify-between mt-3">
            <ConnectWallet />
          </div>
          <div className="flex flex-col min-w-[50%] overflow-hidden">
            <PopularOptions />
            <div
              style={{ scrollbarColor: "#1B46E0 transparent" }}
              className="overflow-auto h-full mt-6 flex-1"
            >
              <div className="flex max-w-[500px] flex-row flex-wrap gap-2 min-h-fit">
                {connectors.map((connector) => (
                  <ModalButton
                    variant="allWallets"
                    key={connector.id}
                    label={connector.name}
                    icon={
                      <ConnectorIcon
                        connectorId={connector.id}
                        name={connector.name}
                        connectorIcon={connector.icon}
                      />
                    }
                    onClick={() => {
                      handleExternalWalletConnect(connector);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-[26px] left-[50px]">
          <BackedBy />
        </div>
      </div>
    </Modal>
  );
};

export default AllWAllets;
