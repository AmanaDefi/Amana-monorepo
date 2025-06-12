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

          <h1 className="text-[48px] sm:text-[64px] font-bold gradient-text text-center mb-6">
            What are <span className="">smart accounts?</span>
          </h1>

          <p className="text-[24px] text-[#535E73] font-medium text-center max-w-3xl mb-10 font-gotham">
            A new, secure way to use DeFi — no seed phrases, no gas fees, just
            simple login and powerful features.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[46px] w-full mx-auto">
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
        <div className="max-w-[400px] mt-12 mb-8 mx-auto">
          <Button
            onClick={() => openStep("optionsB")}
            className="w-full h-[48px]"
            variant="custom"
          >
            Continue
          </Button>
        </div>
      </>
    );
};

export default OnboardingContainer;
