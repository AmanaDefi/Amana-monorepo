"use client";

import { useAuthStore } from "@/store/authStore";
import ModalButton from "../shared/ModalButton";
import { MobileModal } from "./MobileModal";
import { ConnectorIcon } from "../allWallets/components/ConnectorIcon";

import { Connector, useConnect, useDisconnect } from "wagmi";
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

  const { disconnectAsync } = useDisconnect();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 1024);
    };

    checkIsMobile();
    window?.addEventListener("resize", checkIsMobile);

    return () => window?.removeEventListener("resize", checkIsMobile);
  }, []);

  const {
    walletAddress,
    connectSolana,
    activeChain,
    activeEvmWallet: activeAccount,
  } = useMultiChain();

  const { logout } = usePrivy();

  const {
    connectors,
    connect,
    isPending: isConnectingWallet,
  } = useConnect({
    mutation: {
      onSuccess: (result) => {
        
        if (fundWalletStep === "connectWallet") {
          setWalletAddress(result.accounts[0]);
          return fundWalletConnect();
        }

        const connectedAddress = result.accounts[0];
        return successAuth(connectedAddress, activeAccount || undefined, true);
      },
    },
  });

  const fundWalletConnect = () => {
    setStep("confirm");
  };

  const handleExternalWalletConnect = async (connector: Connector) => {
   
    if (isConnectingWallet) {
      await disconnectAsync();
    }

    if (activeAccount?.walletClientType === "privy") {
      const confirmResult = confirm(
        "You smart wallet account will be disconnected",
      );
      if (!confirmResult) {
        return;
      }

      await logout();
    }

    if (connected) {
      disconnect();
    }

    setActiveConnector(connector);
    localStorage.setItem("connectorId", connector.id);

    const chainId =
      fundWalletStep === "connectWallet"
        ? chain.id
        : (chosenChain?.id ?? activeChain?.id);

    try {
      connect(
        {
          connector,
          chainId,
        },
        {
          onError: (error) => {
            if (error.name === "ConnectorAlreadyConnectedError") {
              connector.disconnect();
              disconnectAsync({ connector });
              setActiveConnector(null);
              showInfoToast("Please try to connect wallet again");
            }
          },
          onSuccess: (result) => {
            console.log("[DEBUG] Connection successful in connect callback:", {
              accounts: result.accounts,
              chainId: result.chainId,
              fundWalletStep,
              timestamp: new Date().toISOString(),
            });
          },
        },
      );
    } catch (error) {
      console.log("[DEBUG] Connection error (try-catch):", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        connectorId: connector.id,
        timestamp: new Date().toISOString(),
      });
    }
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
      if (!confirmResult) {
        console.log("[DEBUG] User cancelled EVM disconnection");
        return;
      }
    }

    setActiveConnector(connector);
    try {
      try {
        await connectSolana();
      } catch (e) {
        console.log("[DEBUG] Connect solana error:", e);
      }
      select(connector.name);
      await solanaConnect();
    } catch (error) {
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

  const EmptyWalletMessage = ({ type }: { type: "EVM" | "Solana" }) => (
    <div className="flex items-center justify-center p-6 bg-gray-800/30 rounded-lg border border-gray-700/50 max-w-[488px]">
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          No {type} wallet extensions found.
        </p>
        <p className="text-gray-500 text-xs mt-1">
          {type === "Solana"
            ? "Install Phantom or Solflare to get started"
            : "Install MetaMask or Coinbase Wallet to get started"}
        </p>
      </div>
    </div>
  );

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
            {shouldShowEVM && (
              <>
                <p className="text-base text-[#3E73C4]">
                  EVM chains connectors
                </p>
                {filteredEvmConnectors.length > 0 ? (
                  filteredEvmConnectors.map((connector) => {
                
                    return (
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
                    );
                  })
                ) : (
                  <EmptyWalletMessage type="EVM" />
                )}
              </>
            )}

            {shouldShowSolana && (
              <>
                <p className="text-base text-[#3E73C4]">
                  Solana chain connectors
                </p>
                {solanaConnectors.length > 0 ? (
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
                  ))
                ) : (
                  <EmptyWalletMessage type="Solana" />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </MobileModal>
  );
};

export default MobileAllWallets;
