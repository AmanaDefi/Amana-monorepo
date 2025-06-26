import { motion } from "framer-motion";
import React from "react";

export const BreathingValue = ({
  value,
  className = "",
  isBreathing = false,
}: {
  value: React.ReactNode;
  className?: string;
  isBreathing?: boolean;
}) => {
  if (!isBreathing) {
    return <span className={className}>{value}</span>;
  }

  return (
    <motion.span
      className={className}
      animate={{
        opacity: [0.3, 0.6, 1, 0.6, 0.3],
        scale: [0.98, 1.01, 1.04, 1.01, 0.98],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: [0.25, 0.46, 0.45, 0.94],
        repeatType: "loop",
      }}
    >
      {value}
    </motion.span>
  );
};

export const MiniSpinner = ({
  size = 16,
  className = "",
  color = "#3E73C4",
}: {
  size?: number;
  className?: string;
  color?: string;
}) => {
  return (
    <motion.div
      className={`inline-block border-2 border-gray-600 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: "transparent",
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

export const SpinnerWithText = ({
  text = "Calculating...",
  className = "",
}: {
  text?: string;
  className?: string;
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <MiniSpinner size={14} />
      <span className="text-gray-400 text-sm">{text}</span>
    </div>
  );
};
