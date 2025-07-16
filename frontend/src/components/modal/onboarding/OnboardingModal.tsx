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
      const originalStyle = window.getComputedStyle(document.body).overflow;
      const originalHtmlStyle = window.getComputedStyle(
        document.documentElement,
      ).overflow;

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      return () => {
        document.body.style.overflow = originalStyle;
        document.documentElement.style.overflow = originalHtmlStyle;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-[#0C1015] text-white font-gotham"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="absolute top-0 right-0 w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] blur-[160px] bg-[#1B46E0] opacity-30 pointer-events-none overflow-hidden" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] blur-[160px] bg-[#3E73C4] opacity-20 pointer-events-none overflow-hidden" />
          <div className="relative w-full h-screen flex flex-col overflow-hidden">
            <div className="flex-shrink-0 w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 md:pt-8">
              <div className="w-full hidden md:flex justify-start">
                <BackButton onClick={closeAll} />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex flex-col justify-center py-4 sm:py-6 md:py-8">
                <OnboardingContainer />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;
