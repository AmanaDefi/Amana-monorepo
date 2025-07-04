import { useMyVaults } from "@/hooks/useMyVaults";
import { UserVaultBalance, VaultData } from "@/types/types";
import Image from "next/image";
import { useState, useEffect } from "react";

const TopTokens = ({
  vaults,
  userVaultBalances,
}: {
  vaults: VaultData[];
  userVaultBalances: UserVaultBalance[];
}) => {
  const [showAll, setShowAll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const balanceMap = new Map(
    userVaultBalances.map((balance) => [balance.vaultId, balance.balance]),
  );

  const myVaults = useMyVaults({ vaults, userVaultBalances });

  const vaultsData = [...myVaults].sort((vaultA, vaultB) => {
    const balanceA = Number(balanceMap.get(vaultA.id) ?? 0);
  
    const balanceB = Number(balanceMap.get(vaultB.id) ?? 0);
    return balanceB - balanceA;
  }).slice(0,3).map(vault => {
    const userBalance = userVaultBalances.find(
      (balance) => balance.vaultId === vault.id,
    );
    return {
      name: vault.name,
      symbol: vault.symbol,
      price: Number(Number(userBalance?.balance ?? 0)?.toFixed(4)),
      icon: vault.imgURL ?? vault.protocol.imgURL,
    }
  })

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window?.innerWidth < 597);
    };

    checkIsMobile();
    window?.addEventListener("resize", checkIsMobile);

    return () => window?.removeEventListener("resize", checkIsMobile);
  }, []);

  const itemsToShow =
    isMobile && !showAll ? vaultsData.slice(0, 2) : vaultsData;

  return (
    <div className="relative">
      {isMobile && vaultsData.length > 2 && (
        <div className="flex justify-end mb-1 ">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[#3E73C4] text-[16px] font-normal underline"
          >
            {showAll ? "Show less" : "See all"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 md:gap-8">
        {itemsToShow.map((crypto, index) => (
          <div key={index} className="flex items-center gap-2 md:gap-3">
            <div className="md:w-10 md:h-10 overflow-hidden rounded-full flex items-center justify-center text-xl">
              <Image
                src={crypto.icon}
                alt={crypto.symbol}
                width={40}
                height={40}
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-[2px]">
                <span className="text-[16px] font-normal">{crypto.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[16px] md:text-[18px] font-bold">
                  ${crypto.price}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopTokens;
