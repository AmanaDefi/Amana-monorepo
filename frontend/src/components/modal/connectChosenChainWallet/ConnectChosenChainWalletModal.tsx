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
import { useEffect } from "react";

const ConnectChosenChain = () => {
  const { selectedChain, activeChain, connectSolana } = useMultiChain();

  const { step, successAuth, closeAll, chosenChain } = useAuthStore();
  const {
    step: fundWalletStep,
    setStep,
    setActiveConnector,
    setWalletAddress,
    chain,
  } = useFundWalletStore();

  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const { logout } = usePrivy();
  const activeAccount = filteredWallets[0];

  const {
    wallets: solanaAdapters,
    select,
    disconnect,
    connected,
    wallet,
  } = useWallet();

  const solanaWalletAdapter: Adapter | null = wallet
    ? (wallet.adapter as Adapter)
    : null;

  const fundWalletConnect = () => {
    setStep("selectChain");
    closeAll();
  };

  const {
    connectors,
    connect,
    isPending: isConnectingWallet,
  } = useConnect({
    mutation: {
      onSuccess: async (result) => {
        setWalletAddress(result.accounts[0]);
        localStorage.removeItem("connectorId");

        closeAll();

        if (!fundWalletStep) {
          successAuth(null, activeAccount || undefined, true);
        }
      },
    },
  });

  const handleExternalWalletConnect = async (connector: Connector) => {
    if (isConnectingWallet) return;
    if (
      activeAccount?.walletClientType === "privy" &&
      fundWalletStep !== "connectWallet" &&
      !fundWalletStep
    ) {
      const confirmResult = confirm(
        "Your smart wallet account will be disconnected",
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
          fundWalletStep === "reconnectChain"
            ? chain.id
            : chosenChain?.id || activeChain?.id,
      },
      {
        onError: (error) => {
          console.log(error);

          if (error.name === "ConnectorAlreadyConnectedError") {
            connector.disconnect();
            localStorage.removeItem("connectorId");

            setActiveConnector(null);
            showInfoToast("Please try to connect wallet again");
          } else {
            setActiveConnector(null);
            showInfoToast(
              `EVM connection failed: ${error.message || "Unknown error"}`,
            );
          }
        },
      },
    );
  };

  const handleClose = () => {
    if (fundWalletStep) {
      fundWalletConnect();
    } else {
      closeAll();
    }
  };

  const shouldShowEvnWallets =
    (selectedChain === "evm" &&
      !activeAccount?.address &&
      (chosenChain || activeChain)?.id !== CHAIN_ID["solana"]) ||
    (chosenChain || activeChain)?.id !== CHAIN_ID["solana"];

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

  const filteredEvmConnectors = connectors.filter(
    (con) => con.id !== "app.phantom" && con.name.toLowerCase() !== "injected",
  );

  const handleSolanaConnect = async (connector: Adapter) => {
    setActiveConnector(connector);
    try {
      await connectSolana();
      select(connector.name);

      closeAll();
    } catch (error) {
      console.error("Error during Solana wallet selection preparation:", error);
      setActiveConnector(null);
      closeAll();
    }
  };

  useEffect(() => {
    const shouldAutoConnect =
      (step === "connectInChosenChain" ||
        fundWalletStep === "reconnectChain") &&
      !shouldShowEvnWallets &&
      solanaWalletAdapter &&
      !connected;

    if (!shouldAutoConnect) return;

    const timeoutId = setTimeout(async () => {
      try {
        if (solanaWalletAdapter && !connected) {
          await solanaWalletAdapter.connect();
        }
      } catch (error: any) {
        console.error("Error connecting Solana wallet after selection:", error);
        setActiveConnector(null);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [
    solanaWalletAdapter,
    connected,
    step,
    fundWalletStep,
    shouldShowEvnWallets,
    setActiveConnector,
  ]);

  return (
    <Modal
      isOpen={
        step === "connectInChosenChain" || fundWalletStep === "reconnectChain"
      }
      onClose={handleClose}
      paddingClass="pt-14 md:pt-[90px] w-full pl-6 md:pl-[57px] pb-6 md:pb-10 pr-[24px] flex max-h-[98%] md:max-h-[700px]"
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
      <div className="flex w-full items-center justify-center  flex-col overflow-hidden gap-8">
        <p className="text-base text-white">
          Connect your wallet in chosen chain
        </p>
        <div
          style={{ scrollbarColor: "#1B46E0 transparent" }}
          className="overflow-auto h-full w-[260px] mt-6 flex-1 flex flex-col "
        >
          {shouldShowEvnWallets ? (
            <div className="flex flex-col gap-4 min-h-fit ">
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
