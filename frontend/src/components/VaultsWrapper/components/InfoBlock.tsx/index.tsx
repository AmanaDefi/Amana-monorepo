import { ReactNode, useState } from "react";

import InfoIcon from "@/components/svg/InfoIcon";
import { InfoPopup } from "./InfoPopup";
import classNames from "classnames";

export const InfoBlock = ({
  children,
  isRight,
  isMiddle,
  customIcon,
  isLeft,
  iconColor = "#1B46E0",
}: {
  children: ReactNode;
  isRight?: boolean;
  isMiddle?: boolean;
  customIcon?: React.ReactNode;
  isLeft?: boolean;
  iconColor?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setIsVisible(false);
    }, 300); // 300ms delay before hiding
    setTimeoutId(id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      className="hover:cursor-pointer relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {customIcon || <InfoIcon color={iconColor} />}
      <div
        className={classNames(
          "absolute bottom-10 -left-5 transition-all z-[9999] pointer-events-auto",
          { "-left-[230px] md:-left-[295px] ": isRight },
          { "-left-[130px] ": isMiddle },
          { "-left-2 ": isLeft },
          isVisible ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <InfoPopup isRight={isRight} isMiddle={isMiddle} isLeft={isLeft}>
          {children}
        </InfoPopup>
      </div>
    </div>
  );
};
