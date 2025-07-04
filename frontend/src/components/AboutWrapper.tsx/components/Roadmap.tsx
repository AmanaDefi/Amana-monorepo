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
    <section className="mt-[484px]">
      <div className="flex flex-row justify-between items-start">
        {ROADMAP_DATA.map((item, index) => (
          <div key={index} className="relative max-w-[360px]">
            {item.isHighlighted ? (
              <div
                className="absolute top-[-218px] left-0 max-w-[360px] h-[748px] rounded-[24px] pt-[22px] pl-4 z-10"
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
                    <li
                      key={taskIndex}
                      className="font-normal text-[16px] text-[#9A9CB3] flex items-start gap-3"
                    >
                      <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
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
                  <li
                    key={taskIndex}
                    className="font-normal text-[16px] text-[#9A9CB3] flex items-start gap-3"
                  >
                    <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Roadmap;
