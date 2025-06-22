import React, { useEffect } from "react";
import { VaultData, Token } from "@/types/types";
import { Chain } from "viem";
import Dropdown from "@/components/VaultsDetailsWrapper/components/Dropdown";
import VaultInformationContent from "@/components/VaultsDetailsWrapper/components/VaultInformationDropdown";
import YourInvestment from "@/components/VaultsDetailsWrapper/components/YourInvestment";
import Button from "@/components/Button";
import BackToVaultsIcon from "@/components/svg/BackToVaultsIcon";
import { useAuthStore } from "@/store/authStore";
import GlowIcon from "@/components/svg/GlowIcon";

interface MobileInfoModalProps {
  vaultData: VaultData;
  walletAddress?: string;
  isWithdraw: boolean;
  selectedToken?: Token;
  selectedChain?: Chain;
  vaultExplorerBaseUrl: string;
  strategyExplorerBaseUrl: string;
  depositData: {
    amount: string;
    symbol: string;
    usdValue: number;
  };
}

const MobileInfoModal: React.FC<MobileInfoModalProps> = ({
  vaultData,
  walletAddress,
  isWithdraw,
  selectedToken,
  selectedChain,
  vaultExplorerBaseUrl,
  strategyExplorerBaseUrl,
  depositData,
}) => {
  const { step, closeAll } = useAuthStore();
  const isOpen = step === "mobileInfo";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAll();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closeAll]);

  const informationDropdownTitle = walletAddress
    ? isWithdraw
      ? "Your Investment"
      : "What happened with my Deposit?"
    : "Information";

  return (
    <div
      className={`z-50 py-10 px-4 lg:!hidden fixed top-0 bottom-0 left-0 right-0 bg-black h-screen transform transition-all duration-500 ease-in-out ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <GlowIcon position="top-mobile" />
      <GlowIcon position="bottom-mobile" />

      <div className="flex flex-col h-full w-full">
        <div className="flex flex-row items-center w-full justify-start mb-10">
          <Button
            variant="outlined"
            onClick={closeAll}
            className="flex items-center max-h-[42px] !px-[16px] !py-[10px] !max-w-[120px]"
          >
            <div className="w-5 h-5 relative z-2 flex items-center justify-center">
              <BackToVaultsIcon width={7} height={12} />
            </div>
            <p className="text-white leading-0 relative z-2 text-[16px] font-normal ml-2">
              Back
            </p>
          </Button>
              </div>
              
        <div className="flex-1 space-y-4">
          {isWithdraw && walletAddress ? (
            <YourInvestment
              depositAmount={depositData.amount}
              vaultTokenSymbol={depositData.symbol}
              depositUSDValue={depositData.usdValue}
            />
          ) : (
            <Dropdown title={informationDropdownTitle} defaultOpen={true}>
              <VaultInformationContent
                vaultData={vaultData}
                vaultExplorerBaseUrl={vaultExplorerBaseUrl}
                strategyExplorerBaseUrl={strategyExplorerBaseUrl}
                walletAddress={walletAddress}
                selectedToken={selectedToken}
                selectedChain={selectedChain}
              />
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileInfoModal;
