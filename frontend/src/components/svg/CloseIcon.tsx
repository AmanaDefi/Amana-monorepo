import React from "react";

interface Props {
  color?: string;
}
const CloseIcon: React.FC<Props> = ({ color = 'white' }) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.14 3.80676L12.1933 2.86011L7.99999 7.06011L3.80664 2.86011L2.85999 3.80676L7.05999 8.00011L2.85999 12.1935L3.80664 13.1401L7.99999 8.94011L12.1933 13.1401L13.14 12.1935L8.93999 8.00011L13.14 3.80676Z"
        fill={color}
      />
    </svg>
  );
};

export default CloseIcon;
