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
    <div className="min-h-[598px] pl-[47px] pr-[38px] pt-8 rounded-[16px] shadow-md bg-dark-card transition-all backdrop-blur-[20px] cursor-pointer before-gradient-border font-gotham">
      <div className="flex items-center justify-center">
        <Image
          src={img}
          alt={`${title} icon`}
          width={206}
          height={206}
          className="object-contain"
          priority={img === IconPaths.PASSKEY}
        />
      </div>

      <h3 className="font-medium text-[24px] mb-6 text-white">{title}</h3>
      {list && (
        <ul className="text-white list-none flex flex-col gap-6">
          {list.map((item, idx) => (
            <li
              key={idx}
              className="text-[16px] font-normal flex flex-row items-center gap-2"
            >
              <OnboardingIcon width={16} height={12} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SmartAccountCard;
