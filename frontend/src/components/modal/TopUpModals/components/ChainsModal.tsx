import { motion } from "framer-motion";
import { Modal } from "../../base/Modal";
import { useFundWalletStore } from "@/store/fundWalletStore";
import SearchIcon from "@/components/svg/Search";
import { useRef, useState } from "react";
import {
  APPROVED_TOKENS,
  CHAIN_ICONS,
  CHAIN_ID,
  solanaChain,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import Image from "next/image";
import { Chain } from "viem";
import { useWallets } from "@privy-io/react-auth";

export const TopUpChainsModal = () => {
  const { step, setStep, setChain, setCurrency, walletAddress } =
    useFundWalletStore();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const activeWallet = filteredWallets[0];

  const handleClose = () => {
    if (!!walletAddress && activeWallet.walletClientType !== "privy") {
      setStep("confirm");
    } else {
      setStep("setValues");
    }
  };

  const chainList = SUPPORTED_CHAINS.filter(
    (chain) => chain.id !== CHAIN_ID["solana"],
  ).map((chain) => {
    return {
      icon: CHAIN_ICONS[chain.id].url,
      value: chain,
      label: chain.name,
    };
  });

  const nonEVMChainList = [
    {
      icon: CHAIN_ICONS[CHAIN_ID.solana].url,
      value: solanaChain,
      label: "Solana",
    },
  ];

  const handleSelectChain = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    chain: Chain,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setChain(chain);
    if (!!walletAddress && activeWallet.walletClientType !== "privy") {
      activeWallet.switchChain(chain.id);
    }
    const tokens = APPROVED_TOKENS[chain.id] ?? [];
    const defaultToken =
      tokens.find((token) => token.symbol === "USDC") || tokens[0];

    if (defaultToken) {
      setCurrency(defaultToken);
    }
    handleClose();
  };

  const filteredEVMChainList = chainList.filter((chain) =>
    chain.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const filteredNonEvmChainList = nonEVMChainList.filter((chain) =>
    chain.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  return (
    <Modal
      isOpen={false}
      onClose={handleClose}
      paddingClass="px-[21px] pt-5 pb-6 flex min-h-[490px] max-h-[528px] w-full"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[358px] md:max-w-[526px]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="flex w-full"
      >
        <div className="flex w-full flex-col justify-center overflow-hidden items-center gap-[24px] font-gotham">
          <div
            onClick={() => inputRef?.current?.focus()}
            className="focus-within:border-blue-button hover:border-blue-button transition-all duration-300 bg-[#14171F] w-[100%] px-4 py-3 pl-[56px] rounded-lg border border-[#454363] relative"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={"Search name or paste address"}
              maxLength={100}
              className="text-white block focus:outline-none bg-transparent w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="absolute left-4 top-3">
              <SearchIcon />
            </div>
          </div>
          <div className="flex-1 w-full flex-col gap-4 overflow-auto">
            {!!filteredEVMChainList?.length && (
              <p className="text-[#4874DB] mb-2">Popular</p>
            )}
            <div
              className={`z-10 flex flex-col items-center gap-2 transition-all duration-500 ease-in-out overflow-hidden`}
            >
              {filteredEVMChainList.map((chain, index) => {
                return (
                  <motion.div
                    key={chain.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="group hover:cursor-pointer hover:shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] hover:bg-[#1D2A41] max-h-9 flex rounded-[4px] py-3 w-full flex-row justify-between items-center transition-colors duration-200"
                    onClick={(event) => handleSelectChain(event, chain.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-normal flex flex-row gap-2 items-center py-2 px-4">
                      {chain.icon && (
                        <Image
                          src={chain.icon || ""}
                          alt={chain.label}
                          width={20}
                          height={20}
                          className="rounded-full"
                          sizes="20px"
                        />
                      )}
                      <p className="text-white">{chain.label}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {!!filteredNonEvmChainList?.length && (
              <p className="text-[#4874DB] my-2">L1 Non-EVM Networks</p>
            )}
            <div
              className={`z-10 flex flex-col items-center gap-2 transition-all duration-500 ease-in-out overflow-hidden`}
            >
              {filteredNonEvmChainList.map((chain, index) => {
                return (
                  <motion.div
                    key={chain.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="group hover:cursor-pointer hover:shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] hover:bg-[#1D2A41] max-h-9 flex rounded-[4px] py-3 w-full flex-row justify-between items-center transition-colors duration-200"
                    onClick={(event) => handleSelectChain(event, chain.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-normal flex flex-row gap-2 items-center py-2 px-4">
                      {chain.icon && (
                        <Image
                          src={chain.icon || ""}
                          alt={chain.label}
                          width={20}
                          height={20}
                          className="rounded-full"
                          sizes="20px"
                        />
                      )}
                      <p className="text-white">{chain.label}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
