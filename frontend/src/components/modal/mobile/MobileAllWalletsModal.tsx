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
import {
  Adapter,
  WalletAdapter,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { CHAIN_ID } from "@/constants/chainConfig";

const MobileAllWallets = () => {
  const { step, successAuth, closeAll, chosenChain } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
    chain,
  } = useFundWalletStore();

  const {
    wallets: solanaAdapters,
    select,
    connect: solanaConnect,
    disconnect,
    connected,
  } = useWallet();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 1024);
    };

    checkIsMobile();
    window?.addEventListener("resize", checkIsMobile);

    return () => window?.removeEventListener("resize", checkIsMobile);
  }, []);

  const { walletAddress, connectSolana, activeChain } = useMultiChain();
  const { wallets } = useWallets();
  const activeAccount = wallets[0];
  const { logout } = usePrivy();

  const {
    connectors,
    connect,
    isPending: isConnectingWallet,
  } = useConnect({
    mutation: {
      onSuccess: (result) => {
        if (connected) {
          disconnect();
        }
        if (fundWalletStep === "connectWallet") {
          setWalletAddress(result.accounts[0]);
          localStorage.removeItem("connectorId");
          return fundWalletConnect();
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
      {
        connector,
        chainId:
          fundWalletStep === "connectWallet"
            ? chain.id
            : (chosenChain?.id ?? activeChain?.id),
      },
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

  const filteredEvmConnectors = connectors.filter(
    (con) => con.id !== "app.phantom" && con.name.toLowerCase() !== "injected",
  );

  const solanaConnectors = solanaAdapters
    .filter((adapter) => {
      if (
        (adapter.adapter.name.toLowerCase() === "metamask" &&
          !(adapter.adapter as WalletAdapter & { wallet?: { client?: any } })
            ?.wallet?.client) ||
        adapter.adapter.name.toLowerCase() === "phantom"
      ) {
        return false;
      }
      return adapter.readyState === WalletReadyState.Installed;
    })
    .map((adapter) => adapter.adapter);

  const handleSolanaConnect = async (connector: Adapter) => {
    if (activeAccount && fundWalletStep !== "connectWallet") {
      const confirmResult = confirm("You evm wallet will be disconnected");
      if (!confirmResult) return;
    }
    setActiveConnector(connector);
    try {
      try {
        await connectSolana();
      } catch (e) {
        console.log("connect solana error");
      }
      select(connector.name);
      await solanaConnect();
    } catch (error) {
      console.log(error);

      if (connector.connected) {
        connector.disconnect();

        setActiveConnector(null);
        showInfoToast("Please try to connect wallet again");
      }
    }
  };

  const shouldShowSolana = fundWalletStep
    ? fundWalletStep && chain.id === CHAIN_ID["solana"]
    : true;

  const shouldShowEVM = fundWalletStep
    ? fundWalletStep && chain.id !== CHAIN_ID["solana"]
    : true;

  return (
    <MobileModal
      isOpen={
        isMobile &&
        (step === "mobileAllWallets" || fundWalletStep === "connectWallet")
      }
      onClose={handleClose}
      height="h-full"
      maxHeight="max-h-[484px]"
      paddingClass="p-5 pb-0 flex h-full"
      showHeader={true}
    >
      <div className="flex flex-col overflow-hidden h-full w-full pt-14 pb-6">
        <div
          style={{ scrollbarColor: "#1B46E0 transparent" }}
          className="overflow-auto flex flex-1 scrollbar-thin flex-col items-center"
        >
          <div className="flex flex-col gap-4 items-center justify-center">
            {shouldShowEVM &&
              filteredEvmConnectors.map((connector) => (
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

            {shouldShowSolana &&
              solanaConnectors.map((connector) => (
                <ModalButton
                  key={connector.name}
                  label={connector.name}
                  icon={
                    <ConnectorIcon
                      connectorId={connector.name}
                      name={connector.name}
                      connectorIcon={connector.icon}
                    />
                  }
                  onClick={() => {
                    handleSolanaConnect(connector);
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
