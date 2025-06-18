import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  text?: string;
  className?: string;
}

const Loader: React.FC<SpinnerProps> = ({
  size = "lg",
  className = "",
}) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-3 ${className}`}
    >
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-200 border-t-[#1B46E0]`}
        style={{
          borderTopColor: "#1B46E0",
        }}
      />
    </div>
  );
};

export default Loader;
