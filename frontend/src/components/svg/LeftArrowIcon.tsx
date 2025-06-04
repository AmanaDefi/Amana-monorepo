import React from "react";

interface Props {
  color: string;
  strokeWidth?: number
}
const LeftArrowIcon: React.FC<Props> = ({ color, strokeWidth = 2}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={`${strokeWidth}`}
      stroke={color}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5 8.25 12l7.5-7.5"
      />
    </svg>
  );
};

export default LeftArrowIcon;
