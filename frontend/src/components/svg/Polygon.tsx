import React from "react";

interface Props {
  color?: string;
}
const Polygon: React.FC<Props> = ({ color = "#1B46E0" }) => {
  return (
    <svg
      width="31"
      height="26"
      viewBox="0 0 31 26"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.768 25C14.5378 26.3333 16.4622 26.3333 17.232 25L29.7894 3.25C30.5592 1.91666 29.597 0.25 28.0574 0.25H2.94263C1.40303 0.25 0.440781 1.91667 1.21058 3.25L13.768 25Z"
        fill={color}
      />
    </svg>
  );
};

export default Polygon;
