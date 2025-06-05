import { ReactNode } from "react";

import InfoIcon from "@/components/svg/InfoIcon";
import { InfoPopup } from "./InfoPopup";
import classNames from "classnames";

export const InfoBlock = ({
  children,
  isRight,
  isMiddle,
}: {
  children: ReactNode;
  isRight?: boolean;
  isMiddle?: boolean;
}) => {
  return (
    <div className="hover:cursor-pointer relative group">
      <InfoIcon />
      <div
        className={classNames(
          "absolute bottom-10 -left-5 hidden group-hover:block transition-all",
          {"-left-[295px] ": isRight},
          {"-left-[130px] ": isMiddle}
        )}
      >
        <InfoPopup isRight={isRight} isMiddle={isMiddle} >{children}</InfoPopup>
      </div>
    </div>
  );
};
