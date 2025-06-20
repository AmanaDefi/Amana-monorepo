import Image from "next/image";
import { useState, useEffect } from "react";

const TopTokens = ({}) => {
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const cryptoData = [
    {
      name: "Ethereum",
      symbol: "ETH",
      price: "$40,432",
      change: "+1.45",
      icon: "/ETH.png",
    },
    {
      name: "BNB",
      symbol: "BNB",
      price: "$2,432",
      change: "+1.45",
      icon: "/bnb-bnb-logo.png",
    },
    {
      name: "USDC",
      symbol: "USDC",
      price: "$2,432",
      change: "+1.45",
      icon: "/USDC.png",
    },
  ];

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 597);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const itemsToShow =
    isMobile && !showAll ? cryptoData.slice(0, 2) : cryptoData;

  return (
    <div className="relative">
      {isMobile && cryptoData.length > 2 && (
        <div className="flex justify-end mb-1 ">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[#3E73C4] text-[16px] font-normal underline"
          >
            {showAll ? "Show less" : "See all"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 md:gap-8">
        {itemsToShow.map((crypto, index) => (
          <div key={index} className="flex items-center gap-2 md:gap-3">
            <div className="md:w-11 md:h-11 rounded-full flex items-center justify-center text-xl">
              <Image
                src={crypto.icon}
                alt={crypto.symbol}
                width={40}
                height={40}
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-[2px]">
                <span className="text-[16px] font-normal">{crypto.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] md:text-[18px] font-bold">{crypto.price}</span>
                <span className="text-[#05D47F] text-sm font-normal">
                  {crypto.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopTokens;
