import Image from "next/image";
import { FC } from "react";
import { motion } from "framer-motion";

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
  index: number;
}

const FEATURES_DATA: Feature[] = [
  {
    id: "yield-optimization",
    image: "/power-about.png",
    alt: "power",
    title: "Automated Yield Optimization",
    description:
      "Amana continuously seeks out the best yield opportunities across various DeFi protocols and chains. When you deposit assets into one of Amana's vaults, they are automatically allocated to strategies that generate the highest returns, whether it's through lending, liquidity provision, or staking.",
  },
  {
    id: "security",
    image: "/security-about.png",
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
  index,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: index * 0.2 }}
    viewport={{ once: true }}
    whileHover={{ y: -5 }}
    className={`rounded-[24px] px-4 sm:px-6 md:px-7 lg:px-10 py-6 md:py-7 lg:py-8 before-gradient-border flex flex-col mx-auto max-w-xs md:max-w-[728px] lg:max-w-[600px]  xl:flex-1 ${
      !isLast ? "mb-4 md:mb-5 lg:mb-0 xl:mr-4" : ""
    }`}
  >
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      whileInView={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 + 0.3 }}
      viewport={{ once: true }}
    >
      <Image
        src={image}
        alt={alt}
        width={40}
        height={40}
        className="w-8 h-8 sm:w-10 sm:h-10 md:w-[52px] md:h-[52px] lg:w-[64px] lg:h-[64px]"
      />
    </motion.div>
    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold mt-3 sm:mt-4 md:mt-6 lg:mt-8">
      {title}
    </h3>
    <p className="text-xs sm:text-sm md:text-base lg:text-sm font-normal mt-2 md:mt-3 leading-relaxed">
      {description}
    </p>
  </motion.div>
);

const Features: FC = () => {
  return (
    <section className="flex flex-col justify-center mt-[116px] md:mt-[130px] lg:mt-[140px] px-4 sm:px-6 md:px-8 xl:px-3">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-white text-xl sm:text-2xl md:text-4xl lg:text-[48px] leading-tight lg:leading-[-0.04em] text-center font-bold mb-6 sm:mb-8 md:mb-9 lg:mb-10"
      >
        How Amana Works
      </motion.h2>
      <div className="flex flex-col md:flex-col xl:flex-row w-full xl:justify-between md:gap-5 xl:gap-0">
        {FEATURES_DATA.map((feature, index) => (
          <FeatureCard
            key={feature.id}
            {...feature}
            isLast={index === FEATURES_DATA.length - 1}
            index={index}
          />
        ))}
      </div>
    </section>
  );
};

export default Features;
