import RoadmapIcon from "@/components/svg/about/RoadmapIcon";
import { motion } from "framer-motion";

interface RoadmapItem {
  quarter: string;
  title: string;
  tasks: string[];
  isHighlighted?: boolean;
  highlightLabel?: string;
  highlightDescription?: string;
}

const Roadmap = () => {
  const ROADMAP_DATA: RoadmapItem[] = [
    {
      quarter: "Q1",
      title: "Product Development",
      tasks: [
        "Launch Website and App",
        "Deploy EVM-Compatible Vaults",
        "Smart Contract Audit with Linum Labs",
        "Improve UX/UI with Community Feedback",
      ],
    },
    {
      quarter: "Q2",
      title: "Product Improvement",
      tasks: [
        "Launch Curve-Convex Vaults",
        "Integrate further Blockchain Wallets",
        "Smart Account Passkey UX",
        "Reg-compliant Stablecoin Vaults",
      ],
      isHighlighted: true,
      highlightLabel: "We are Here",
      highlightDescription: "Introduce Smart Account Sign-in",
    },
    {
      quarter: "Q3",
      title: "Institutional Growth",
      tasks: [
        "Onboard first Institutional Vault Partners",
        "Intelligent Vaults (AI Rebalancing)",
        "Enhanced Swap/Routing Engine for deeper Liquidity",
        "Integrate further Yield Strategies",
      ],
    },
    {
      quarter: "Q4",
      title: "New Partnerships",
      tasks: [
        "Release Institutional Dashboard",
        "Launch KYC-optional Vaults",
        "TGE for Amana Token + CEX Listings",
        "Begin Work on regulated, compliant Stablecoin Products (2026 Prep)",
      ],
    },
  ];

  return (
    <section className="mt-[275px] relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative z-20 right-1"
      >
        <RoadmapIcon />
      </motion.div>
      <div className="flex flex-row justify-between items-start">
        {ROADMAP_DATA.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            viewport={{ once: true }}
            className="relative max-w-[360px]"
          >
            {item.isHighlighted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="absolute top-[-220px] left-0 max-w-[360px] h-[748px] rounded-[24px] pt-[22px] pl-4 z-10"
                style={{
                  background:
                    "linear-gradient(180deg, #101219 0%, #1b46e0 100%)",
                }}
              >
                <div className="font-normal text-[16px] text-[#9A9CB3] mb-10">
                  Roadmap
                </div>

                <div className="font-normal text-[40px] text-white mb-3 max-h-[48px]">
                  {item.highlightLabel}
                </div>

                <div className="font-normal text-[16px] text-[#9A9CB3] mb-12">
                  {item.highlightDescription}
                </div>

                <h2
                  className="font-bold text-[48px] mb-4"
                  style={{
                    background:
                      "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {item.quarter}
                </h2>

                <h3 className="font-medium text-[24px] text-white mb-6">
                  {item.title}
                </h3>

                <ul className="flex flex-col gap-8">
                  {item.tasks.map((task, taskIndex) => (
                    <motion.li
                      key={taskIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.6 + taskIndex * 0.1,
                      }}
                      viewport={{ once: true }}
                      className="font-normal text-[16px] text-[#9A9CB3] flex items-start gap-3"
                    >
                      <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                      <span>{task}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : null}

            <div>
              <h2
                className="font-bold text-[48px] mb-4 "
                style={{
                  background:
                    "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {item.quarter}
              </h2>

              <h3 className="font-medium text-[24px] text-white mb-6">
                {item.title}
              </h3>

              <ul className="flex flex-col gap-8">
                {item.tasks.map((task, taskIndex) => (
                  <motion.li
                    key={taskIndex}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + taskIndex * 0.1 }}
                    viewport={{ once: true }}
                    className="font-normal text-[16px] text-[#9A9CB3] flex items-start gap-3"
                  >
                    <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                    <span>{task}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Roadmap;
