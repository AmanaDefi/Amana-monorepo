"use client";
import Button from "@/components/Button";
import SmartAccountCard from "@/components/SmartAccountCard";
import { smartAccountInfo } from "@/constants/smartAccountInfo";
import { useAuthStore } from "@/store/authStore";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";



const OnboardingContainer = () => {
  const router = useRouter();
  const { step, closeAll, openStep } = useAuthStore();
    
    return (
      <>
        <div className="flex flex-col items-center px-4 font-gotham mt-[34px]">
          <AmanaLogo
            width={122}
            height={85}
            className="w-[122px] h-[85px] mb-4"
          />

          <h1 className="text-[32px] sm:text-[48px] md:text-[64px] font-bold gradient-text text-center mb-6">
            What are <span className="">smart accounts?</span>
          </h1>

          <p className="text-[18px] sm:text-[20px] md:text-[24px] text-[#535E73] font-medium text-center max-w-xl md:max-w-3xl mb-10 font-gotham">
            A new, secure way to use DeFi — no seed phrases, no gas fees, just
            simple login and powerful features.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10 w-full mx-auto px-4 max-w-[1560px]">
          {smartAccountInfo.map((info, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2, duration: 0.4 }}
            >
              <SmartAccountCard {...info} />
            </motion.div>
          ))}
        </div>
        <div className="max-w-[352px] mt-10 mb-6 mx-auto w-full px-4">
          <Button
            onClick={() => openStep("optionsB")}
            className="!w-full !h-[48px]"
            variant="custom"
          >
            Create Wallet
          </Button>
        </div>
      </>
    );
};

export default OnboardingContainer;
