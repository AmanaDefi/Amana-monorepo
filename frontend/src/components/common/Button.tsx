"use client";
import React, { forwardRef } from "react";
import cn from "classnames";
import { ShimmerAnimation } from "../button/ShimmerAnimation";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "signIn"
    | "primary"
    | "custom"
    | "outlined"
    | "special"
    | "secondary"
    | "wallet";
  className?: string;
  isMobile?: boolean;
  enableAnimations?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "signIn",
      className,
      disabled,
      isMobile,
      enableAnimations = false,
      ...rest
    },
    ref,
  ) => {
    const getButtonClass = () => {
      if (disabled) {
        switch (variant) {
          case "signIn":
            return "bg-[#0A0A0A] text-[#6B7280] border-[#1F2937] cursor-not-allowed";
          case "primary":
            return "bg-gray-800 text-[#9CA3AF] border border-[#323234] shadow-[0_4px_4px_0_rgba(0,0,0,0.15)] cursor-not-allowed";
          case "custom":
            return "border border-[#35383D] text-[#35383D] bg-transparent shadow-[0_2px_6px_rgba(0,0,0,0.25)] cursor-not-allowed";
          case "outlined":
            return "border border-[#35383D] text-[#35383D] bg-transparent cursor-not-allowed";
          case "special":
            return "border border-[#35383D] text-[#35383D] bg-transparent cursor-not-allowed font-bold text-[16px]";
          case "secondary":
            return "bg-[#35383D] text-[#6B7280] border-none shadow-[0_4px_4px_0_rgba(0,0,0,0.15)] cursor-not-allowed";
          case "wallet":
            return "border border-[#2A2F3A] text-[#6B7280] bg-[#1A1D23] cursor-not-allowed opacity-50";
        }
      }

      switch (variant) {
        case "signIn":
          return cn(
            "bg-[#0A0A0A] text-white border border-[#535E73]",
            "h-[56px] w-[192px] px-[16px] py-[17px] text-[18px]",
            "lg:h-[56px] lg:w-[192px] lg:px-[16px] lg:py-[17px] lg:text-[18px]",
            "max-lg:h-[40px] max-lg:w-[96px] max-lg:px-[12px] max-lg:py-[10px] max-lg:text-[14px]",
            "transition-all duration-300 ease-in-out",
            "hover:[background:linear-gradient(139deg,#14171f_0%,#14171f_55%,rgba(27,70,224,0.25)_70%,rgba(27,70,224,0.5)_90%,#1b46e0_120%)!important]",
            "hover:transform ",
            "active:[background:linear-gradient(139deg,#14171f_0%,#14171f_55%,rgba(27,70,224,0.25)_70%,rgba(27,70,224,0.5)_90%,#1b46e0_120%)!important]",
            "active:transform ",
          );
        case "primary":
          return cn(
            "bg-[#1B46E0] text-white border border-[#323234]",
            "shadow-[0_4px_4px_0_rgba(0,0,0,0.15),inset_0_2px_4px_0_#5251c5] backdrop-blur-[20px]",
            "transition-all duration-300 ease-in-out",
            "hover:backdrop-blur-[20px] hover:shadow-[inset_0_2px_4px_0_#5251c5] hover:transform ",
            "active:bg-[#1B46E0] active:backdrop-blur-[20px] active:shadow-[inset_0_2px_4px_0_#5251c5] active:transform",
          );
        case "custom":
          return cn(
            "bg-[#1B46E0] text-white border border-transparent shadow-[0_2px_6px_rgba(0,0,0,0.25)]",
            "transition-all duration-300 ease-in-out",
            "hover:bg-transparent hover:border-[#3E73C4] hover:shadow-[0_2px_6px_rgba(0,0,0,0.25)] hover:transform",
            "active:transform",
          );
        case "outlined":
          return cn(
            "border border-[#535E73] text-white bg-transparent",
            "transition-all duration-300 ease-in-out",
            "hover:border-[#1B46E0] hover:transform ",
            "active:transform ",
          );
        case "special":
          return cn(
            "bg-[#1B46E0] text-white border border-transparent shadow-[0_2px_6px_rgba(0,0,0,0.25)] font-bold text-[16px] rounded-lg px-[39px] py-[14px]",
            "transition-all duration-300 ease-in-out",
            "hover:bg-[#0C1015] hover:border hover:border-[#3E73C4] hover:transform ",
            "active:transform",
          );
        case "secondary":
          return cn(
            "bg-[var(--second-60)] text-white border border-[#323234] rounded-lg",
            "shadow-[0_4px_4px_0_rgba(0,0,0,0.15)]",
            "transition-all duration-300 ease-in-out",
            "hover:border-[#1B46E0] hover:transform  hover:shadow-[0_6px_6px_0_rgba(0,0,0,0.2)]",
            "active:transform",
          );
        case "wallet":
          return cn(
            "border border-[#535E73] text-white bg-transparent",
            "hover:border-[#1B46E0] hover:bg-[rgba(27,70,224,0.05)]",
            "active:transform active:translate-y-[1px] active:bg-[rgba(27,70,224,0.1)]",
            "transition-all duration-200 ease-in-out",
          );
        default:
          return "";
      }
    };

    const getButtonStyles = () => {
      if (variant === "signIn") {
        return "rounded-lg font-normal font-sans text-center flex items-center justify-center select-none transform";
      }
      if (variant === "special") {
        return "rounded-lg px-[39px] py-[14px] text-[16px] font-bold font-sans text-center flex items-center justify-center select-none transform";
      }
      if (variant === "wallet") {
        return "max-h-[40px] rounded p-[10px] text-[16px] font-medium font-sans text-center flex items-center justify-center gap-1 select-none transform";
      }
      return "rounded-lg px-[16px] py-[17px] w-[192px] text-[18px] font-normal font-sans text-center flex items-center justify-center select-none transform";
    };

    return (
        <button
          ref={ref}
          disabled={disabled}
          className={cn(getButtonStyles(), getButtonClass(), className)}
          {...rest}
        >
          {children}
        </button>
    );
  },
);

Button.displayName = "Button";
export default Button;
