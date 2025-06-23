"use client";

import { useAuthStore } from "@/store/authStore";
import OnboardingContainer from "@/containers/OnboardingContainer";
import { AnimatePresence, motion } from "framer-motion";
import BackButton from "@/components/common/BackButton";
import { useEffect } from "react";

const OnboardingModal = () => {
  const { step, closeAll } = useAuthStore();

  const isOpen = step === "onboarding";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-[#0C1015] text-white font-gotham overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] blur-[160px] bg-[#1B46E0] opacity-30 pointer-events-none overflow-hidden" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] blur-[160px] bg-[#3E73C4] opacity-20 pointer-events-none overflow-hidden" />

          <div className="relative min-h-screen flex flex-col items-center px-4 sm:px-10 pt-[20px] sm:pt-[34px] pb-12 sm:pb-16">
            <div className="w-full max-w-[1560px] hidden md:flex justify-start">
              <BackButton onClick={closeAll} />
            </div>
            <OnboardingContainer />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;
