import { ReactNode } from "react";

export const VaultCardInfoBlock = ({
  children,
  titleColor,
  onClick,
}: {
  children: ReactNode;
  titleColor?: string;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onClick?.(e);
  };

  return (
    <div
      className={`flex flex-row w-full rounded-lg justify-between items-center py-2 md:py-4 px-4 before-gradient-border ${titleColor || ""}`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {children}
    </div>
  );
};
