import { ReactNode } from "react";

import Polygon from "@/components/svg/Polygon";
import classNames from "classnames";

export const InfoPopup = ({
  children,
  isRight,
  isMiddle,
  isLeft,
  autoWidth = false,
}: {
  children: ReactNode;
  isRight?: boolean;
  isMiddle?: boolean;
  isLeft?: boolean;
  autoWidth?: boolean;
}) => {
  return (
    <span
      className={classNames(
        "relative rounded-lg px-3 md:px-[19px] py-3 md:py-[14px] z-20 text-white text-xs md:text-sm leading-4 bg-blue-button inline-block",
        {
          "w-64 md:w-[330px]": !autoWidth,
          "w-max max-w-48 sm:max-w-64 md:max-w-sm": autoWidth,
        },
      )}
    >
      {children}
      <span
        className={classNames("absolute -bottom-4", {
          "right-3": isRight,
          "left-3": !isRight && !isMiddle && !isLeft,
          "left-[125px]": isMiddle, 
          "left-1": isLeft,
        })}
      >
        <Polygon />
      </span>
    </span>
  );
};
