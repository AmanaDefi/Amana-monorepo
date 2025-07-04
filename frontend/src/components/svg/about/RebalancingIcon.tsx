import React from "react";

const RebalancingIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="19"
    height="18"
    viewBox="0 0 19 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M6.5 14H4.5V7H6.5V14ZM10.5 14H8.5V4H10.5V14ZM14.5 14H12.5V10H14.5V14ZM16.5 16H2.5V2H16.5V16.1M16.5 0H2.5C1.4 0 0.5 0.9 0.5 2V16C0.5 17.1 1.4 18 2.5 18H16.5C17.6 18 18.5 17.1 18.5 16V2C18.5 0.9 17.6 0 16.5 0Z"
      fill="#5DCDC9"
    />
  </svg>
);

export default RebalancingIcon;
