import { ReactNode } from "react";

import Polygon from "@/components/svg/Polygon";
import classNames from "classnames";

export const InfoPopup = ({
  children,
  isRight,
  isMiddle,
}: {
  children: ReactNode;
  isRight?: boolean;
  isMiddle?: boolean;
}) => {
  return (
    <div className="relative w-[330px] rounded-lg px-[19px] py-[14px] z-20 text-white text-sm leading-4 bg-blue-button">
      {children}
      <div
        className={classNames(
          "absolute -bottom-4 left-3",
          { "right-3 !left-auto": isRight },
          { "left-[125px]": isMiddle },
        )}
      >
        <Polygon />
      </div>
    </div>
  );
};
