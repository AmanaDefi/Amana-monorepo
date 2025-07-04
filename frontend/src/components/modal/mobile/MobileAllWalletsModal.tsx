"use client";

import { useAuthStore } from "@/store/authStore";
import ModalButton from "../shared/ModalButton";
import { MobileModal } from "./MobileModal";
import { ConnectorIcon } from "../allWallets/components/ConnectorIcon";

import { Connector, useConnect } from "wagmi";
import { useFundWalletStore } from "@/store/fundWalletStore";
import { showInfoToast } from "@/toasts";
import { useEffect, useState } from "react";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";

const MobileAllWallets = () => {
  const { step, successAuth, closeAll } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
  } = useFundWalletStore();
  
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 1024);
    };

    checkIsMobile();
    window?.addEventListener("resize", checkIsMobile);

    return () => window?.removeEventListener("resize", checkIsMobile);
  }, []);

  const { walletAddress } = useMultiChain();
  const {wallets} = useWallets();
  const activeAccount = wallets[0];
  const { logout } = usePrivy();
  const { disconnect, publicKey } = useWallet();

  const {
    connectors,
    connect,
    isPending: isConnectingWallet,
  } = useConnect({
    mutation: {
      onSuccess: (result) => {
        if (fundWalletStep === "connectWallet") {
          setWalletAddress(result.accounts[0]);
          localStorage.removeItem("connectorId");
          return fundWalletConnect();
        }
        if (publicKey) {
          disconnect();
        }
        return successAuth(walletAddress, activeAccount || undefined, true);
      },
    },
  });

  const fundWalletConnect = () => {
    setStep("confirm");
  };

  const handleExternalWalletConnect = async (connector: Connector) => {
    if (isConnectingWallet) return;
    if (activeAccount?.walletClientType === "privy") {
      const confirmResult = confirm(
        "You smart wallet account will be disconnected",
      );
      if (!confirmResult) return;

      await logout();
    }
    setActiveConnector(connector);
    localStorage.setItem("connectorId", connector.id);
    connect(
      { connector },
      {
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
    <MobileModal
      isOpen={isMobile && (step === "mobileAllWallets" || fundWalletStep === "connectWallet")}
      onClose={handleClose}
      height="full"
      maxHeight="max-h-[484px]"
      paddingClass="p-5 pb-0"
      showHeader={true}
    >
      <div className="flex flex-col h-full pt-14 pb-6">
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
