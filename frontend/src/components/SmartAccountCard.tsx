import Image from "next/image";
import OnboardingIcon from "./svg/OnboardingIcon";
import { IconPaths } from "@/constants/smartAccountInfo";

type SmartAccountCardProps = {
  title: string;
  list: string[];
  img: IconPaths;
  className?: string;
};

const SmartAccountCard = ({
  title,
  list,
  img,
  className = "",
}: SmartAccountCardProps) => {
  return (
    <div
      className="w-full max-w-[480px] mx-auto min-h-[460px] sm:min-h-[520px] md:min-h-[598px] 
             px-6 py-6 sm:px-[38px] sm:pt-8 rounded-[16px] shadow-md bg-dark-card 
             transition-all backdrop-blur-[20px] cursor-pointer before-gradient-border font-gotham"
    >
      <div className="flex items-center justify-center mb-6">
        <Image
          src={img}
          alt={`${title} icon`}
          width={140}
          height={140}
          className="object-contain sm:w-[206px] sm:h-[206px]"
          priority={img === IconPaths.PASSKEY}
        />
      </div>
      <h3 className="font-medium text-[20px] sm:text-[24px] mb-4 text-white">
        {title}
      </h3>
      <ul className="text-white list-none flex flex-col gap-4 sm:gap-6">
        {list.map((item, idx) => (
          <li
            key={idx}
            className="text-[14px] sm:text-[16px] font-normal flex items-center gap-2"
          >
            <OnboardingIcon width={16} height={12} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SmartAccountCard;
