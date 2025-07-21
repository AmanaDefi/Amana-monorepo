"use client";

import React from "react";

interface ButtonSkeletonProps {
  variant?: "desktop" | "mobile" | "responsive";
  width?: string;
  height?: string;
  className?: string;
}

const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({
  variant = "responsive",
  width,
  height,
  className = "",
}) => {
  const getSkeletonClasses = () => {
    switch (variant) {
      case "desktop":
        return `w-[192px] h-[56px] ${width || ""} ${height || ""}`;
      case "mobile":
        return `w-[96px] h-[40px] ${width || ""} ${height || ""}`;
      case "responsive":
      default:
        return `lg:w-[192px] lg:h-[56px] w-[96px] h-[40px] ${width || ""} ${height || ""}`;
    }
  };

  const skeletonContent = (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-gradient-to-r from-[#1B46E0]/5 via-[#1B46E0]/12 to-[#1B46E0]/5"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#1B46E0]/20 to-transparent animate-pulse"></div>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(27,70,224,0.15)_20%,rgba(27,70,224,0.25)_50%,rgba(27,70,224,0.15)_80%,transparent_100%)] animate-[shimmer_2s_ease-in-out_infinite]"></div>
    </>
  );

  if (variant === "responsive") {
    return (
      <div className="flex-shrink-0">
        <div
          className={`hidden lg:block rounded-lg relative overflow-hidden border border-[#535E73]/30 ${getSkeletonClasses()} ${className}`}
        >
          {skeletonContent}
        </div>
        <div
          className={`lg:hidden rounded-lg relative overflow-hidden border border-[#535E73]/30 w-[96px] h-[40px] ${className}`}
        >
          {skeletonContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0">
      <div
        className={`rounded-lg relative overflow-hidden border border-[#535E73]/30 ${getSkeletonClasses()} ${className}`}
      >
        {skeletonContent}
      </div>
    </div>
  );
};

export default ButtonSkeleton;
