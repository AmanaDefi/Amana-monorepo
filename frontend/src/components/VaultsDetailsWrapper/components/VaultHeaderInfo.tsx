import React from "react";
import Image from "next/image";
import { VaultData } from "@/types/types";

interface VaultHeaderInfoProps {
  vaultData: VaultData;
}

export default function VaultHeaderInfo({
  vaultData,
}: VaultHeaderInfoProps): JSX.Element {
  return (
    <div className="hidden md:flex w-full flex-row items-center mt-8">
      <div className="flex items-center gap-4 max-w-full flex-wrap md:flex-nowrap flex-1">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Image
              src={vaultData.imgURL ?? ""}
              alt={vaultData.protocol.network}
              width={1200}
              height={800}
              className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
              sizes="(max-width: 768px) 24px, 40px"
            />
          </div>
          <h2 className="font-bold text-white">{vaultData.protocol.network}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Image
              src={vaultData.protocol.imgURL}
              alt={vaultData.protocol.name}
              width={1200}
              height={800}
              className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
              sizes="(max-width: 768px) 24px, 40px"
            />
          </div>
          <h2 className="font-bold text-white">{vaultData.protocol.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Image
              src={vaultData.inputToken.imgURL}
              alt={vaultData.name}
              width={1200}
              height={800}
              className={`w-6 md:w-10 h-6 md:h-10 mr-2 rounded-full`}
              sizes="(max-width: 768px) 24px, 40px"
            />
          </div>
          <h2 className="font-bold text-white">{vaultData.name}</h2>
        </div>
      </div>
    </div>
  );
}
