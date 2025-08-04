/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { Chain } from "viem";
import { CHAIN_ICONS, chainsWithCustomRpcs } from "@/constants/chainConfig";
import "react-toastify/dist/ReactToastify.css";
import { showErrorToast, showSuccessToast } from "@/toasts";
import Image from "next/image";
import { DropdownList } from "../VaultsWrapper/components/DropdownList";
import Button from "../common/Button";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { WithTooltip } from "../common/Tooltip";
import { useWallet } from "@solana/wallet-adapter-react";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";

// Destructure chainsWithCustomRpcs() to get zetaChain for default
const [zetachain] = chainsWithCustomRpcs();

// ChainSwitcher Component
const ChainSwitcher: React.FC = () => {
  const { publicKey } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const { switchToChain, activeChain: currentChain, activeEvmWallet: wallet } = useMultiChain();
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousChainRef = useRef<string | null>(null);
  const { setSelectedChainFromModal, setSelectedTokenFromModal } = useChainTokenModalStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Track chain changes
  useEffect(() => {
    // If we have a current chain and it's different from the previous one
    if (
      wallet?.chainId &&
      previousChainRef.current !== null &&
      wallet?.chainId?.split(":")[1] !== previousChainRef.current
    ) {
      // Find the chain name
      const chain = chainsWithCustomRpcs().find(
        (c) => c.id.toString() === wallet?.chainId?.split(":")[1],
      );
      if (chain) {
        setSelectedChainFromModal(chain);
        try {
          showSuccessToast(
            `Successfully switched to ${chain?.name || "new network"}`,
          );
        } catch (error) {
          console.error("Toast error:", error);
        }
      }

      console.log("Successfully switched", chain?.id);
    }

    previousChainRef.current = wallet?.chainId?.split(":")[1] || null;
  }, [wallet?.chainId]);

  // Handle chain switch
  const handleChainSwitch = async (chain: Chain) => {
    if (!wallet?.address) {
      try {
        showErrorToast("Please connect your wallet to switch chains.");
      } catch (error) {
        console.error("Toast error:", error);
        alert("Please connect your wallet to switch chains.");
      }
      return;
    }
    if (wallet.walletClientType === "privy") {
      try {
        showErrorToast("You can't change chain with Smart wallet");
      } catch (error) {
        console.error("Toast error:", error);
        alert("You can't change chain with Smart wallet");
      }
      return;
    }

    if (wallet?.chainId?.split(":")[1] === chain.id.toString()) {
      setIsOpen(false);
      return;
    }

    setIsLoading(chain.id);
    try {
      switchToChain(chain);
      setSelectedTokenFromModal(null);
      setIsOpen(false);
    } catch (error) {
      console.log("Failed to switch chain:", error);
      showErrorToast(error);
    } finally {
      setIsLoading(null);
    }
  };

  // Determine the chain to display
  const displayChain = wallet?.chainId
    ? chainsWithCustomRpcs().find(
        (c: Chain) => c.id.toString() === wallet?.chainId?.split(":")[1],
      ) || zetachain
    : zetachain;

  const options = chainsWithCustomRpcs().map((chain) => {
    return { value: chain.name, icon: CHAIN_ICONS[chain.id].url };
  });

  const handleSelectChain = (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: string,
  ) => {
    event.stopPropagation();
    const selected = chainsWithCustomRpcs().find(
      (c: Chain) => c.name === option,
    );

    if (selected) {
      handleChainSwitch(selected);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="z-50 relative rounded-full" ref={dropdownRef}>
      {!isMobile ? (
        <WithTooltip content="Switch network" subId="chain-switcher">
          <Button
            variant="secondary"
            disabled={!wallet && !publicKey}
            onClick={handleButtonClick}
            className="cursor-pointer !p-[3px] lg:!p-2 lg:!w-[56px] lg:!h-[56px] !w-9 !h-9"
            data-tooltip-id="chain-switcher-tooltip"
            data-tooltip-content="Switch network"
          >
            <div className="bg-[#24262f] relative lg:!w-10 lg:!h-10 !h-6 !w-6 rounded-full flex items-center justify-center">
              <Image
                src={CHAIN_ICONS[currentChain?.id ?? 7000].url}
                alt={currentChain?.name ?? "Zetachain"}
                fill
              />
            </div>
          </Button>
        </WithTooltip>
      ) : (
        <Button
          variant="secondary"
          disabled={!wallet && !publicKey}
          onClick={handleButtonClick}
          className="cursor-pointer !p-[3px] lg:!p-2 lg:!w-[56px] lg:!h-[56px] !w-9 !h-9"
          style={{ touchAction: "manipulation" }}
        >
          <div className="bg-[#24262f] relative lg:!w-10 lg:!h-10 !h-6 !w-6 rounded-full flex items-center justify-center">
            <Image
              src={CHAIN_ICONS[currentChain?.id ?? 7000].url}
              alt={currentChain?.name ?? "Zetachain"}
              fill
            />
          </div>
        </Button>
      )}

      <DropdownList
        width={250}
        isIconButton={false}
        options={options}
        selectedOption={displayChain?.name}
        handleSelectedOption={handleSelectChain}
        isShownList={isOpen}
        needReset={false}
      />
    </div>
  );
};

export default ChainSwitcher;
