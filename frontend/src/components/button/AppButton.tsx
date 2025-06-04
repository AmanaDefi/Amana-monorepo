import classNames from "classnames";
import { MouseEvent, ReactNode } from "react";

export const AppButton = ({
  children,
  onClick,
  isBlue,
}: {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  isBlue?: boolean;
}) => {
  return (
    <button
      className={classNames(
        "flex-1 w-full bg-[#0C1015] border border-[#3E73C4] hover:border-blue-button hover:bg-blue-button text-white py-[10px] px-4 rounded-lg transition-all",
        {
          "bg-blue-button hover:bg-[#0C1015] border border-blue-button hover:border-[#3E73C4]":
            isBlue,
        },
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
