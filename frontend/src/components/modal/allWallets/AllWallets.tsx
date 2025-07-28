"use client";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import ConnectWallet from "../shared/ConnectWallet";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import PopularOptions from "../shared/PopularOptions";
import ModalButton from "../shared/ModalButton";
import { Connector, useConnect, useDisconnect } from "wagmi";

import { useFundWalletStore } from "@/store/fundWalletStore";
import { showInfoToast } from "@/toasts";

import { ConnectorIcon } from "./components/ConnectorIcon";
import { CHAIN_ID } from "@/constants/chainConfig";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Adapter,
  WalletAdapter,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { useMultiChain } from "@/providers/MultiChainProvider";

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
  const { step, successAuth, closeAll, chosenChain } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
    chain,
  } = useFundWalletStore();
  const { connectSolana, activeEvmWallet: activeAccount } = useMultiChain();

  const { logout } = usePrivy();
  const { disconnectAsync } = useDisconnect();

  const {
    wallets: solanaAdapters,
    select,
    connect: solanaConnect,
    disconnect,
    publicKey,
    connected,
  } = useWallet();

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
          return fundWalletConnect();
        }

        return successAuth(null, activeAccount || undefined, true);
      },
    },
  });

  const handleExternalWalletConnect = async (connector: Connector) => {
    if (isConnectingWallet) {
      await disconnectAsync();
    }
    if (
      activeAccount?.walletClientType === "privy" &&
      fundWalletStep !== "connectWallet"
    ) {
      const confirmResult = confirm(
        "You smart wallet account will be disconnected",
      );
      if (!confirmResult) return;

      await logout();
    }

    if (connected) {
      disconnect();
    }

    setActiveConnector(connector);
    localStorage.setItem("connectorId", connector.id);
    connect(
      {
        connector,
        chainId:
          fundWalletStep === "connectWallet" ? chain.id : chosenChain?.id,
      },
      {
        onError: (error) => {
          console.log(error);

          if (error.name === "ConnectorAlreadyConnectedError") {
            connector.disconnect();
            disconnectAsync({ connector });

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

  const solanaConnectors = solanaAdapters
    .filter((adapter) => {
      if (
        adapter.adapter.name.toLowerCase() === "metamask" &&
        !(adapter.adapter as WalletAdapter & { wallet?: { client?: any } })
          ?.wallet?.client
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
      solanaConnect();
    } catch (error) {
      console.log(error);

      if (connected) {
        disconnect();

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

  const filteredEvmConnectors = connectors.filter(
    (con) => con.id !== "app.phantom" && con.name.toLowerCase() !== "injected",
  );

  console.log(filteredEvmConnectors);

  return (
    <Modal
      isOpen={
        !isMobile &&
        (step === "allWallets" || fundWalletStep === "connectWallet")
      }
      onClose={handleClose}
      paddingClass="pt-[28px] w-full pl-[57px] pb-10 pr-[24px] flex"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[940px]"
      minHeight="max-h-[560px]"
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
      <div className="flex w-full flex-col justify-between">
        <div className="flex w-full h-[95%] flex-row justify-between gap-5">
          <div className="flex flex-col justify-between mt-3">
            <ConnectWallet />
          </div>
          <div className="flex flex-col min-w-[50%] overflow-hidden">
            <PopularOptions />
            <div
              style={{ scrollbarColor: "#1B46E0 transparent" }}
              className="overflow-auto h-full mt-6 flex-1 flex flex-col gap-3"
            >
              {shouldShowEVM && (
                <div className="flex flex-col gap-3 w-full">
                  <p className="text-lg text-[#3E73C4]">
                    EVM chains connectors
                  </p>
                  <div className="flex max-w-[500px] flex-row flex-wrap gap-2 min-h-fit">
                    {filteredEvmConnectors.map((connector) => (
                      <ModalButton
                        variant="allWallets"
                        key={connector.id}
                        label={`${connector.name}`}
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
              )}
              {shouldShowSolana && (
                <div className="flex flex-col gap-3 w-full">
                  <p className="text-lg text-[#3E73C4]">
                    Solana chain connectors
                  </p>
                  <div className="flex max-w-[500px] flex-row flex-wrap gap-2 min-h-fit">
                    {solanaConnectors.map((connector) => (
                      <ModalButton
                        variant="allWallets"
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
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AllWAllets;
