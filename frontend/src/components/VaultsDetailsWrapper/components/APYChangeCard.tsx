export default function APYChangeCard() {
  return (
    <div className="bg-[#161C27] rounded-2xl px-12 py-6 font-normal text-sm text-white mt-[44px]">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span>Implemented APY Change</span>
          <span className="font-bold">8,725%</span>
        </div>

        <div className="flex justify-between items-center">
          <span>Effective Implied APY</span>
          <span className="font-bold">9,088%</span>
        </div>

        <div className="flex justify-between items-center">
          <span>Min. Received</span>
          <span className="font-bold">2,029.9</span>
        </div>
      </div>
      <div className="mt-6 bg-custom-gradient text-[#535E73] text-[12px] font-normal rounded-lg pl-[17px] py-[14px] pr-[69px] leading-tight">
        Earn <span className="text-[#1B46E0] text-sm font-bold">-29,22%</span>{" "}
        profit if underlying APY remains constant at
        <span className="text-[#1B46E0] text-sm font-bold"> 6,427%</span>
      </div>
      <div className="relative flex items-center mt-8">
        <div className="bg-[#535E73] w-full h-1 rounded-full"></div>
        <img
          src="/elephant.gif"
          alt="Elephant"
          width={24}
          height={24}
          className="absolute left-2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 drop-shadow-lg"
        />
      </div>
      <p className="text-[12px] text-[#535E73] mt-4">
        Last updated 21 minutes ago
      </p>
    </div>
  );
}
