import React, { useEffect } from "react";
import { VaultData, Token } from "@/types/types";
import { Chain } from "viem";
import Dropdown from "@/components/VaultsDetailsWrapper/components/Dropdown";
import VaultInformationContent from "@/components/VaultsDetailsWrapper/components/VaultInformationDropdown";
import ChartDropdown from "@/components/VaultsDetailsWrapper/components/ChartDropdown";
import Button from "@/components/common/Button";
import BackToVaultsIcon from "@/components/svg/BackToVaultsIcon";
import { useAuthStore } from "@/store/authStore";
import GlowIcon from "@/components/svg/GlowIcon";
import Footer from "@/components/Footer";

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

  return (
    <div
      className={`z-50 pt-6 px-4 pb-[42px] lg:!hidden fixed top-0 bottom-0 left-0 right-0 bg-[#0C1015] h-screen transform transition-all duration-500 ease-in-out ${
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
            className="flex items-center max-h-[42px] !px-[16px] !py-[10px] !max-w-[96px]"
          >
            <div className="w-5 h-5 relative z-2 flex items-center justify-center">
              <BackToVaultsIcon width={7} height={12} />
            </div>
            <p className="text-white leading-0 relative z-2 text-lg font-normal ml-2">
              Back
            </p>
          </Button>
        </div>

        <div className="flex-1 space-y-4">
          <Dropdown title="Historical APY" defaultOpen={false}>
            <ChartDropdown
              vaultId={vaultData.id}
              vaultName={vaultData.name.replace("Pool", "").replace("Lend", "")}
            />
          </Dropdown>

          <Dropdown title="Information" defaultOpen={false}>
            <VaultInformationContent
              vaultData={vaultData}
              vaultExplorerBaseUrl={vaultExplorerBaseUrl}
              strategyExplorerBaseUrl={strategyExplorerBaseUrl}
              walletAddress={walletAddress}
              selectedToken={selectedToken}
              selectedChain={selectedChain}
              type="information"
            />
          </Dropdown>

          {!isWithdraw && (
            <Dropdown title="What happens to my deposit?" defaultOpen={false}>
              <VaultInformationContent
                vaultData={vaultData}
                vaultExplorerBaseUrl={vaultExplorerBaseUrl}
                strategyExplorerBaseUrl={strategyExplorerBaseUrl}
                walletAddress={walletAddress}
                selectedToken={selectedToken}
                selectedChain={selectedChain}
                type="deposit-flow"
              />
            </Dropdown>
          )}
        </div>
        <Footer isConnected={false} />
      </div>
    </div>
  );
};

export default MobileInfoModal;
