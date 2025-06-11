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
        <AmanaLogo width={122} height={85} />
      </motion.div>

      <motion.h1
        className="text-3xl md:text-6xl font-bold mt-8"
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

      <ElephantLoader isLoading={isWalletLoading} onComplete={() => closeAll()} />

      <p className="text-lg md:text-xl font-medium mt-8 px-4 md:px-0 max-w-[700px]">
        {username ? `Congratulations ${username},` : "Congratulations!"} you’ve
        successfully created a wallet on ZetaChain!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-[940px] w-full px-6">
        {benefits.map(({ title, Icon }, index) => (
          <motion.div
            key={index}
            className="rounded-[16px] py-6 px-6 md:px-10 flex flex-col items-center gap-4 backdrop-blur-[20px] before-gradient-border bg-[#0E1014]/50 border border-[#3E73C4]/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <div className="rounded-lg bg-[#14171F] h-12 w-12 border border-[#3E73C4] flex justify-center items-center">
              <Icon width={20} height={20} />
            </div>
            <span className="text-base md:text-lg font-medium">{title}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeContainer;
