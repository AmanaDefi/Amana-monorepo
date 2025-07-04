import { ReactNode, useState } from "react";
import InfoIcon from "@/components/svg/InfoIcon";
import classNames from "classnames";
import { InfoPopup } from "@/components/VaultsWrapper/components/InfoBlock.tsx/InfoPopup";

export const MobileInfoBlock = ({
  children,
  isRight,
  isMiddle,
  isLeft,
}: {
  children: ReactNode;
  isRight?: boolean;
  isMiddle?: boolean;
  isLeft?: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleToggle = () => {
    setIsVisible(!isVisible);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div className="cursor-pointer relative" onClick={handleToggle}>
        <InfoIcon />
        {isVisible && (
          <div
            className={classNames(
              "absolute bottom-10 -left-5 z-50 transition-all",
              { "-left-[295px]": isRight },
              { "-left-[130px]": isMiddle },
              { "-left-2": isLeft },
            )}
          >
            <InfoPopup isRight={isRight} isMiddle={isMiddle} isLeft={isLeft}>
              {children}
            </InfoPopup>
          </div>
        )}
          </div>
          
      {isVisible && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={handleClose}
        />
      )}
    </>
  );
};
