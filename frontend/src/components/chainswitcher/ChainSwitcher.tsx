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

  return (
    <div
      className="z-50 relative bg-gradient-to-b from-[#262830] to-[#06afbc] rounded-full lg:bg-none lg:rounded-none"
      ref={dropdownRef}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col md:flex-row items-center gap-2 p-1 lg:p-4 md:px-3 md:py-2 bg-gradient-to-r from-[#262830] to-[#06afbc] hover:bg-gradient-to-l text-white rounded-md transition-opacity duration-200 cursor-pointer"
        disabled={!wallet}
        data-tooltip-id="chain-switcher-tooltip"
        data-tooltip-content={
          wallet?.type === "eoa"
            ? "Switch network"
            : wallet?.type === "sca"
              ? "Connect EOA wallet for change chain"
              : "Connect wallet to switch networks"
        }
      >
        {/* {displayChain. && (
          <img
            src={displayChain.icon?.url}
            alt={displayChain.name}
            className="w-5 h-5 rounded-full"
          />
        )} */}
        <span className="hidden lg:block">
          {displayChain?.name || "Select Chain"}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 md:ml-2 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <Tooltip id="chain-switcher-tooltip" />

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-md shadow-lg">
          {SUPPORTED_CHAINS.map((chain) => (
            <button
              key={chain.chain.id}
              onClick={() => handleChainSwitch(chain)}
              className="flex items-center w-full px-4 py-2 text-white hover:bg-gray-700 rounded-md"
              disabled={isLoading !== null}
              data-tooltip-id={`chain-${chain.chain.id}-tooltip`}
              data-tooltip-content={`Switch to ${chain.chain.name}`}
            >
              <Image
                src={CHAIN_ICONS[chain.chain.id].url}
                alt={chain.chain.name}
                width={40}
                height={40}
                sizes="40px"
              />
              <span>{chain.chain.name}</span>
              {isLoading === chain.chain.id ? (
                <div className="ml-auto">
                  <ClipLoader size={16} color="#ffffff" />
                </div>
              ) : currentChain?.id === chain.chain.id ? (
                <CheckIcon className="ml-auto h-4 w-4 text-green-500" />
              ) : null}
              <Tooltip id={`chain-${chain.chain.id}-tooltip`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChainSwitcher;
