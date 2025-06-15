import React from "react";

const FinalConfirmationIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <mask
      id="mask0_2001_763"
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="18"
      height="18"
    >
      <path
        d="M1 9V2C1 1.45 1.45 1 2 1H16C16.55 1 17 1.45 17 2V16C17 16.55 16.55 17 16 17H2C1.45 17 1 16.55 1 16V9Z"
        fill="white"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 9L8 12L13 7"
        stroke="black"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </mask>
    <g mask="url(#mask0_2001_763)">
      <path d="M21 -3H-3V21H21V-3Z" fill="white" />
    </g>
  </svg>
);

export default FinalConfirmationIcon;
