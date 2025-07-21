import { ReactNode } from "react";

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
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div
      className="hover:cursor-pointer relative group"
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {customIcon || <InfoIcon color={iconColor} />}
      <div
        className={classNames(
          "absolute bottom-10 -left-5 hidden group-hover:block transition-all z-[9999]",
          { "-left-[230px] md:-left-[295px] ": isRight },
          { "-left-[130px] ": isMiddle },
          { "-left-2 ": isLeft },
        )}
      >
        <InfoPopup isRight={isRight} isMiddle={isMiddle} isLeft={isLeft}>
          {children}
        </InfoPopup>
      </div>
    </div>
  );
};
