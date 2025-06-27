"use client";

import { useAuthStore } from "@/store/authStore";
import ModalButton from "../shared/ModalButton";
import { MobileModal } from "./MobileModal";
import { ConnectorIcon } from "../allWallets/components/ConnectorIcon";
import { useConnect, useUser } from "@account-kit/react";
import { Connector } from "wagmi";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { showInfoToast } from "@/toasts";
import { useMultiChain } from "@/providers/MultiChainProvider";

const MobileAllWallets = () => {
  const { step, successAuth, closeAll } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
  } = useFundWalletStore();

  const { walletAddress } = useMultiChain();
  const activeAccount = useUser();

  const {
    connectors,
    connect,
    isPending: isConnectingWallet,
  } = useConnect({
    onSuccess: (result) => {
      if (fundWalletStep === "connectWallet") {
        setWalletAddress(result.accounts[0]);
        return fundWalletConnect();
      }
      return successAuth(walletAddress, activeAccount || undefined, true);
    },
    onError: (error) => {
      console.log(error);

      if (error.name === "ConnectorAlreadyConnectedError") {
        const connectedConnector = connectors.find(
          (c) => c.id === localStorage.getItem("connectorId"),
        );
        if (connectedConnector) {
          connectedConnector.disconnect();
          localStorage.removeItem("connectorId");
          setActiveConnector(null);
        }
        showInfoToast("Please try to connect wallet again");
      }
    },
  });

  const fundWalletConnect = () => {
    setStep("confirm");
  };

  const handleExternalWalletConnect = (connector: Connector) => {
    if (isConnectingWallet) return;
    setActiveConnector(connector);
    localStorage.setItem("connectorId", connector.id);
    connect({ connector });
  };

  const handleClose = () => {
    if (fundWalletStep === "connectWallet") {
      setStep("setValues");
    } else {
      closeAll();
    }
  };

  return (
    <MobileModal
      isOpen={step === "mobileAllWallets" || fundWalletStep === "connectWallet"}
      onClose={handleClose}
      height="full"
      maxHeight="max-h-[484px]"
      paddingClass="p-5 pb-0"
      showHeader={true}
    >
      <div className="flex flex-col h-full pt-14">
        <div
          style={{ scrollbarColor: "#1B46E0 transparent" }}
          className="overflow-auto flex-1 scrollbar-thin"
        >
          <div className="flex flex-col gap-4 items-center justify-center">
            {connectors.map((connector) => (
              <ModalButton
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
    </MobileModal>
  );
};

export default MobileAllWallets;
