import { ReactNode } from "react";

export const VaultCardInfoBlock = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex w-full rounded-lg justify-center items-center p-4 bg-[#3E73C40D] border border-[#3E3C59]">
      {children}
    </div>
  );
};
