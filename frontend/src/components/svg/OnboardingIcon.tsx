import React from "react";

const OnboardingIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="16"
    height="12"
    viewBox="0 0 16 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M5.55 9.15L14.025 0.675C14.225 0.475 14.4583 0.375 14.725 0.375C14.9917 0.375 15.225 0.475 15.425 0.675C15.625 0.875 15.725 1.11267 15.725 1.388C15.725 1.66333 15.625 1.90067 15.425 2.1L6.25 11.3C6.05 11.5 5.81666 11.6 5.55 11.6C5.28333 11.6 5.05 11.5 4.85 11.3L0.549997 7C0.349997 6.8 0.253997 6.56267 0.261997 6.288C0.269997 6.01333 0.37433 5.77567 0.574997 5.575C0.775664 5.37433 1.01333 5.27433 1.288 5.275C1.56266 5.27567 1.8 5.37567 2 5.575L5.55 9.15Z"
      fill="#1B46E0"
    />
  </svg>
);

export default OnboardingIcon;
