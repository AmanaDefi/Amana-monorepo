import Image from "next/image";
import { FC } from "react";

interface Feature {
  id: string;
  image: string;
  alt: string;
  title: string;
  description: string;
}

interface FeatureCardProps {
  image: string;
  alt: string;
  title: string;
  description: string;
  isLast?: boolean;
}

const FEATURES_DATA: Feature[] = [
  {
    id: "yield-optimization",
    image: "/powerImage.png",
    alt: "power",
    title: "Automated Yield Optimization",
    description:
      "Amana continuously seeks out the best yield opportunities across various DeFi protocols and chains. When you deposit assets into one of Amana's vaults, they are automatically allocated to strategies that generate the highest returns, whether it's through lending, liquidity provision, or staking.",
  },
  {
    id: "security",
    image: "/security.png",
    alt: "security",
    title: "Security and Audits",
    description:
      "Amana prioritizes security by employing best practices in smart contract development, including regular audits and thorough testing. The platform is built with transparency in mind, allowing users to review and audit the protocol's smart contracts at any time.",
  },
];

const FeatureCard: FC<FeatureCardProps> = ({
  image,
  alt,
  title,
  description,
  isLast = false,
}) => (
  <div
    className={`rounded-[24px] px-10 py-8 before-gradient-border flex flex-col max-w-[708px]`}
  >
    <Image src={image} alt={alt} width={64} height={64} />
    <h3 className="text-lg font-bold mt-8">{title}</h3>
    <p className="text-sm font-normal mt-2">{description}</p>
  </div>
);

const Features: FC = () => {
  return (
    <section className="flex flex-col justify-center mt-[140px]">
      <h2 className="text-white text-[48px] leading-[-0.04em] text-center font-bold mb-10">
        How Amana Works
      </h2>
      <div className="flex flex-row w-full justify-between">
        {FEATURES_DATA.map((feature, index) => (
          <FeatureCard
            key={feature.id}
            {...feature}
            isLast={index === FEATURES_DATA.length - 1}
          />
        ))}
      </div>
    </section>
  );
};

export default Features;
