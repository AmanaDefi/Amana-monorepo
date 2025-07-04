import React from "react";

const ProfileCircle: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="100"
    height="100"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <circle cx="50" cy="50" r="50" fill="url(#paint0_linear_837_21064)" />
    <defs>
      <linearGradient
        id="paint0_linear_837_21064"
        x1="43.0941"
        y1="-166.146"
        x2="161.18"
        y2="103.267"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0.309977" stop-color="#101219" />
        <stop offset="1" stop-color="#1B46E0" />
      </linearGradient>
    </defs>
  </svg>
);

export default ProfileCircle;
