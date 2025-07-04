import Image from "next/image";
import LightingIcon from "@/components/svg/about/LightningIcon";
import CrossChainIcon from "@/components/svg/about/CrossChainIcon";
import EmailIcon from "@/components/svg/about/EmailIcon";
import InfoIcon from "@/components/svg/PointsIcon";
import RecoveryIcon from "@/components/svg/about/RecoveryIcon";
import WalletIcon from "@/components/svg/about/WalletIcon";
import RebalancingIcon from "@/components/svg/about/RebalancingIcon";
import SmartContractsIcon from "@/components/svg/about/SmartContractsIcon";

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
    icon: <EmailIcon />,
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
        <Image src="/USDC.png" alt="USDC" width={20} height={20} />
        <Image
          src="/tether.png"
          alt="Tether"
          width={20}
          height={20}
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

interface BenefitCardProps {
  title: string;
  icon: React.ReactNode;
  hasGradientBorder?: boolean;
}

const BenefitCard = ({
  title,
  icon,
  hasGradientBorder = false,
}: BenefitCardProps) => (
  <div
    className={`
      flex items-center gap-3 px-[23px] py-4 
      rounded-[2000px] w-fit h-[56px]
      backdrop-blur-[20px] 
      shadow-[inset_0_2px_4px_0_rgba(82,81,197,0.25)]
      bg-[var(--main)] text-[var(--white)]
      font-normal text-base
      ${hasGradientBorder ? "before-gradient-border" : ""}
    `}
  >
    {icon}
    <span className="whitespace-nowrap">{title}</span>
  </div>
);

const Benefits = () => {
  const firstRow = BENEFITS_DATA.slice(0, 5);
  const secondRow = BENEFITS_DATA.slice(5);

  return (
    <section className="mt-[109px]">
      <h1 className="text-white text-[48px] leading-[-0.04em] text-center font-bold mb-16">
        Amana Benefits
      </h1>

      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-center gap-8">
          {firstRow.map((benefit) => (
            <BenefitCard
              key={benefit.id}
              title={benefit.title}
              icon={benefit.icon}
              hasGradientBorder={benefit.hasGradientBorder}
            />
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {secondRow.map((benefit) => (
            <BenefitCard
              key={benefit.id}
              title={benefit.title}
              icon={benefit.icon}
              hasGradientBorder={benefit.hasGradientBorder}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
