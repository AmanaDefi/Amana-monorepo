import React from "react";

const BackedByIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="213"
    height="10"
    viewBox="0 0 213 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="108" cy="5" r="5" fill="#535E73" />
    <circle cx="5" cy="5" r="5" fill="#535E73" />
    <circle cx="208" cy="5" r="5" fill="#535E73" />
    <rect x="8" y="4" width="100" height="2" fill="#535E73" />
    <rect x="112" y="4" width="100" height="2" fill="#535E73" />
    <circle cx="5" cy="5" r="4" fill="#1B46E0" />
  </svg>
);

export default BackedByIcon;
