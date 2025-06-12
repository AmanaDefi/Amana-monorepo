"use client";

import { useAuthStore } from "@/store/authStore";
import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import Button from "@/components/Button";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import ProfileDropdownIcon from "@/components/svg/ProfileDropdownIcon";
import OnboardingIcon from "@/components/svg/OnboardingIcon";

export const SignatureCheck = () => {
  const { step, closeAll, openStep } = useAuthStore();

  return (
    <Modal
      isOpen={step === "signature"}
      onClose={closeAll}
      paddingClass="px-4 pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[425px]"
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
      >
        <div className="flex flex-col justify-center items-center px-7 font-gotham">
          <div className="w-12 h-12 rounded-[8px] bg-[rgba(62,115,196,0.05)] flex items-center justify-center">
            <ProfileDropdownIcon
              width={26}
              height={26}
              className="w-[26px] h-[26px]"
            />
          </div>
          <h2 className="text-center text-[24px] font-medium text-white mt-6">
            Signature Check Required
          </h2>
        </div>
        <p className="text-[14px] font-normal text-[#535E73] mt-4">
          Please verify your device compatibility with the platform
        </p>
        <ul className="text-[16px] font-normal mt-[31px] max-w-[296px] mx-auto flex flex-col gap-4">
          <li className="flex flex-row gap-2 items-center">
            <OnboardingIcon width={11} height={9} />
            Safe transactions and transfers
          </li>
          <li className="flex flex-row gap-2 items-center">
            <OnboardingIcon width={11} height={9} />
            Full access to all platform features
          </li>
          <li className="flex flex-row gap-2 items-center">
            <OnboardingIcon width={11} height={9} />
            Protection of your funds
          </li>
        </ul>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="w-full mt-10">
          <div className="mx-auto w-full max-w-[352px] text-[#535E73] text-[12px] font-normal bg-[rgba(62,115,196,0.05)] rounded-[8px] px-[17px] py-[15px]">
            Canceling this check will sign you out. You can sign in and verify
            anytime.
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.1 }}
        className="flex flex-row mt-8 w-full"
      >
        <div className="flex justify-center gap-4 w-full mx-auto max-w-[352px]">
          <Button
            variant="custom"
            className="w-full h-12 rounded-[8px] border border-[#3E73C4] text-white shadow-md hover:bg-[#3E73C4]/10 !text-[16px] !font-bold transition-all duration-200 !font-gotham"
          >
            Cancel
          </Button>
          <Button
            variant="custom"
            className="w-full h-12 rounded-[8px] border border-[#3E73C4] text-white shadow-md hover:bg-[#3E73C4]/10 !text-[16px] !font-bold transition-all duration-200 !font-gotham"
          >
            Check
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
};
