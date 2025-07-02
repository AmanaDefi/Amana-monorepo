import { motion } from "framer-motion";
import { Modal } from "../../base/Modal";
import { useFundWalletStore } from "@/store/fundWalletStore";
import SearchIcon from "@/components/svg/Search";
import { useRef, useState } from "react";
import { CHAIN_ICONS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import Image from "next/image";
import { Chain } from "viem";

export const TopUpChainsModal = () => {
  const { step, setStep, setChain, chain, currency } = useFundWalletStore();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setStep("setValues");
  };

  const chainList = SUPPORTED_CHAINS.slice(1).map((chain) => {
    return {
      icon: CHAIN_ICONS[chain.id].url,
      value: chain,
      label: chain.name,
    };
  });

  const handleSelectChain = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    chain: Chain,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setChain(chain);
  };
  return (
    <Modal
      isOpen={step === "selectChain"}
      onClose={handleClose}
      paddingClass="px-[21px] pt-5 pb-6 flex max-h-[524px]"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[358px] md:max-w-[526px]"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex flex-col justify-center items-center gap-[45px] font-gotham">
          <div
            onClick={() => inputRef?.current?.focus()}
            className="focus-within:border-blue-button hover:border-blue-button transition-all duration-300 bg-[#14171F] w-[50%] min-w-[190px] focus-within:w-[100%] lg:focus-within:w-[340px] lg:w-[340px] px-4 py-3 pl-[56px] rounded-lg border border-[#454363] relative"
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
          <div className="flex flex-col gap-4 overflow-auto">
            <p>Popular</p>
            <div
              className={`z-10 !w-[200px] rounded-2xl md:-right-3 left-0 md:left-auto flex flex-col items-center gap-3 transition-all duration-500 ease-in-out overflow-hidden`}
            >
              {chainList.map((chain, index) => {
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
                      <p className="text-white">
                        {chain.label}
                      </p>
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
