import OnboardingIcon from "./svg/OnboardingIcon";
import DoneIcon from "./svg/onboarding/DoneIcon";
import {
  IconTypes,
  getIconComponent,
  ListItem,
  SubItem,
} from "@/constants/smartAccountInfo";

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
  const IconComponent = getIconComponent(img);

  const renderListItem = (item: ListItem, idx: number) => {
    if (typeof item === "string") {
      return (
        <li key={idx} className="text-xs font-normal flex gap-1">
          <OnboardingIcon
            width={12}
            height={8}
            className="mt-[6px] flex-shrink-0"
          />
          <p className="max-w-[227px]">{item}</p>
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
          <p className="max-w-[227px]">{item.text}</p>
        </div>
        {item.subItems && (
          <ul className="flex flex-col gap-2">
            {item.subItems.map((subItem: SubItem, subIdx: number) => (
              <li
                key={subIdx}
                className="flex items-center gap-1 text-[#3E73C4] text-xs"
              >
                <DoneIcon
                  width={12}
                  height={8}
                  className="text-[#3E73C4] flex-shrink-0"
                />
                <span>{subItem.text}</span>
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
      <div className="flex items-center justify-center rounded-lg w-[56px] h-[56px] bg-gradient-to-r from-[#4a4a4a] to-[#2a2a2a] relative shadow-[inset_1px_0_0_0_rgba(255,255,255,0.15),1px_0_3px_rgba(0,0,0,0.3)]">
        <IconComponent
          width={28}
          height={28}
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
