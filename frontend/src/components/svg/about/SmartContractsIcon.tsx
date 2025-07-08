import React from "react";

const SmartContractsIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="21"
    height="24"
    viewBox="0 0 21 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M20.5 3.93945L10.5 0.439453L0.5 3.93945V11.9995C0.5 16.1265 3.034 19.0115 5.396 20.8025C6.82208 21.8729 8.38622 22.7458 10.046 23.3975C10.1593 23.4401 10.2733 23.4808 10.388 23.5195L10.5 23.5595L10.614 23.5195C10.8327 23.4435 11.0494 23.3621 11.264 23.2755C12.8097 22.6386 14.2681 21.8076 15.604 20.8025C17.967 19.0115 20.5 16.1265 20.5 11.9995V3.93945ZM9.501 15.4145L5.26 11.1715L6.674 9.75645L9.502 12.5855L15.159 6.92845L16.574 8.34245L9.501 15.4145Z"
      fill="#65F063"
    />
  </svg>
);

export default SmartContractsIcon;
