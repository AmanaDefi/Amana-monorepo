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
      className={`w-full max-w-[480px] mx-auto min-h-[408px] sm:min-h-[520px] md:min-h-[598px] 
             px-4 py-10 sm:px-[38px] sm:pt-8 rounded-[16px] shadow-md bg-dark-card 
             transition-all backdrop-blur-[20px] cursor-pointer before-gradient-border font-gotham ${className}`}
    >
      <div className="flex items-center justify-center mb-6 flex-shrink-0">
        <Image
          src={img}
          alt={`${title} icon`}
          width={120}
          height={120}
          className="object-contain sm:w-[206px] sm:h-[206px]"
          priority={img === IconPaths.PASSKEY}
        />
      </div>
      <div className="flex-1 flex flex-col">
        <h3 className="font-medium text-[20px] mb-4 text-white flex-shrink-0">
          {title}
        </h3>
        <ul className="text-white list-none flex flex-col gap-4 sm:gap-6 flex-1">
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
    </div>
  );
};

export default SmartAccountCard;
