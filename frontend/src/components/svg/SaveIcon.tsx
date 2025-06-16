import React from "react";

const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="12"
    height="10"
    viewBox="0 0 12 10"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M0.933333 9.94993C0.711111 10.0388 0.5 10.0193 0.3 9.89126C0.1 9.76326 0 9.57726 0 9.33326V6.33326L5.33333 4.99993L0 3.66659V0.666595C0 0.42215 0.1 0.23615 0.3 0.108595C0.5 -0.0189609 0.711111 -0.0385167 0.933333 0.0499278L11.2 4.38326C11.4778 4.50548 11.6167 4.71104 11.6167 4.99993C11.6167 5.28882 11.4778 5.49437 11.2 5.61659L0.933333 9.94993Z"
      fill="white"
    />
  </svg>
);

export default SaveIcon;


