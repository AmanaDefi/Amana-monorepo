import GradientWalletIcon from "@/components/svg/about/GradientWalletIcon";
import GradientAssetIcon from "@/components/svg/about/GradientAssetIcon";
import GradientLightingIcon from "@/components/svg/about/GradientLightingIcon";
import GradientWithdrawIcon from "@/components/svg/about/GradientWithdrawIcon";
import ArrowIcon from "@/components/svg/about/Arrow";

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
      icon: <GradientWalletIcon width="29" height="25" />,
    },
    {
      title: "Deposit Assets",
      description:
        "Choose a vault based on your preferred asset (e.g., ETH, USDC) and deposit your tokens. You'll receive yield-bearing tokens representing your share of the vault.",
      icon: <GradientAssetIcon width="29" height="25" />,
    },
    {
      title: "Earn Yield",
      description:
        "Your assets will be automatically allocated to the highest-yield strategies available. Amana manages everything in the background, allowing you to passively earn yield.",
      icon: <GradientLightingIcon width="29" height="25" />,
    },
    {
      title: "Withdraw Anytime",
      description:
        "Redeem your vault tokens at any time to withdraw your assets along with any earned yield.",
      icon: <GradientWithdrawIcon width="29" height="25" />,
    },
  ];

  return (
    <section className="mt-[150px]">
      <h1 className="text-white text-[48px] leading-[-0.04em] text-center font-bold mb-16">
        How to Use Amana
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mx-auto">
        {ADVICE_DATA.map((advice, index) => (
          <div key={index} className="relative">
            <div
              className="absolute -top-12 left-1 text-[48px] font-normal "
              style={{
                fontFamily: "var(--font-family)",
                background: "linear-gradient(90deg, #302e44 0%, #454363 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="absolute z-10 bg-[#14171F] rounded-[24px] h-[300px] pl-6 pt-[35px] pr-4 pb-6 before-gradient-border max-w-[350px]">
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

              <p className="text-white text-sm font-normal leading-relaxed w-full max-w-[257px]">
                {advice.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Advice;
