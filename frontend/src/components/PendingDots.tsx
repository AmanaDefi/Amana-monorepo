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
    <span
      className={`${className} breathing-animation`}
      style={{
        animation: "breathing 2s ease-in-out infinite",
      }}
    >
      {value}
      <style jsx>{`
        @keyframes breathing {
          0%,
          100% {
            opacity: 0.1;
            transform: scale(0.95);
          }
          25% {
            opacity: 0.4;
            transform: scale(1.01);
          }
          50% {
            opacity: 1;
            transform: scale(1.06);
          }
          75% {
            opacity: 0.4;
            transform: scale(1.01);
          }
        }
      `}</style>
    </span>
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
    <div
      className={`inline-block border-2 border-gray-600 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: "transparent",
        animation: "spin 1s linear infinite",
      }}
    >
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};
