import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VaultAPY, VaultTotalAssets, VaultData } from "@/types/types";
import { ExponentialRiskRating } from "@/types/exponentialTypes";
import { formatNumberWithSuffix } from "@/utils/utils";
import classNames from "classnames";
import { InfoBlock } from "./VaultsWrapper/components/InfoBlock.tsx";

import PointsIcon from "./svg/PointsIcon";
import { useTokenPriceBySymbol } from "@/hooks/hooks";

type Props = {
  vault: VaultData;
  vaultAPY?: VaultAPY;
  totalAssets?: VaultTotalAssets;
  titleColor?: string;
  isLoading?: boolean;
  isDeposit?: boolean;
  isReward?: boolean;
  riskRating?: ExponentialRiskRating | null;
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
  riskRating,
}) => {
  const apyValue = Number(vaultAPY?.APY7d || 0);

  // Get token price for USD conversion
  const tokenPrice = useTokenPriceBySymbol(vault.inputToken.symbol);

  const isHexColor = titleColor.startsWith("#");

  const isAPYLoading = isLoading || vaultAPY === undefined;
  const isTVLLoading = isLoading || totalAssets === undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* TVL Section */}
      <div className="flex items-center w-full " onClick={handleClick}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-1 items-center">
            <p
              className={classNames(
                "font-normal text-sm md:text-base leading-4 uppercase",
                { [titleColor]: !isHexColor },
              )}
              style={isHexColor ? { color: titleColor } : undefined}
            >
              TVL
            </p>
            <InfoBlock>
              <div>
                💡 TVL (Total Value Locked) <br />
                This is the total amount of assets deposited in this vault by all
                users across all chains.
              </div>
            </InfoBlock>
          </div>
          <AnimatedValue
            value={
              totalAssets?.totalAssets
                ? `$${formatNumberWithSuffix(Number(totalAssets.totalAssets))}`
                : "$0"
            }
            className="text-blue-digits font-bold text-base md:text-xl leading-6"
            isLoading={isTVLLoading}
            skeletonClassName="h-6 w-20"
          />
        </div>
      </div>

      {/* Risk Section */}
      <div className="flex flex-row justify-center items-center w-full">
        <div className="flex flex-col gap-2 items-center justify-center">
          <div className="flex flex-row gap-1 items-center">
            <p
              className={classNames(
                "font-normal text-sm md:text-base leading-4",
                {
                  [titleColor]: !isHexColor,
                },
              )}
              style={isHexColor ? { color: titleColor } : undefined}
            >
              Risk
            </p>
            <InfoBlock isMiddle>
              <div>
                <strong>💡 Risk Rating</strong><br/>
                {riskRating?.poolRating || "-"}
                {riskRating?.poolUrl && (
                  <>
                    {" "}
                    <a
                      href={riskRating.poolUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-400"
                    >
                      details
                    </a>
                  </>
                )}
                <br/>
                {riskRating?.poolRatingDescription || ""}
              </div>
            </InfoBlock>
          </div>
          {isLoading ? (
            <SkeletonBox className="h-6 w-6 rounded-full" />
          ) : (
            (() => {
              const letter = riskRating?.poolRating || "-";
              const color = (riskRating?.poolRatingColor || "gray").toLowerCase();
              const colorClass =
                color === "green"
                  ? "bg-green-accent"
                  : color === "yellow"
                  ? "bg-yellow-400"
                  : color === "red"
                  ? "bg-red-500"
                  : "bg-gray-500";
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-full ${colorClass} h-6 w-6 flex items-center justify-center pb-[2px]`}
                >
                  <p className="text-white font-bold text-lg leading-[18px]">{letter}</p>
                </motion.div>
              );
            })()
          )}
        </div>
      </div>

      {/* APY Section */}
      <div className="flex flex-row justify-end items-center w-full">
        <div className="flex flex-col gap-2 items-end">
          <div className="flex flex-row gap-1 items-end">
            <p
              className={classNames(
                "font-normal text-sm md:text-base leading-4 uppercase",
                {
                  [titleColor]: !isHexColor,
                },
              )}
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
              className={classNames(
                "font-bold text-base md:text-xl leading-6",
                {
                  "text-green-accent": apyValue > 0,
                  "text-red-error": apyValue <= 0,
                },
              )}
              isLoading={isAPYLoading}
              skeletonClassName="h-6 w-16"
            />
            {isReward && vault.protocolPoints && vault.protocolPoints > 0 ? (
              <InfoBlock
                isRight
                customIcon={<PointsIcon className="w-5 h-5" color="#ffffff" />}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">
                      {vault.protocol.name} native yield
                    </span>
                    <span className="text-cyan-400 font-medium text-base">
                      {(apyValue * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">
                      {`+ ${
                        vault.protocolPointsDescription
                          ? vault.protocolPointsDescription
                          : vault.protocol.name
                      } `}
                    </span>
                    <span className="text-white font-medium text-base">
                      {vault.protocolPoints} pts/$/day
                    </span>
                  </div>
                </div>
              </InfoBlock>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
