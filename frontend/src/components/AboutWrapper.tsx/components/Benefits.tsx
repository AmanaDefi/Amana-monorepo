import Image from "next/image";
import LightingIcon from "@/components/svg/about/LightningIcon";
import CrossChainIcon from "@/components/svg/about/CrossChainIcon";
import InfoIcon from "@/components/svg/PointsIcon";
import RecoveryIcon from "@/components/svg/about/RecoveryIcon";
import WalletIcon from "@/components/svg/about/WalletIcon";
import RebalancingIcon from "@/components/svg/about/RebalancingIcon";
import SmartContractsIcon from "@/components/svg/about/SmartContractsIcon";
import { motion } from "framer-motion";

interface Benefit {
  id: string;
  title: string;
  icon: React.ReactNode;
  hasGradientBorder?: boolean;
  hasDoubleIcon?: boolean;
}

const BENEFITS_DATA: Benefit[] = [
  {
    id: "smart-vaults",
    title: "Smart Vaults",
    icon: <LightingIcon />,
  },
  {
    id: "cross-chain",
    title: "Cross-Chain Deposits",
    icon: <CrossChainIcon />,
  },
  {
    id: "email-start",
    title: "Start with email",
    icon: (
      <Image
        src="/email.png"
        alt="email"
        quality={100}
        width={20}
        height={16}
      />
    ),
  },
  {
    id: "earn-rewards",
    title: "Earn Rewards",
    icon: <InfoIcon />,
    hasGradientBorder: true,
  },
  {
    id: "easy-recovery",
    title: "Easy Recovery",
    icon: <RecoveryIcon />,
    hasGradientBorder: true,
  },
  {
    id: "wallet-optional",
    title: "Wallet-Optional Onboarding",
    icon: <WalletIcon />,
  },
  {
    id: "stablecoin-yield",
    title: "Stablecoin Yield",
    icon: (
      <div className="relative flex items-center mr-3">
        <Image
          src="/usdc-about.png"
          alt="USDC"
          width={20}
          height={20}
          quality={100}
        />
        <Image
          src="/tether-about.png"
          alt="Tether"
          width={20}
          height={20}
          quality={100}
          className="absolute left-3 "
        />
      </div>
    ),
    hasGradientBorder: true,
    hasDoubleIcon: true,
  },
  {
    id: "auto-rebalancing",
    title: "Auto-rebalancing strategies",
    icon: <RebalancingIcon />,
  },
  {
    id: "audited-contracts",
    title: "Audited Smart Contracts",
    icon: <SmartContractsIcon />,
  },
];

const MOBILE_BENEFITS_DATA: Benefit[] = [
  {
    id: "smart-vaults",
    title: "Smart Vaults",
    icon: <LightingIcon />,
  },
  {
    id: "cross-chain",
    title: "Cross-Chain Deposits",
    icon: <CrossChainIcon />,
  },
  {
    id: "stablecoin-yield",
    title: "Stablecoin Yield",
    icon: (
      <div className="relative flex items-center mr-3">
        <Image
          src="/USDC.png"
          alt="USDC"
          width={20}
          height={20}
          quality={100}
        />
        <Image
          src="/tether.png"
          alt="Tether"
          width={20}
          height={20}
          quality={100}
          className="absolute left-3 "
        />
      </div>
    ),
    hasGradientBorder: true,
    hasDoubleIcon: true,
  },
  {
    id: "audited-contracts",
    title: "Audited Smart Contracts",
    icon: <SmartContractsIcon />,
  },
  {
    id: "earn-rewards",
    title: "Earn Rewards",
    icon: <InfoIcon />,
    hasGradientBorder: true,
  },
  {
    id: "wallet-optional",
    title: "Wallet-Optional Onboarding",
    icon: <WalletIcon />,
  },
];

interface BenefitCardProps {
  title: string;
  icon: React.ReactNode;
  hasGradientBorder?: boolean;
  index: number;
}

const BenefitCard = ({
  title,
  icon,
  hasGradientBorder = false,
  index,
}: BenefitCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    viewport={{ once: true }}
    whileHover={{ scale: 1.05 }}
    className={`
      flex items-center gap-3 px-[20px] md:px-[20px] lg:px-[23px] py-4 
      rounded-[2000px] w-fit h-[56px] md:h-[58px] lg:h-[56px]
      backdrop-blur-[20px] 
      shadow-[inset_0_2px_4px_0_rgba(82,81,197,0.25)]
      bg-[var(--main)] text-[var(--white)]
      font-normal text-base md:text-base lg:text-base
      ${hasGradientBorder ? "before-gradient-border" : ""}
    `}
  >
    {icon}
    <span className="whitespace-nowrap text-sm md:text-sm lg:text-base">
      {title}
    </span>
  </motion.div>
);

const MobileBenefits = () => {
  return (
    <section className="mt-[64px] md:mt-[86px] lg:mt-[109px]">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="hidden md:block text-white text-[36px] md:text-[42px] lg:text-[48px] leading-[-0.04em] text-center font-bold mb-12 md:mb-14 lg:mb-16"
      >
        Amana Benefits
      </motion.h1>

      {/* Mobile layout */}
      <div className="md:hidden px-4">
        <div className="flex flex-col space-y-8 max-w-xs mx-auto">
          {MOBILE_BENEFITS_DATA.map((benefit, index) => (
            <div
              key={benefit.id}
              className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}
            >
              <BenefitCard
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tablet layout */}
      <div className="hidden md:block lg:hidden px-4">
        <div className="flex flex-col gap-5 max-w-[800px] mx-auto">
          {/* First row - 2 cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {BENEFITS_DATA.slice(0, 2).map((benefit, index) => (
              <BenefitCard
                key={benefit.id}
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index}
              />
            ))}
          </div>

          {/* Second row - 3 cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {BENEFITS_DATA.slice(2, 5).map((benefit, index) => (
              <BenefitCard
                key={benefit.id}
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index + 2}
              />
            ))}
          </div>

          {/* Third row - 2 cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {BENEFITS_DATA.slice(5, 7).map((benefit, index) => (
              <BenefitCard
                key={benefit.id}
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index + 5}
              />
            ))}
          </div>

          {/* Fourth row - 2 cards */}
          <div className="flex flex-wrap justify-center gap-3">
            {BENEFITS_DATA.slice(7).map((benefit, index) => (
              <BenefitCard
                key={benefit.id}
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index + 7}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="flex flex-col gap-8 max-w-[767px] lg:max-w-4xl xl:max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-8">
            {BENEFITS_DATA.slice(0, 5).map((benefit, index) => (
              <BenefitCard
                key={benefit.id}
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index}
              />
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-8">
            {BENEFITS_DATA.slice(5).map((benefit, index) => (
              <BenefitCard
                key={benefit.id}
                title={benefit.title}
                icon={benefit.icon}
                hasGradientBorder={benefit.hasGradientBorder}
                index={index + 5}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileBenefits;
