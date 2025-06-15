"use client";

import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import Button from "@/components/Button";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import ProfileDropdownIcon from "@/components/svg/ProfileDropdownIcon";
import { useAuthenticate } from "@account-kit/react";
import { useFundWalletStore } from "@/store/fundWalletStore";

export const SignIn = () => {
  const { step, setStep, setBuyWith, closeAll } = useFundWalletStore();

  return (
    <Modal
      isOpen={step === "chooseBuyWith"}
      onClose={closeAll}
      paddingClass="px-4 pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[440px]"
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
            Add Funds
          </h2>
          <Button
            onClick={() => openStep("signature")}
            type="button"
            variant="custom"
            className="mt-6 w-full h-12 rounded-[8px] text-white !font-bold !text-[16px] shadow-md transition-all duration-200 !font-gotham"
          >
            Use existing passkey
          </Button>
        </div>

        <div className="flex flew-row items-center mt-8">
          <div className="bg-[#3f3d5a] h-[1px] w-full"></div>
          <span className="px-[17px] text-[16px] font-normal text-white">
            OR
          </span>
          <div className="bg-[#3f3d5a] h-[1px] w-full"></div>
        </div>

        <h2 className="text-center text-[24px] font-medium text-white mt-8">
          Create new passkey
        </h2>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.1 }}
        className="flex flex-col gap-4 mt-6 px-[26px]"
      >
        <input
          type="text"
          autoComplete="name"
          placeholder="Passkey label (only visible for you)"
          {...register("passkey")}
          className={`font-gotham w-full rounded-[8px] px-4 py-3 text-[14px] font-normal text-[#535E73] !bg-transparent border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
            errors.passkey
              ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
              : "border-[#2C2F36]"
          }`}
        />
        {errors.passkey && (
          <div className="flex gap-1 text-[#FFC700]">
            <ErrorInputIcon width={16} height={16} className="fill-[#FFC700]" />
            <p className="text-[12px] font-normal">{errors.passkey.message}</p>
          </div>
        )}
        <div className="flex justify-center mt-4">
          <Button
            variant="custom"
            className="w-full h-12 rounded-[8px] border border-[#3E73C4] text-white shadow-md hover:bg-[#3E73C4]/10 !text-[16px] !font-bold transition-all duration-200 !font-gotham"
          >
            Create new passkey
          </Button>
        </div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="px-[26px] mt-6">
          <div className="w-full text-[#535E73] text-[12px] font-normal bg-[rgba(62,115,196,0.05)] rounded-[8px] px-[17px] py-[15px]">
            Store your passkeys securely. Losing your passkey means losing
            access to your account and any associated funds permanently.
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
