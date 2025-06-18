import React from "react";
import { VaultAPY, VaultTotalAssets, VaultData } from "@/types/types";
import { formatNumberWithSuffix } from "@/utils/utils";

import classNames from "classnames";
import { calculateRiskLevel } from "./VaultsWrapper";
import { VaultCardInfoBlock } from "./VaultsWrapper/components/VaultCardInfoBlock";
import { InfoBlock } from "./VaultsWrapper/components/InfoBlock.tsx";
import { RISK_LEVELS } from "./VaultsGrid";

type Props = {
  vault: VaultData;
  vaultAPY?: VaultAPY;
  totalAssets?: VaultTotalAssets;
};

export const VaultOverviewBlock: React.FC<Props> = ({
  vault,
  vaultAPY,
  totalAssets,
}) => {
  const apyValue = Number(vaultAPY?.APY7d || 0);
  const riskRating = calculateRiskLevel(vault);


  return (
    <VaultCardInfoBlock>
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-1 items-center">
            <p className="font-normal text-base leading-4 uppercase text-white">
              TVL
            </p>
            <InfoBlock>
              💡 TVL (Total Value Locked) <br />
              This is the total amount of assets deposited in this vault by all
              users across all chains.
            </InfoBlock>
          </div>
          <p className="text-blue-digits font-bold text-xl leading-6">
            ${formatNumberWithSuffix(Number(totalAssets?.totalAssets || 0))}
          </p>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <div className="flex flex-row gap-1 items-center">
            <p className="font-normal text-base leading-4 text-white">Risk</p>
            <InfoBlock isMiddle>
              💡 Risk Rating: {riskRating} <br />
              This vault has low protocol and slippage risk. Risk scores are
              based on volatility, smart contract audits, and liquidity depth.
            </InfoBlock>
          </div>
          <div className="rounded-full bg-green-accent h-6 w-6 flex items-center justify-center pb-[2px]">
            <p className="text-white font-bold text-lg leading-[18px]">
              {RISK_LEVELS[riskRating]?.level}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-1 items-end">
            <p className="font-normal text-base leading-4 uppercase text-white">
              APY (7d)
            </p>
            <InfoBlock isRight>
              💡 APY (Annual Percentage Yield) <br />
              Estimated yearly return with compounding. It may vary based on
              rewards, liquidity, and market changes.
            </InfoBlock>
          </div>
          <p
            className={classNames("font-bold text-xl leading-6", {
              "text-green-accent": apyValue > 0,
              "text-red-error": apyValue <= 0,
            })}
          >
            {(apyValue * 100).toFixed(2)}%
          </p>
        </div>
      </div>
    </VaultCardInfoBlock>
  );
};
