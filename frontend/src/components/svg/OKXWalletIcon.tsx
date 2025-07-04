import React from "react";

const OKXWalletIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M0 0H8V8H0V0ZM16 8H8V16H0V24H8V16H16V24H24V16H16V8ZM16 8V0H24V8H16Z"
      fill="white"
    />
  </svg>
);

export default OKXWalletIcon;
