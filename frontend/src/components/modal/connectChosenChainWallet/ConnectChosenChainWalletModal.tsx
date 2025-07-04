"use client";

import { Modal } from "../base/Modal";
import { useAuthStore } from "@/store/authStore";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import ModalButton from "../shared/ModalButton";
import { Connector, useConnect } from "wagmi";

import { useFundWalletStore } from "@/store/fundWalletStore";
import { showInfoToast } from "@/toasts";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Adapter,
  WalletAdapter,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { ConnectorIcon } from "../allWallets/components/ConnectorIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { CHAIN_ID } from "@/constants/chainConfig";

const ConnectChosenChain = () => {
  const { selectedChain, activeChain, connectSolana } =
    useMultiChain();

  const { step, successAuth, closeAll, chosenChain } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
    chain,
  } = useFundWalletStore();

  const { wallets } = useWallets();
  const { logout } = usePrivy();
  const activeAccount = wallets[0];

  const {
    wallets: solanaAdapters,
    select,
    connect: solanaConnect,
    disconnect,
    publicKey,
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
      onSuccess: async (result) => {
        if (fundWalletStep === "reconnectChain") {
          setWalletAddress(result.accounts[0]);
          localStorage.removeItem("connectorId");
          return fundWalletConnect();
        }
        if (step === "connectInChosenChain" && publicKey) {
          disconnect();
        }
        return successAuth(null, activeAccount || undefined, true);
      },
    },
  });

  const handleExternalWalletConnect = async (connector: Connector) => {
    if (isConnectingWallet) return;
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
    setActiveConnector(connector);
    localStorage.setItem("connectorId", connector.id);

    connect(
      {
        connector,
        chainId:
          fundWalletStep === "reconnectChain" ? chain.id : activeChain?.id,
      },
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

      if (connector.connected) {
        connector.disconnect();

        setActiveConnector(null);
        showInfoToast("Please try to connect wallet again");
      }
    }
  };

  const shouldShowEvnWallets =
    (selectedChain === "evm" &&
      !activeAccount?.address &&
      activeChain?.id !== CHAIN_ID["solana"]) ||
    activeChain?.id !== CHAIN_ID["solana"];

  return (
    <Modal
      isOpen={
        step === "connectInChosenChain" || fundWalletStep === "reconnectChain"
      }
      onClose={handleClose}
      paddingClass="pt-[90px] w-full pl-[57px] pb-10 pr-[24px] flex max-h-[80%] md:max-h-[700px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[526px]"
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
      <div className="flex w-full items-center flex-col overflow-hidden gap-8">
        <p className="text-base text-white">
          Connect your wallet in chosen chain
        </p>
        <div
          style={{ scrollbarColor: "#1B46E0 transparent" }}
          className="overflow-auto h-full w-[260px] mt-6 flex-1 flex flex-col "
        >
          {shouldShowEvnWallets ? (
            <div className="flex flex-col gap-4 min-h-fit ">
              {connectors.map((connector) => (
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
          ) : (
            <div className="flex flex-col gap-4 min-h-fit">
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
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ConnectChosenChain;
