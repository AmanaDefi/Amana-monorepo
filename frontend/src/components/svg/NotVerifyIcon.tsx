import React from "react";

const NotVerifyIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.1404 3.80676L12.1937 2.86011L8.00035 7.06011L3.80701 2.86011L2.86035 3.80676L7.06035 8.00011L2.86035 12.1935L3.80701 13.1401L8.00035 8.94011L12.1937 13.1401L13.1404 12.1935L8.94035 8.00011L13.1404 3.80676Z"
      fill="#FF1E1E"
    />
  </svg>
);

export default NotVerifyIcon;


