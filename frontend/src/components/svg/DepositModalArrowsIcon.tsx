import React from "react";

const DepositModalArrowsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
  width="26"
  height="24"
  viewBox="0 0 26 24"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
    d="M1.33337 0.933256L10.9384 10.5383C11.2081 10.8109 11.5291 11.0273 11.883 11.175C12.2369 11.3227 12.6166 11.3988 13 11.3988C13.3835 11.3988 13.7632 11.3227 14.1171 11.175C14.4709 11.0273 14.792 10.8109 15.0617 10.5383L24.6667 0.933256M1.33337 12.5999L10.9384 22.2049C11.2081 22.4775 11.5291 22.694 11.883 22.8417C12.2369 22.9894 12.6166 23.0654 13 23.0654C13.3835 23.0654 13.7632 22.9894 14.1171 22.8417C14.4709 22.694 14.792 22.4775 15.0617 22.2049L24.6667 12.5999"
    stroke="#1B46E0"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
  </svg>
);

export default DepositModalArrowsIcon;
