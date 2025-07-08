import { ReactNode } from "react";

export const VaultCardInfoBlock = ({
  children,
  titleColor,
}: {
  children: ReactNode;
  titleColor?: string;
}) => {
  return (
    <div
      className={`flex flex-row w-full rounded-lg justify-between items-center py-4 px-4 before-gradient-border ${titleColor}`}
    >
      {children}
    </div>
  );
};
