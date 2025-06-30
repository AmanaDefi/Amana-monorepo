import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import Button from "@/components/Button";
import { useState, useEffect } from "react";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import { CHAIN_ICONS, chainsWithCustomRpcs } from "@/constants/chainConfig";

const sendSchema = z.object({
  recipientAddress: z
    .string()
    .min(1, "Wallet address is required")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be a positive number"),
  network: z.string().min(1, "Please select a network"),
});

type SendFormData = z.infer<typeof sendSchema>;

export const Send = () => {
  const { step, closeAll, updateField, setLoading, setError, openStep } =
    useAuthStore();
  const [showNetworkSelection, setShowNetworkSelection] = useState(false);
  const [networkSearchQuery, setNetworkSearchQuery] = useState("");

  const { walletAddress, activeChain, switchToChain, balance } =
    useMultiChain();

  const validateAmount = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return "Amount must be a positive number";
    }

    const userBalance = parseFloat(balance?.formatted || "0");
    if (num > userBalance) {
      return "Not enough tokens on your wallet";
    }

    return true;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (activeChain?.name) {
      setValue("network", activeChain.name, { shouldValidate: true });
    }
  }, [activeChain, setValue]);

  useEffect(() => {
    if (activeChain?.name && !watch("network")) {
      setValue("network", activeChain.name, { shouldValidate: true });
    }
  }, []);

  const selectedNetworkValue = watch("network") || "";

  // Filter networks based on search query
  const filteredNetworks = chainsWithCustomRpcs().filter((chainConfig) =>
    chainConfig.name
      .toLowerCase()
      .includes(networkSearchQuery.toLowerCase()),
  );

  const handleNetworkSelect = async (chainName: string) => {
    const chainConfig = chainsWithCustomRpcs().find(
      (config) => config.name === chainName,
    );

    if (!chainConfig) {
      console.log(`Chain config not found for: ${chainName}`);
      return;
    }

    const chain = chainConfig;

    setValue("network", chainName, { shouldValidate: true });

    setShowNetworkSelection(false);
    setNetworkSearchQuery(""); // Reset search query

    if (activeChain?.id === chain.id) {
      return;
    }

    try {
      await switchToChain(chain);
    } catch (error) {
      console.log("Failed to switch chain:", error);
    }
  };

  const onSubmit = async (data: SendFormData) => {
    try {
      setLoading(true);
      console.log("Sending transaction:", data);
      console.log("Active chain:", activeChain);

      closeAll();
    } catch (err) {
      setError("Failed to send transaction");
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  if (!walletAddress) {
    return null;
  }

  return (
    <Modal
      isOpen={step === "send"}
      onClose={closeAll}
      paddingClass="p-6 w-full"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[436px]"
    >
      <div className="flex justify-start">
        <button
          onClick={() => {
            if (showNetworkSelection) {
              setShowNetworkSelection(false);
              setNetworkSearchQuery("");
            } else {
              closeAll();
            }
          }}
          className="rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label={showNetworkSelection ? "Back" : "Close"}
        >
          {showNetworkSelection ? (
            <ChevronLeftIcon width={16} height={16} />
          ) : (
            <CloseModalIcon width={16} height={16} />
          )}
        </button>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="text-sm font-normal text-white mt-5"
      >
        {showNetworkSelection ? (
          // Network Selection Block
          <div className="space-y-4">
            <div>
              {/* Search Field */}
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[#535E73]" />
                </div>
                <input
                  type="text"
                  placeholder="Search name or paste address"
                  value={networkSearchQuery}
                  onChange={(e) => setNetworkSearchQuery(e.target.value)}
                  className="w-full rounded-[8px] pl-10 pr-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border border-[#2C2F36] transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4]"
                />
              </div>

              {/* Networks List */}
              <div
                className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-6 pr-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#1B46E0 transparent",
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: 6px;
                  }
                  div::-webkit-scrollbar-track {
                    background: #161c27;
                  }
                  div::-webkit-scrollbar-thumb {
                    background-color: #1b46e0;
                    border-radius: 4px;
                  }
                `}</style>
                <p className="text-[#4874DB] text-[16px]">Popular</p>
                {filteredNetworks.map((chainConfig, index) => (
                  <motion.div
                    key={chainConfig.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="group hover:cursor-pointer hover:shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] hover:bg-[#1D2A41] hover:rounded-[4px] max-h-9 flex rounded-[4px] py-3 w-full flex-row justify-between items-center transition-colors duration-200"
                    onClick={() => handleNetworkSelect(chainConfig.name)}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-normal flex flex-row gap-2 items-center py-2 px-4">
                      {CHAIN_ICONS[chainConfig.id]?.url && (
                        <img
                          src={CHAIN_ICONS[chainConfig.id]?.url}
                          alt={chainConfig.name}
                          className="w-[20px] h-[20px] rounded-full"
                        />
                      )}
                      <p className="text-white">{chainConfig.name}</p>
                    </div>
                    {selectedNetworkValue === chainConfig.name && (
                      <div className="w-2 h-2 bg-[#3E73C4] rounded-full mr-4"></div>
                    )}
                  </motion.div>
                ))}

                {filteredNetworks.length === 0 && (
                  <div className="text-center py-8 text-[#535E73]">
                    <p>No networks found matching {networkSearchQuery}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Original Send Form
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <p className="text-[12px] md:text-[18px] font-bold mb-4">
                Send from
              </p>
              <div className="w-full h-[48px] bg-[#161C27] px-3 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide text-[14px] sm:text-[16px]">
                {walletAddress}
              </div>
            </div>

            <div>
              <p className="text-[18px] font-bold mb-4">Send to</p>
              <input
                type="text"
                placeholder="Enter wallet address..."
                {...register("recipientAddress")}
                className={`w-full rounded-[8px] px-3 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
                  errors.recipientAddress
                    ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                    : "border-[#2C2F36]"
                }`}
              />
              {errors.recipientAddress && (
                <div className="flex gap-1 items-center mt-2">
                  <ErrorInputIcon
                    width={16}
                    height={16}
                    className="fill-[#FFC700]"
                  />
                  <p className="text-[#FFC700] text-[12px] font-normal">
                    {errors.recipientAddress.message}
                  </p>
                </div>
              )}
            </div>

            {/* Network Selection */}
            <div>
              <p className="text-[18px] font-bold mb-4">Network</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNetworkSelection(true)}
                  className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
                    errors.network
                      ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                      : "border-[#2C2F36]"
                  } flex flex-row justify-between items-center`}
                >
                  <div className="flex items-center gap-3">
                    {(selectedNetworkValue || activeChain?.name) &&
                      (() => {
                        const networkName =
                          selectedNetworkValue || activeChain?.name;
                        const chainConfig = chainsWithCustomRpcs().find(
                          (config) => config.name === networkName,
                        );
                        return chainConfig ? (
                          <img
                            src={CHAIN_ICONS[chainConfig.id]?.url}
                            alt={networkName}
                            className="w-[20px] h-[20px] rounded-full"
                          />
                        ) : null;
                      })()}
                    <span
                      className={
                        selectedNetworkValue || activeChain?.name
                          ? "text-white"
                          : "text-[#535E73]"
                      }
                    >
                      {selectedNetworkValue ||
                        activeChain?.name ||
                        "Select network"}
                    </span>
                  </div>
                  <ChevronDownIcon className="w-5 h-5 text-[#9A9CB3]" />
                </button>

                <input type="hidden" {...register("network")} />
              </div>

              {errors.network && (
                <div className="flex gap-1 items-center mt-2">
                  <ErrorInputIcon
                    width={16}
                    height={16}
                    className="fill-[#FFC700]"
                  />
                  <p className="text-[#FFC700] text-[12px] font-normal">
                    {errors.network.message}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-[18px] font-bold mb-4">Amount</p>
              <input
                type="text"
                placeholder="0.00"
                {...register("amount", {
                  validate: validateAmount,
                })}
                className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
                  errors.amount
                    ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                    : "border-[#2C2F36]"
                }`}
              />
              {errors.amount && (
                <div className="flex gap-1 items-center mt-2">
                  <ErrorInputIcon
                    width={16}
                    height={16}
                    className="fill-[#FFC700]"
                  />
                  <p className="text-[#FFC700] text-[12px] font-normal">
                    {errors.amount.message}
                  </p>
                </div>
              )}
            </div>

            <div className="">
              <Button
                variant="custom"
                type="submit"
                disabled={!isValid}
                className="!max-h-[48px] !w-full !mt-6"
              >
                Send
              </Button>
            </div>
          </form>
        )}
      </motion.div>
    </Modal>
  );
};
