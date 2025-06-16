import React from "react";

interface Props {
  color?: string;
}
const CardIcon:  React.FC<React.SVGProps<SVGSVGElement> & Props>  = ({ color = "white", ...props }) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M25.5 6H6.5C4.567 6 3 7.567 3 9.5V22.5C3 24.433 4.567 26 6.5 26H25.5C27.433 26 29 24.433 29 22.5V9.5C29 7.567 27.433 6 25.5 6Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12H29M8 18.75H11V20H8V18.75Z"
        stroke={color}
        strokeWidth="2.8125"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CardIcon;
