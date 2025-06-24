import React from "react";
import { IoCheckmark } from "react-icons/io5";

const FinalConfirmationIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  width = 18,
  height = 18,
  ...props
}) => (
  <div
    className="bg-white rounded flex items-center justify-center"
    style={{ width, height }}
  >
    <IoCheckmark
      className="text-black"
    />
  </div>
);

export default FinalConfirmationIcon;
