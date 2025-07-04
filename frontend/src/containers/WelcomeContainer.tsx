"use client";

import ElephantLoader from "@/components/ElephantLoader";
import CrossChainTransferIcon from "@/components/svg/instruction/CrossChainTransferIcon";
import FinalConfirmationIcon from "@/components/svg/instruction/FinalConfirmationIcon";
import SelectTokenIcon from "@/components/svg/instruction/SelectTokenIcon";
import { useAuthStore } from "@/store/authStore";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { motion } from "framer-motion";

const WelcomeContainer = () => {
  const { username, closeAll } = useAuthStore();
  const isWalletLoading = true;

  const benefits = [
    { title: "Non-custodial", Icon: SelectTokenIcon },
    { title: "Universal-chain", Icon: CrossChainTransferIcon },
    { title: "Easy recovery", Icon: FinalConfirmationIcon },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-white text-center font-gotham w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mt-6 sm:mt-8">
          <div className="block md:hidden">
            <AmanaLogo width={122} height={85} />
          </div>
          <div className="hidden md:block">
            <AmanaLogo width={100} height={70} />
          </div>
        </div>
      </motion.div>

      <motion.h1
        className="mt-6 sm:mt-8 font-bold
                   text-[20px]  leading-tight tracking-[-0.05em] md:text-6xl lg:text-7xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        Welcome to{" "}
        <motion.span
          className="text-[#1B46E0]"
          animate={{
            textShadow: [
              "0 0 0px #1B46E0",
              "0 0 6px rgba(27, 70, 224, 0.5)",
              "0 0 0px #1B46E0",
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          AMANA
        </motion.span>{" "}
        DEFI
      </motion.h1>

      <ElephantLoader
        isLoading={isWalletLoading}
        onComplete={() => closeAll()}
      />
      <p className="hidden md:block text-lg md:text-xl font-medium mt-8 px-4 md:px-0 max-w-[700px]">
        <span className="hidden md:block text-lg md:text-xl font-medium mt-8 px-4 md:px-0 max-w-[700px]">
          Congratulations! You&apos;ve successfully created a wallet on
          ZetaChain!
        </span>
      </p>
      <div className="hidden md:flex flex-wrap justify-center gap-6 sm:gap-8 mt-10 sm:mt-12 max-w-[940px] w-full px-4 sm:px-6">
        {benefits.map(({ title, Icon }, index) => (
          <motion.div
            key={index}
            className="max-w-[276px] w-full rounded-[16px] py-5 px-4 sm:px-6 md:px-10 flex flex-col items-center gap-4 backdrop-blur-[20px] before-gradient-border bg-[#0E1014]/50 border border-[#3E73C4]/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <div className="rounded-lg bg-[#14171F] h-12 w-12 border border-[#3E73C4] flex justify-center items-center">
              <Icon width={20} height={20} />
            </div>
            <span className="text-sm sm:text-base md:text-lg font-medium">
              {title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeContainer;
