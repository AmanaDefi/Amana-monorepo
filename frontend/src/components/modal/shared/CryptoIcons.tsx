import BaseIcon from "@/components/svg/BaseIcon";
import MetaMaskIcon from "@/components/svg/MetaMaskIcon";
import PhantomIcon from "@/components/svg/PhantomIcon";

const CryptoIcons = ({}) => {
  return (
    <div className="flex flex-row items-center">
      <div className="rounded-full bg-[#0C1015] w-5 h-5 border border-[#d9d9d9]/50 flex items-center justify-center z-10">
        <PhantomIcon width={12} height={10} />
      </div>
      <div className="rounded-full bg-[#0C1015] w-5 h-5 border border-[#d9d9d9]/50 flex items-center justify-center -ml-1 z-20">
        <BaseIcon width={12} height={12} />
      </div>
      <div className="rounded-full bg-[#0C1015] w-5 h-5 border border-[#d9d9d9]/50 flex items-center justify-center -ml-1 z-30">
        <MetaMaskIcon width={13} height={12} />
      </div>
    </div>
  );
};

export default CryptoIcons;