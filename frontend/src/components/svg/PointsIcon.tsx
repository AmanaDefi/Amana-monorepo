import React from "react";

interface Props {
  className?: string;
  color?: string;
}

const PointsIcon: React.FC<Props> = ({ className = "w-4 h-4", color = "#06afbc" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={color}
      viewBox="0 0 24 24"
      className={className}
    >
      {/* Three stars positioned like Morpho's icon */}
      <path
        d="M12 2l1.5 4.5L18 6l-3.5 2.5L15 13l-3-2-3 2 .5-4.5L6 6l4.5.5z"
        fill={color}
      />
      <path
        d="M6 14l1 3 3-.5-2.5 1.5L8 21l-2-1.5-2 1.5.5-3.5L2 16l3 .5z"
        fill={color}
        opacity={0.8}
      />
      <path
        d="M18 14l1 3 3-.5-2.5 1.5L20 21l-2-1.5-2 1.5.5-3.5L14 16l3 .5z"
        fill={color}
        opacity={0.8}
      />
    </svg>
  );
};

export default PointsIcon; 