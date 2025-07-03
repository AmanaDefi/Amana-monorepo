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
    <div
      className={classNames(
        "relative rounded-lg px-[19px] py-[14px] z-20 text-white text-sm leading-4 bg-blue-button",
        {
          "w-[330px]": !autoWidth,
          "w-max max-w-sm": autoWidth,
        },
      )}
    >
      {children}
      <div
        className={classNames("absolute -bottom-4", {
          "right-3": isRight,
          "left-3": !isRight && !isMiddle && !isLeft,
          "left-1/2 -translate-x-1/2": isMiddle,
          "left-1": isLeft,
        })}
      >
        <Polygon />
      </div>
    </div>
  );
};
