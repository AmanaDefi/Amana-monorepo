import classNames from "classnames";
import { MouseEvent, ReactNode } from "react";

export const AppButton = ({
  children,
  onClick,
  isBlue,
  disabled,
}: {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  isBlue?: boolean;
  disabled?: boolean;
}) => {
  return (
    <button
      disabled={disabled}
      className={classNames(
        "flex-1 w-full bg-[#171D26] border border-[#323234] hover:border-blue-button hover:bg-blue-button text-white py-[10px] px-4 rounded-lg transition-all disabled:bg-[#35383D] disabled:border-[#35383D]",
        {
          "bg-blue-button hover:!bg-[#0C1015] border !border-blue-button hover:!border-[#3E73C4]":
            isBlue,
        },
        {
          "px-2": typeof children === "number",
        },
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
