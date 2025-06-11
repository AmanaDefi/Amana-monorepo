import React from "react";

const CloseSidebarIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="24"
    height="25"
    viewBox="0 0 24 25"
    fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...props}
  >
    <path
      d="M19 3.64575H5C3.89543 3.64575 3 4.54118 3 5.64575V19.6458C3 20.7503 3.89543 21.6458 5 21.6458H19C20.1046 21.6458 21 20.7503 21 19.6458V5.64575C21 4.54118 20.1046 3.64575 19 3.64575Z"
      stroke="#64748B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 3.64575V21.6458M16 15.6458L13 12.6458L16 9.64575"
      stroke="#64748B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default CloseSidebarIcon;
