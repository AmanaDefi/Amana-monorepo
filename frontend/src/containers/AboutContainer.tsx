import AboutWrapper from "@/components/AboutWrapper.tsx";
import Footer from "@/components/Footer";
import AboutLine from "@/components/svg/about/AboutLine";
import { useMultiChain } from "@/providers/MultiChainProvider";
import Image from "next/image";

const AboutContainer = ({ }) => {
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;

  return (
    <div className="font-gotham flex flex-col justify-center items-center">
      <div className="text-center max-w-6xl mx-auto">
        <p className="text-[20px] text-white leading-tight mb-4">
          Simplifying Your DeFi Investments
        </p>
        <div className="text-[96px] font-bold leading-tight">
          <div className="flex justify-center items-center gap-2">
            <span className="text-white">Amana</span>
            <Image
              src="/amanaAbout.png"
              alt="Elephant"
              width={125}
              height={71}
              className="mx-2"
            />
            <span className="gradient-text">DeFi Yield</span>
          </div>
          <div className="text-center">
            <span className="gradient-text">Aggregator</span>
          </div>
        </div>
      </div>
      <button className="w-full bg-transparent border border-[#3E73C4] rounded-lg py-4 px-8 mt-8 max-h-[56px] max-w-[192px] ">
        Get Started
      </button>
      <AboutWrapper />
      <div className="flex flex-col justify-center items-center mt-[217px]">
        <span className="text-[48px] font-normal max-w-[550px] text-center">
          All of the profit None of the work
        </span>
        <button className="w-full bg-transparent border border-[#3E73C4] rounded-lg py-4 px-8 mt-6 max-h-[56px] max-w-[192px] ">
          Get Started
        </button>
      </div>

      <AboutLine className="relative -mt-[220px]" />
      <div
        className="absolute z-10 px-[68px]"
        style={{ bottom: "108px", left: 0, right: 0 }}
      >
        <Footer isConnected={isConnected} />
      </div>
    </div>
  );
};

export default AboutContainer;
