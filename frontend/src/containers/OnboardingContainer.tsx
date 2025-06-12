"use client";
import Button from "@/components/Button";
import SmartAccountCard from "@/components/SmartAccountCard";
import { smartAccountInfo } from "@/constants/smartAccountInfo";
import { useAuthStore } from "@/store/authStore";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRouter } from "next/navigation";


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

          <h1 className="text-[48px] sm:text-[64px] font-bold text-white text-center mb-6">
            What are <span className="text-[#1B46E0]">smart accounts?</span>
          </h1>

          <p className="text-[16px] text-white text-center leading-relaxed max-w-3xl mb-10">
            Smart Accounts are the new standard for accessing and interacting
            with DeFi. They replace complicated crypto wallets, seed phrases,
            and gas fees with secure, intuitive experiences — just like the apps
            you already use
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-[1560px] mx-auto">
          {smartAccountInfo.map((info, index) => (
            <SmartAccountCard key={index} {...info} />
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
