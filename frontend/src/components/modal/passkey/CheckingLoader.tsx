"use client";

import { useAuthStore } from "@/store/authStore";
import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import CloseModalIcon from "@/components/svg/CloseModalIcon";

export const Checking = () => {
  const { step, closeAll, openStep, setError } = useAuthStore();
  return (
    <Modal
      isOpen={step === "checking"}
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
        className="w-full flex flex-col items-center justify-center mt-[25px] mb-[61px]"
      >
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-center text-[20px] font-bold text-white mt-4">
          Checking that you’re human...
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      ></motion.div>
    </Modal>
  );
};
