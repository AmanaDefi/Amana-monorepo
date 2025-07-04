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
  index,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay: index * 0.2 }}
    viewport={{ once: true }}
    whileHover={{ y: -5 }}
    className={`rounded-[24px] px-10 py-8 before-gradient-border flex flex-col max-w-[708px]`}
  >
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      whileInView={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 + 0.3 }}
      viewport={{ once: true }}
    >
      <Image src={image} alt={alt} width={64} height={64} />
    </motion.div>
    <h3 className="text-lg font-bold mt-8">{title}</h3>
    <p className="text-sm font-normal mt-2">{description}</p>
  </motion.div>
);

const Features: FC = () => {
  return (
    <section className="flex flex-col justify-center mt-[140px]">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-white text-[48px] leading-[-0.04em] text-center font-bold mb-10"
      >
        How Amana Works
      </motion.h2>
      <div className="flex flex-row w-full justify-between">
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
