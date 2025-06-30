import Image from "next/image";
import OnboardingIcon from "./svg/OnboardingIcon";
import DoneIcon from "./svg/onboarding/DoneIcon";
import VisaIcon from "./svg/onboarding/VisaIcon";
import MastercardIcon from "./svg/onboarding/MastercardIcon";
import {
  IconTypes,
  getIconImage,
  ListItem,
  SubItem,
} from "@/constants/smartAccountInfo";
import CryptoIcons from "./modal/shared/CryptoIcons";

type SmartAccountCardProps = {
  title: string;
  list: ListItem[];
  img: IconTypes;
  className?: string;
};

const SmartAccountCard = ({
  title,
  list,
  img,
  className = "",
}: SmartAccountCardProps) => {
  const iconImageSrc = getIconImage(img);

  const renderListItem = (item: ListItem, idx: number) => {
    if (typeof item === "string") {
      return (
        <li key={idx} className="text-xs font-normal flex gap-1">
          <OnboardingIcon
            width={12}
            height={8}
            className="mt-[6px] flex-shrink-0"
          />
          <p className="max-w-[227px] leading-tight">{item}</p>
        </li>
      );
    }
    return (
      <li key={idx} className="text-xs font-normal">
        <div className="flex gap-1 mb-3">
          <OnboardingIcon
            width={12}
            height={8}
            className="mt-[6px] flex-shrink-0"
          />
          <p className="max-w-[227px] leading-tight">{item.text}</p>
        </div>
        {item.subItems && (
          <ul className="flex flex-col gap-2">
            {item.subItems.map((subItem: SubItem, subIdx: number) => (
              <li
                key={subIdx}
                className="flex items-center text-[#3E73C4] text-xs"
              >
                <DoneIcon
                  width={12}
                  height={8}
                  className="text-[#3E73C4] flex-shrink-0 mr-1"
                />
                <span className="leading-tight">{subItem.text}</span>

                {img === IconTypes.FUND && subIdx === 0 && (
                  <div>
                    <CryptoIcons />
                  </div>
                )}
                {img === IconTypes.FUND && subIdx === 1 && (
                  <div className="flex gap-1 ml-2">
                    <div className="w-6 h-4 rounded-sm flex items-center ">
                      <VisaIcon width={20} height={12} />
                    </div>
                    <div className="w-6 h-4 rounded-sm flex items-center ">
                      <MastercardIcon width={20} height={12} />
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div
      className={`w-full max-w-[318px] mx-auto min-h-[376px] 
             pl-10 pr-6 py-10 rounded-[16px] shadow-md bg-dark-card 
             transition-all backdrop-blur-[20px] cursor-pointer before-gradient-border font-gotham ${className}`}
    >
      <div className="rounded-lg w-[56px] h-[56px] ">
        <Image
          src={iconImageSrc}
          alt={title}
          width={56}
          height={56}
          className="object-contain flex-shrink-0 relative z-20"
        />
      </div>

      <div className="flex-1 flex flex-col mt-6">
        <h3 className="font-medium text-base mb-3 text-white flex-shrink-0">
          {title}
        </h3>

        <ul className="text-white list-none flex flex-col gap-4 flex-1">
          {list.map((item, idx) => renderListItem(item, idx))}
        </ul>
      </div>
    </div>
  );
};

export default SmartAccountCard;
