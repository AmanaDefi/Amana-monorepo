import React from "react";

const BackToVaultsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="7"
    height="12"
    viewBox="0 0 7 12"
    fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    className={className}
  >
    <path
      d="M5.66663 10.167L1.49996 6.00033L5.66663 1.83366"
      stroke="#9A9CB3"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export default BackToVaultsIcon;
