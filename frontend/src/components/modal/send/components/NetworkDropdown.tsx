import { DropdownChainsList } from "@/components/DropdownChainsList";
import style from "./NetworkDropdown.module.css";
import { useState } from "react";
import { SUPPORTED_CHAINS, CHAIN_ICONS } from "@/constants/chainConfig";
import { Chain } from "viem";
import { useMultiChain } from "@/providers/MultiChainProvider";

interface NetworkDropdownProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setValue?: (name: string, value: any, options?: any) => void;
}

const NetworkDropdown = ({
  isOpen,
  setIsOpen,
  setValue,
}: NetworkDropdownProps) => {
  const { activeChain, switchToChain } = useMultiChain();

  const chainOptions = SUPPORTED_CHAINS.map((chainConfig) => ({
    value: chainConfig.chain.name,
    icon: CHAIN_ICONS[chainConfig.chain.id]?.url,
  }));

  const handleChainSelect = async (
    event: React.MouseEvent<HTMLParagraphElement | HTMLButtonElement>,
    chainName: string,
  ) => {
    event.stopPropagation();
    event.preventDefault();

    console.log(`Attempting to select chain: ${chainName}`);

    const chainConfig = SUPPORTED_CHAINS.find(
      (config) => config.chain.name === chainName,
    );

    if (!chainConfig) {
      console.error(`Chain config not found for: ${chainName}`);
      return;
    }

    const chain = chainConfig.chain;

    if (setValue) {
      setValue("network", chainName, { shouldValidate: true });
      console.log(`Form value updated to: ${chainName}`);
    }

    setIsOpen(false);

    if (activeChain?.id === chain.id) {
      console.log(`Already on chain ${chainName}, no switch needed`);
      return;
    }

    try {
      await switchToChain(chain);
    } catch (error) {
      console.error("Failed to switch chain:", error);
    }
  };

  return (
    <div>
      <DropdownChainsList
        width={263}
        isIconButton={false}
        options={chainOptions}
        selectedOption={activeChain?.name || ""}
        handleSelectedOption={handleChainSelect}
        isShownList={isOpen}
        needReset={false}
        alignment="right"
      />
    </div>
  );
};

export default NetworkDropdown;
