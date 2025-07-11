import classNames from "classnames";
import { MouseEvent, ReactNode } from "react";

export const AppButton = ({
  children,
  onClick,
  disabled,
  isIconOnly,
  variant,
  link,
}: {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  isIconOnly?: boolean;
  variant: "blue" | "reverse" | "gray";
  link?: string;
}) => {
  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className={classNames(
          "flex flex-1 w-full justify-center items-center text-center bg-[#171D26] border border-[#323234] hover:border-blue-button hover:bg-blue-button text-white py-[10px] px-4 rounded-lg transition-all disabled:bg-[#35383D] disabled:border-[#35383D]",
          {
            "bg-blue-button hover:!bg-[#0C1015] border !border-blue-button hover:!border-[#3E73C4]":
              variant === "blue",
          },
          { "bg-[#0C1015] border !border-[#3E73C4]": variant === "reverse" },
        )}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      disabled={disabled}
      className={classNames(
        "flex-1 w-full bg-[#171D26] border border-[#323234] hover:border-blue-button hover:bg-blue-button text-white py-2 md:py-[10px] px-4 rounded-lg transition-all disabled:bg-[#35383D] disabled:border-[#35383D]",
        {
          "bg-blue-button hover:!bg-[#0C1015] border !border-blue-button hover:!border-[#3E73C4]":
            variant === "blue",
        },
        {
          "px-2": typeof children === "number",
        },
        {
          "!p-0 !w-[56px] !h-[56px] flex items-center justify-center":
            isIconOnly,
        },
        { "bg-[#0C1015] border !border-[#3E73C4]": variant === "reverse" },
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
