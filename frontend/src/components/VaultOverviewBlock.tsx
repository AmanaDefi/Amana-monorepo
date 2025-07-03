import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VaultAPY, VaultTotalAssets, VaultData } from "@/types/types";
import { formatTVLInUSD } from "@/utils/utils";
import classNames from "classnames";
import { calculateRiskLevel } from "./VaultsWrapper";
import { InfoBlock } from "./VaultsWrapper/components/InfoBlock.tsx";
import { RISK_LEVELS } from "./VaultsGrid";

import PointsIcon from "./svg/PointsIcon";
import { getPointsInfo } from "@/utils/helpers";

import Image from "next/image";
import { useTokenPriceBySymbol } from "@/hooks/hooks";


type Props = {
  vault: VaultData;
  vaultAPY?: VaultAPY;
  totalAssets?: VaultTotalAssets;
  titleColor?: string;
  isLoading?: boolean;
  isDeposit?: boolean;
  isReward?: boolean;
  
};

const SkeletonBox: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-gray-600/20 animate-pulse rounded ${className}`} />
);

const AnimatedValue: React.FC<{
  value: string | number;
  className?: string;
  isLoading?: boolean;
  skeletonClassName?: string;
}> = ({
  value,
  className = "",
  isLoading = false,
  skeletonClassName = "h-6 w-16",
}) => {
  const valueVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  };

  if (isLoading) {
    return <SkeletonBox className={skeletonClassName} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={value}
        variants={valueVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={className}
      >
        {value}
      </motion.p>
    </AnimatePresence>
  );
};

export const VaultOverviewBlock: React.FC<Props> = ({
  vault,
  vaultAPY,
  totalAssets,
  titleColor = "text-white",
  isLoading = false,
  isDeposit,
  isReward = false,
}) => {
  const apyValue = Number(vaultAPY?.APY7d || 0);
  const riskRating = calculateRiskLevel(vault);
  
  // Get token price for USD conversion
  const tokenPrice = useTokenPriceBySymbol(vault.inputToken.symbol);

  const isHexColor = titleColor.startsWith("#");

  const isAPYLoading = isLoading || vaultAPY === undefined;
  const isTVLLoading = isLoading || totalAssets === undefined;

  return (
    <div className="flex flex-row items-center justify-between w-full">
      {/* TVL Section */}
      <div className="flex flex-row justify-between items-center w-full">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-1 items-center">
            <p
              className={classNames(
                "font-normal text-base leading-4 uppercase",
                { [titleColor]: !isHexColor },
              )}
              style={isHexColor ? { color: titleColor } : undefined}
            >
              TVL
            </p>
            <InfoBlock>
              💡 TVL (Total Value Locked) <br />
              This is the total amount of assets deposited in this vault by all
              users across all chains.
            </InfoBlock>
          </div>
        <AnimatedValue
          value={
            totalAssets?.totalAssets
              ? `$${formatTVLInUSD(Number(totalAssets.totalAssets), vault.inputToken.symbol, tokenPrice)}`
              : "$0"
          }
          className="text-blue-digits font-bold text-xl leading-6"
          isLoading={isTVLLoading}
          skeletonClassName="h-6 w-20"
        />
        </div>

      </div>

      {/* Risk Section */}
      <div className="flex flex-row justify-center items-center w-full">
        <div className="flex flex-col gap-2 items-center">
          <div className="flex flex-row gap-1 items-center">
            <p
              className={classNames("font-normal text-base leading-4", {
                [titleColor]: !isHexColor,
              })}
              style={isHexColor ? { color: titleColor } : undefined}
            >
              Risk
            </p>
            <InfoBlock isMiddle>
              💡 Risk Rating: {riskRating} <br />
              This vault has low protocol and slippage risk. Risk scores are based
              on volatility, smart contract audits, and liquidity depth.
            </InfoBlock>
          </div>
        {isLoading ? (
          <SkeletonBox className="h-6 w-6 rounded-full" />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-full bg-green-accent h-6 w-6 flex items-center justify-center pb-[2px]"
          >
            <p className="text-white font-bold text-lg leading-[18px]">
              {RISK_LEVELS[riskRating]?.level}
            </p>
          </motion.div>
        )}
        </div>

      </div>

      {/* APY Section */}
      <div className="flex flex-row justify-end items-center w-full">
        <div className="flex flex-col gap-2 items-end">
          <div className="flex flex-row gap-1 items-end">
            <p
              className={classNames("font-normal text-base leading-4 uppercase", {
                [titleColor]: !isHexColor,
              })}
              style={isHexColor ? { color: titleColor } : undefined}
            >
              APY (7d)
            </p>
            <InfoBlock isRight>
              💡 APY (Annual Percentage Yield) <br />
              Estimated yearly return with compounding. It may vary based on
              rewards, liquidity, and market changes.
            </InfoBlock>
          </div>
        <div className="flex flex-row items-center gap-1">
          <AnimatedValue
            value={`${(apyValue * 100).toFixed(2)}%`}
            className={classNames("font-bold text-xl leading-6", {
              "text-green-accent": apyValue > 0,
              "text-red-error": apyValue <= 0,
            })}
            isLoading={isAPYLoading}
            skeletonClassName="h-6 w-16"
          />
          {getPointsInfo(vault.protocol.name).displayPoints && (
            <InfoBlock 
              isRight
              customIcon={<PointsIcon className="w-5 h-5" color="#ffffff" />}
            >
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">
                    {getPointsInfo(vault.protocol.name).nativeYield}
                  </span>
                  <span className="text-cyan-400 font-medium text-base">
                    {(apyValue * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-sm">
                    {vault.protocol.name === 'YieldFi' ? '+ YieldCrumbs' : '+ Aegis Points'}
                  </span>
                  <span className="text-white font-medium text-base">
                    {getPointsInfo(vault.protocol.name).points}
                  </span>
                </div>
              </div>
            </InfoBlock>
          )}
        </div>
        </div>

      </div>
    </div>
  );
};
