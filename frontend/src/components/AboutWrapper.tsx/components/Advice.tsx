import ArrowIcon from "@/components/svg/about/Arrow";
import { motion } from "framer-motion";
import Image from "next/image";

interface Advice {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const Advice = () => {
  const ADVICE_DATA: Advice[] = [
    {
      title: "Fund your Smart Account",
      description:
        "You'll find your wallet address and balance in the top right. It supports 1-click, gas-free transactions.Fund it by depositing from another wallet or buying tokens via Amana.",
      icon: (
        <Image
          src="/wallet-about.png"
          alt="wallet icon"
          width="29"
          height="25"
        />
      ),
    },
    {
      title: "Deposit Assets",
      description:
        "Choose a vault based on your preferred asset (e.g., ETH, USDC) and deposit your tokens. You'll receive yield-bearing tokens representing your share of the vault.",
      icon: (
        <Image
          src="/deposit-about.png"
          alt="deposit icon"
          width="29"
          height="25"
        />
      ),
    },
    {
      title: "Earn Yield",
      description:
        "Your assets will be automatically allocated to the highest-yield strategies available. Amana manages everything in the background, allowing you to passively earn yield.",
      icon: (
        <Image src="/earn-about.png" alt="earn icon" width="20" height="28" />
      ),
    },
    {
      title: "Withdraw Anytime",
      description:
        "Redeem your vault tokens at any time to withdraw your assets along with any earned yield.",
      icon: (
        <Image
          src="/withdraw-about.png"
          alt="withdraw icon"
          width="24"
          height="24"
        />
      ),
    },
  ];

  return (
    <section className="mt-[64px] md:mt-[100px] lg:mt-[150px]">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-white text-[24px] md:text-[36px] lg:text-[48px] leading-[-0.04em] text-center font-bold mb-[72px] md:mb-[60px] lg:mb-16"
      >
        How to Use Amana
      </motion.h1>

      {/* Mobile layout */}
      <div className="md:hidden px-4 max-w-xs mx-auto">
        <div className="flex flex-col space-y-[72px]">
          {ADVICE_DATA.map((advice, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="absolute -top-12 left-1 text-[48px] font-normal "
                style={{
                  fontFamily: "var(--font-family)",
                  background:
                    "linear-gradient(90deg, #302e44 0%, #454363 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                className="absolute z-10 bg-[#14171F] rounded-[24px] h-[300px] pl-6 pt-[35px] pr-4 pb-6 before-gradient-border w-full"
              >
                <div className="absolute top-4 right-4">
                  <ArrowIcon width="24" height="24" />
                </div>

                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: "#14171F",
                      boxShadow:
                        "0 4px 6px 0 rgba(0, 0, 0, 0.1), 0 4px 4px 0 rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    {advice.icon}
                  </div>
                </div>

                <h3 className="text-white text-base font-bold mb-4">
                  {advice.title}
                </h3>

                <p className="text-white text-sm font-normal leading-relaxed w-full">
                  {advice.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tablet layout */}
      <div className="hidden md:block lg:hidden px-6">
        <div className="grid grid-cols-2 gap-6 max-w-[728px] mx-auto">
          {ADVICE_DATA.map((advice, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="absolute -top-12 left-1 text-[42px] font-normal "
                style={{
                  fontFamily: "var(--font-family)",
                  background:
                    "linear-gradient(90deg, #302e44 0%, #454363 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                className="bg-[#14171F] rounded-[24px] h-[320px] pl-6 pt-[35px] pr-4 pb-6 before-gradient-border w-full"
              >
                <div className="absolute top-4 right-4">
                  <ArrowIcon width="24" height="24" />
                </div>

                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: "#14171F",
                      boxShadow:
                        "0 4px 6px 0 rgba(0, 0, 0, 0.1), 0 4px 4px 0 rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    {advice.icon}
                  </div>
                </div>

                <h3 className="text-white text-lg font-bold mb-4">
                  {advice.title}
                </h3>

                <p className="text-white text-sm font-normal leading-relaxed">
                  {advice.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block px-4">
        <div className="grid grid-cols-2 2xl:grid-cols-4 gap-6 max-w-[780px] 2xl:max-w-none mx-auto px-6 xl:px-2">
          {ADVICE_DATA.map((advice, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div
                className="absolute -top-12 left-1 text-[48px] font-normal "
                style={{
                  fontFamily: "var(--font-family)",
                  background:
                    "linear-gradient(90deg, #302e44 0%, #454363 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                className="bg-[#14171F] rounded-[24px] h-[300px] pl-6 pt-[35px] pr-4 pb-6 before-gradient-border w-full xl:max-w-[350px]"
              >
                <div className="absolute top-4 right-4">
                  <ArrowIcon width="24" height="24" />
                </div>

                <div className="mb-6">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{
                      background: "#14171F",
                      boxShadow:
                        "0 4px 6px 0 rgba(0, 0, 0, 0.1), 0 4px 4px 0 rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    {advice.icon}
                  </div>
                </div>

                <h3 className="text-white text-base font-bold mb-4">
                  {advice.title}
                </h3>

                <p className="text-white text-sm font-normal leading-relaxed w-full xl:max-w-[257px]">
                  {advice.description}
                </p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Advice;
