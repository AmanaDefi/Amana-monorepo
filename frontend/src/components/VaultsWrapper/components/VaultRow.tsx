import React, { FC } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { VaultAPY, VaultData, VaultTotalAssets } from "@/types/types";
import { formatTVLInUSD } from "@/utils/utils";
import FlashIcon from "@/components/svg/Flash";
import { AppButton } from "@/components/button/AppButton";
import classNames from "classnames";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useTokenPriceBySymbol } from "@/hooks/hooks";

type Props = {
  vault: VaultData;
  vaultAPYs: VaultAPY[];
  vaultTotalAssets: VaultTotalAssets[];
};

export const VaultRow: FC<Props> = React.memo(
  ({ vault, vaultAPYs, vaultTotalAssets }) => {
    const router = useRouter();
    const { walletAddress } = useMultiChain();
    const tokenPrice = useTokenPriceBySymbol(vault.inputToken.symbol);

    const vaultAPY = vaultAPYs.find((apy) => apy.vaultId === vault.id);
    const totalAssets = vaultTotalAssets.find(
      (asset) => asset.vaultId === vault.id,
    );

    const handleNavigate = (
      e:
        | React.MouseEvent<HTMLButtonElement, MouseEvent>
        | React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
      e.stopPropagation();
      router.push(`/vaults/${vault.id}?tab=withdraw`);
    };

    return (
      <div
        onClick={handleNavigate}
        className="flex flex-row justify-between items-center w-full rounded-lg p-4 bg-[#3E73C40D] border border-[#3E3C59] hover:cursor-pointer hover:border-[#3E73C4]"
      >
        <div className="flex flex-row gap-6 items-center w-[40%] min-w-0">
          <Image
            src={vault.imgURL || ""}
            alt={vault.protocol.network}
            width={24}
            height={24}
            className="rounded-full flex-shrink-0"
            sizes="24px"
          />
          <div className="flex flex-row gap-3 items-center min-w-0 flex-1">
            <Image
              src={vault.inputToken.imgURL}
              alt={vault.inputToken.symbol}
              width={40}
              height={40}
              className="rounded-full flex-shrink-0"
              sizes="36px"
            />
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-white font-bold text-lg leading-5 -tracking-1 truncate">
                {vault.protocol.name} {vault.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex w-[60%] flex-row xl:gap-14 gap-10 items-center justify-end">
          <div className="flex w-[40%] flex-row gap-14 items-center justify-center">
            <p className="text-white font-bold text-lg leading-5 -tracking-1 w-[50%]">
              {totalAssets?.totalAssets
                ? `$${formatTVLInUSD(Number(totalAssets.totalAssets), vault.inputToken.symbol, tokenPrice)}`
                : "$0"}
            </p>
            <div className="w-[50%] flex items-center justify-center">
              <div className="rounded-full bg-green-accent h-6 w-6 flex items-center justify-center">
                <p className="text-white font-bold text-lg leading-5 ">A</p>
              </div>
            </div>
          </div>
          <div className="w-[60%] flex flex-row items-center gap-2 xl:gap-6 justify-end">
            <div className="flex flex-row gap-1 items-center w-[50%] justify-center">
              <p
                className={classNames(
                  "font-bold text-lg leading-5 ",
                  {
                    "text-[#05D47F]": Number(vaultAPY?.APY7d || 0) > 0,
                  },
                  {
                    "text-[#FF1E1E]": Number(vaultAPY?.APY7d || 0) <= 0,
                  },
                )}
              >
                {(Number(vaultAPY?.APY7d || 0) * 100).toFixed(2)}%
              </p>
              <FlashIcon
                color={Number(vaultAPY?.APY7d || 0) > 0 ? "#05D47F" : "#FF1E1E"}
              />
            </div>
            <div className="w-[50%]">
              <AppButton variant="gray" onClick={handleNavigate}>
                {!!walletAddress ? "Details" : "Invest"}
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

VaultRow.displayName = "VaultRow";
