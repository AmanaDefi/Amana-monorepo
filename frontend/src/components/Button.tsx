"use client";
import React, { forwardRef } from "react";
import cn from "classnames";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "signIn" | "primary" | "custom" | "outlined" | "special";
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "signIn", className, disabled, ...rest }, ref) => {
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
        }
      }
      switch (variant) {
        case "signIn":
          return cn(
            "bg-[#0A0A0A] text-white border-[#9CA3AF]",
            "hover:bg-white/10",
            "active:bg-[linear-gradient(139deg,_#14171f_0%,_#1b46e0_100%)]",
          );
        case "primary":
          return cn(
            "bg-[#1B46E0] text-white border border-[#323234]",
            "shadow-[0_4px_4px_0_rgba(0,0,0,0.15),inset_0_2px_4px_0_#5251c5] backdrop-blur-[20px]",
            "hover:backdrop-blur-[20px] hover:shadow-[inset_0_2px_4px_0_#5251c5]",
            "active:bg-[#1B46E0] active:backdrop-blur-[20px] active:shadow-[inset_0_2px_4px_0_#5251c5]",
          );
        case "custom":
          return cn(
            "bg-[#1B46E0] text-white border border-transparent shadow-[0_2px_6px_rgba(0,0,0,0.25)]",
            "hover:bg-transparent hover:border-[#3E73C4] hover:shadow-[0_2px_6px_rgba(0,0,0,0.25)]",
          );
        case "outlined":
          return cn(
            "border border-[#535E73] text-white bg-transparent",
            "hover:border-[#1B46E0]",
          );
        case "special":
          return cn(
            "bg-[#1B46E0] text-white border border-transparent shadow-[0_2px_6px_rgba(0,0,0,0.25)] font-bold text-[16px] rounded-lg px-[39px] py-[14px]",
            "hover:bg-[#0C1015] hover:border hover:border-[#3E73C4]",
          );
        default:
          return "";
      }
    };

    const getButtonStyles = () => {
      if (variant === "special") {
        return "rounded-lg px-[39px] py-[14px] text-[16px] font-bold font-sans text-center flex items-center justify-center select-none transition";
      }
      return "rounded-lg px-[16px] py-[17px] w-[192px] text-[18px] font-normal font-sans text-center flex items-center justify-center select-none transition";
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
