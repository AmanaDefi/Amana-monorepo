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
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import NetworkDropdown from "./components/NetworkDropdown";
import { CHAIN_ICONS, SUPPORTED_CHAINS } from "@/constants/chainConfig";

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
  const [isOpen, setIsOpen] = useState(false);

  const { walletAddress, activeChain } = useMultiChain();

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

  const onSubmit = async (data: SendFormData) => {
    try {
      setLoading(true);
      console.log("Sending transaction:", data);
      console.log("Active chain:", activeChain);

      closeAll();
    } catch (err) {
      setError("Failed to send transaction");
      console.error(err);
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
      paddingClass="p-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[436px]"
    >
      <div className="flex justify-start">
        <button
          onClick={closeAll}
          className="rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="text-sm font-normal text-white mt-5"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <p className="text-[18px] font-bold mb-4">Send from</p>
            <div className="font-gotham w-full h-[48px] bg-[#161C27] px-6 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex items-center">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          </div>

          <div>
            <p className="text-[18px] font-bold mb-4">Send to</p>
            <input
              type="text"
              placeholder="Enter wallet address..."
              {...register("recipientAddress")}
              className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
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
                onClick={() => setIsOpen(!isOpen)}
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
                      const chainConfig = SUPPORTED_CHAINS.find(
                        (config) => config.chain.name === networkName,
                      );
                      return chainConfig ? (
                        <img
                          src={CHAIN_ICONS[chainConfig.chain.id]?.url}
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
                <ChevronDownIcon
                  className={`w-5 h-5 text-[#9A9CB3] transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              <input type="hidden" {...register("network")} />

              {/* Dropdown */}
              {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1">
                  <NetworkDropdown
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    setValue={setValue}
                  />
                </div>
              )}
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
              {...register("amount")}
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
              variant="primary"
              type="submit"
              disabled={!isValid}
              className="!max-h-[48px] !w-full !mt-6"
            >
              Send
            </Button>
          </div>
        </form>
      </motion.div>
    </Modal>
  );
};
