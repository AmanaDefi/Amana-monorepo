"use client";

import ElephantLoader from "@/components/ElephantLoader";
import CrossChainTransferIcon from "@/components/svg/instruction/CrossChainTransferIcon";
import FinalConfirmationIcon from "@/components/svg/instruction/FinalConfirmationIcon";
import SelectTokenIcon from "@/components/svg/instruction/SelectTokenIcon";
import { useAuthStore } from "@/store/authStore";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const WelcomeContainer = () => {
  const router = useRouter();
  const username = useAuthStore((state) => state.username);
  const isWalletLoading = true;

  const benefits = [
    {
      title: "Non-custodial",
      Icon: SelectTokenIcon,
    },
    {
      title: "Universal-chain",
      Icon: CrossChainTransferIcon,
    },
    {
      title: "Easy recovery",
      Icon: FinalConfirmationIcon,
    },
  ];

  const logoVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.2,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white text-center font-gotham">
      <motion.div variants={logoVariants} initial="hidden" animate="visible">
        <AmanaLogo width={122} height={85} />
      </motion.div>

      <motion.h1
        className="text-3xl md:text-7xl font-bold mt-10"
        variants={titleVariants}
        initial="hidden"
        animate="visible"
      >
        Welcome to{" "}
        <motion.span
          className="text-[#1B46E0]"
          animate={{
            textShadow: [
              "0 0 0px #1B46E0",
              "0 0 5px rgba(27, 70, 224, 0.4)",
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

      <ElephantLoader isLoading={isWalletLoading} />

      <p className="text-lg md:text-[24px] font-medium mt-10">
        {username ? `Congratulations ${username},` : "Congratulations!"} you've
        been created a wallet on ZetaChain!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[121px] mt-[74px] max-w-[1202px] w-full">
        {benefits.map(({ title, Icon }, index) => (
          <div
            key={index}
            className="rounded-[16px] py-[30px] px-[66px] flex flex-col items-center gap-4 backdrop-blur-[20px] before-gradient-border"
          >
            <div className="rounded-lg bg-[#14171F] h-12 w-12 border border-[#3E73C4] flex justify-center items-center">
              <Icon width={20} height={20} />
            </div>
            <span className="text-base md:text-[24px] font-medium">
              {title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WelcomeContainer;
