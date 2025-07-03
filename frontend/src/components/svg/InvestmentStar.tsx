import React from "react";
import { motion } from "framer-motion";

interface StarIconProps
  extends Omit<
    React.SVGProps<SVGSVGElement>,
    "onAnimationStart" | "onAnimationEnd"
  > {
  className?: string;
  width?: number;
  height?: number;
}

const InvestmentStarIcon: React.FC<StarIconProps> = ({
  className,
  width = 31,
  height = 31,
  ...props
}) => {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 31 31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <motion.linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          animate={{
            x1: ["12.8532", "20", "5", "12.8532"],
            y1: ["-39.2958", "-20", "-50", "-39.2958"],
            x2: ["55.8967", "40", "70", "55.8967"],
            y2: ["-4.75027", "10", "-15", "-4.75027"],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.stop
            offset="0"
            animate={{
              stopColor: ["#F6FAFF", "#E0F2FE", "#BAE6FD", "#F6FAFF"],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.stop
            offset="0.309977"
            animate={{
              stopColor: ["#F6FAFF", "#DBEAFE", "#93C5FD", "#F6FAFF"],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
          <motion.stop
            offset="0.6"
            animate={{
              stopColor: ["#60A5FA", "#3B82F6", "#2563EB", "#60A5FA"],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
          <motion.stop
            offset="0.841346"
            animate={{
              stopColor: ["#1B46E0", "#1D4ED8", "#1E40AF", "#1B46E0"],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />
          <motion.stop
            offset="1"
            animate={{
              stopColor: ["#1B46E0", "#1E40AF", "#1E3A8A", "#1B46E0"],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
        </motion.linearGradient>

        <radialGradient id={`${gradientId}-shimmer`} cx="50%" cy="50%" r="70%">
          <motion.stop
            offset="0%"
            animate={{
              stopColor: [
                "rgba(246,250,255,0.9)",
                "rgba(219,234,254,0.8)",
                "rgba(59,130,246,0.6)",
                "rgba(27,70,224,0.7)",
                "rgba(246,250,255,0.9)",
              ],
              stopOpacity: [0.3, 0.7, 0.5, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      <path
        d="M15.5 0L16.3781 5.33114C17.1635 10.0993 20.9007 13.8365 25.6689 14.6219L31 15.5L25.6689 16.3781C20.9007 17.1635 17.1635 20.9007 16.3781 25.6689L15.5 31L14.6219 25.6689C13.8365 20.9007 10.0993 17.1635 5.33114 16.3781L0 15.5L5.33114 14.6219C10.0993 13.8365 13.8365 10.0993 14.6219 5.33114L15.5 0Z"
        fill={`url(#${gradientId})`}
      />

      <motion.path
        d="M15.5 0L16.3781 5.33114C17.1635 10.0993 20.9007 13.8365 25.6689 14.6219L31 15.5L25.6689 16.3781C20.9007 17.1635 17.1635 20.9007 16.3781 25.6689L15.5 31L14.6219 25.6689C13.8365 20.9007 10.0993 17.1635 5.33114 16.3781L0 15.5L5.33114 14.6219C10.0993 13.8365 13.8365 10.0993 14.6219 5.33114L15.5 0Z"
        fill={`url(#${gradientId}-shimmer)`}
        animate={{
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
};

export default InvestmentStarIcon;
