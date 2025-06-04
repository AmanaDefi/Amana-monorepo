"use client";

import React, { forwardRef } from "react";
import cn from "classnames";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "signIn";
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = "signIn", className, disabled, ...rest }, ref) => {
    const getButtonClass = () => {
      if (disabled) {
        switch (variant) {
          case "signIn":
            return "bg-[#0A0A0A] text-[#6B7280] border-[#1F2937] cursor-not-allowed";
        }
      }

      switch (variant) {
        case "signIn":
          return cn(
            "bg-[#0A0A0A] text-white border-[#9CA3AF]",
            "hover:bg-white/10",
            "active:bg-[linear-gradient(139deg,_#14171f_0%,_#1b46e0_100%)]",
          );
        default:
          return "";
      }
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "rounded-lg px-[16px] py-[17px] w-[192px] h-[56px]",
          "text-[18px] font-normal font-sans text-center",
          "flex items-center justify-center select-none transition",
          getButtonClass(),
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
