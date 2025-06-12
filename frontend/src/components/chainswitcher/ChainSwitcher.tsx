/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useRef, useEffect } from "react";
import { Chain } from "viem";
import { CHAIN_ICONS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import "react-toastify/dist/ReactToastify.css";
import { ClipLoader } from "react-spinners";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import { Tooltip } from "react-tooltip";
import { showErrorToast, showSuccessToast } from "@/toasts";
import { useChain, useUser } from "@account-kit/react";
import Image from "next/image";
<<<<<<< HEAD
import { AppButton } from "../button/AppButton";
import { DropdownList } from "../VaultsWrapper/components/DropdownList";
=======
import ChandeChain from "@public/ethereum.png"
import Button from "../Button";
>>>>>>> origin/fix/AM-90/auth-modals

// Destructure SUPPORTED_CHAINS to get zetaChain for default
const [zetaChain] = SUPPORTED_CHAINS;

// ChainSwitcher Component
const ChainSwitcher: React.FC = () => {
  const wallet = useUser();
  const { chain: currentChain, setChain } = useChain(); // Get the current chain (updates automatically)
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<number | null>(null); // Track loading state by chain ID
  const dropdownRef = useRef<HTMLDivElement>(null);
  const previousChainRef = useRef<number | null>(null);

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
      currentChain?.id &&
      previousChainRef.current !== null &&
      currentChain.id !== previousChainRef.current
    ) {
      // Find the chain name
      const chain = SUPPORTED_CHAINS.find(
        (c) => c.chain.id === currentChain.id,
      );
      // Use a try-catch to handle potential toast errors
      try {
        showSuccessToast(
          `Successfully switched to ${chain?.chain?.name || "new network"}`,
        );
      } catch (error) {
        console.error("Toast error:", error);
      }
    }

    // Update the previous chain ref
    previousChainRef.current = currentChain?.id || null;
  }, [currentChain?.id]);

  // Handle chain switch
  const handleChainSwitch = async (
    chain: (typeof SUPPORTED_CHAINS)[number],
  ) => {
    if (!wallet) {
      try {
        showErrorToast("Please connect your wallet to switch chains.");
      } catch (error) {
        console.error("Toast error:", error);
        alert("Please connect your wallet to switch chains.");
      }
      return;
    }
    if (wallet.type !== "eoa") {
      try {
        showErrorToast("You can't change chain with Smart wallet");
      } catch (error) {
        console.error("Toast error:", error);
        alert("You can't change chain with Smart wallet");
      }
      return;
    }

    // Don't switch if already on this chain
    if (currentChain?.id === chain.chain.id) {
      setIsOpen(false);
      return;
    }

    setIsLoading(chain.chain.id);
    try {
      // Switch chain
      setChain(chain);

      // Close dropdown
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      // Pass the error directly to the error toast function
      // which will extract the revert reason if available
      showErrorToast(error);
    } finally {
      setIsLoading(null);
    }
  };

  // Determine the chain to display (use currentChain if available, otherwise fallback to zetaChain)
  const displayChain = currentChain
    ? SUPPORTED_CHAINS.find(
        (c: { chain: Chain }) => c.chain.id === currentChain.id,
      )?.chain || currentChain
    : zetaChain.chain;

  const options = SUPPORTED_CHAINS.map((chain) => {
    return { value: chain.chain.name, icon: CHAIN_ICONS[chain.chain.id].url };
  });

  const handleSelectChain = (
    event:
      | React.MouseEvent<HTMLParagraphElement, MouseEvent>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>,
    option: string,
  ) => {
    event.stopPropagation()
    const selected = SUPPORTED_CHAINS.find(
      (c: { chain: Chain }) => c.chain.name === option,
    );

    if (selected) {
      handleChainSwitch(selected);
    }
  };

  return (
    <div
      className="z-50 relative bg-gradient-to-b from-[#262830] to-[#06afbc] rounded-full lg:bg-none lg:rounded-none"
      ref={dropdownRef}
    >
      <AppButton isIconOnly onClick={() => setIsOpen(!isOpen)}>
        <Image
          src={CHAIN_ICONS[displayChain.id].url}
          alt={displayChain?.name}
          width={40}
          height={40}
          sizes="40px"
        />
      </AppButton>

      <Tooltip id="chain-switcher-tooltip" />

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
