"use client";

import { useAuthStore } from "@/store/authStore";
import WelcomeContainer from "@/containers/WelcomeContainer";

import { AnimatePresence, motion } from "framer-motion";
import GlowIcon from "@/components/svg/GlowIcon";
import { useEffect } from "react";

const WelcomeModal = () => {
  const { step } = useAuthStore();
  const isVisible = step === "success";

  useEffect(() => {
    if (isVisible) {
      const originalStyle = window.getComputedStyle(document.body).overflow;

      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="welcome-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-[#0C1015] text-white font-gotham overflow-hidden"
        >
          <GlowIcon position="top-right" />
          <GlowIcon position="bottom-left" />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex min-h-screen px-6 py-10 items-start justify-center pt-[130px] md:items-center md:pt-10 overflow-y-auto"
          >
            <div className="w-full max-w-[1200px]">
              <WelcomeContainer />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeModal;
