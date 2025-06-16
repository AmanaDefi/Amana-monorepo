import Image from "next/image";

const TopTokens = ({}) => {
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

  return (
    <div className="flex gap-8">
      {cryptoData.map((crypto, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center text-xl">
            <Image src={crypto.icon} alt={crypto.symbol} width={44} height={44} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-[2px]">
              <span className="text-[16] font-normal">{crypto.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[18px] font-bold">{crypto.price}</span>
              <span className="text-[#05D47F] text-sm font-normal">
                {crypto.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopTokens;