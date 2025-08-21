import React, { FC, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

import { VaultAPY, VaultData, VaultTotalAssets } from "@/types/types";
import { ExponentialRiskRating } from "@/types/exponentialTypes";
import { formatNumberWithSuffix } from "@/utils/utils";
import FlashIcon from "@/components/svg/Flash";
import { AppButton } from "@/components/button/AppButton";
import classNames from "classnames";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useAccount } from "wagmi";

type Props = {
  vault: VaultData;
  vaultAPYs: VaultAPY[];
  vaultTotalAssets: VaultTotalAssets[];
  riskRatings?: Map<string, ExponentialRiskRating | null>;
};

export const VaultRow: FC<Props> = React.memo(
  ({ vault, vaultAPYs, vaultTotalAssets, riskRatings }) => {
    const router = useRouter();
    const { walletAddress } = useMultiChain();
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    // Get token price for USD conversion
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

    const handleTooltipMouseEnter = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      setTooltipVisible(true);
    };

    const handleTooltipMouseLeave = () => {
      const id = setTimeout(() => {
        setTooltipVisible(false);
      }, 300); // 300ms delay before hiding
      setTimeoutId(id);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0.0, 0.2, 1],
        }}
        whileHover={{
          scale: 1.01,
          transition: { duration: 0.15 },
        }}
        whileTap={{ scale: 0.98 }}
        onClick={handleNavigate}
        className="flex flex-row justify-between items-center w-full rounded-lg p-4 bg-[#3E73C40D] border border-[#3E3C59] hover:cursor-pointer hover:border-[#3E73C4] transition-colors duration-200"
      >
        <div className="flex flex-row gap-6 items-center w-[30%] xl:w-[20%] min-w-0">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <Image
              src={vault.imgURL || ""}
              alt={vault.protocol.network}
              width={24}
              height={24}
              className="rounded-full flex-shrink-0"
              sizes="24px"
            />
          </motion.div>
          <div className="flex flex-row gap-3 items-center min-w-0 flex-1">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.3 }}
            >
              <Image
                src={vault.inputToken.imgURL}
                alt={vault.inputToken.symbol}
                width={40}
                height={40}
                className="rounded-full flex-shrink-0"
                sizes="36px"
              />
            </motion.div>
            <motion.div
              className="flex flex-col gap-1 min-w-0 flex-1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <p className="text-white font-bold text-lg leading-5 -tracking-1 truncate">
                {vault.protocol.name} {vault.name}
              </p>
            </motion.div>
          </div>
        </div>
        <div className="flex w-[70%] xl:w-[80%] flex-row items-center">
          {/* TVL Column */}
          <div className="w-[25%] xl:w-[30%] flex justify-end">
            <motion.p
              className="text-white font-bold text-lg leading-5 -tracking-1 text-right"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              $
              {totalAssets?.totalAssets
                ? formatNumberWithSuffix(Number(totalAssets.totalAssets))
                : "0"}
            </motion.p>
          </div>

          {/* Risk Column */}
          <div className="w-[25%] xl:w-[20%] flex justify-end">
            <motion.div
              className="flex items-center justify-end"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              {(() => {
                const rating = riskRatings?.get(vault.id) || null;
                console.log("rating", rating);
                const letter = rating?.poolRating || "-";
                const color = (rating?.poolRatingColor || "gray").toLowerCase();
                const colorClass =
                  color === "green"
                    ? "bg-green-accent"
                    : color === "yellow"
                    ? "bg-yellow-400"
                    : color === "red"
                    ? "bg-red-500"
                    : "bg-gray-500";
                return (
                  <div 
                    className="relative"
                    onMouseEnter={handleTooltipMouseEnter}
                    onMouseLeave={handleTooltipMouseLeave}
                  >
                    <div className={`rounded-full ${colorClass} h-6 w-6 flex items-center justify-center cursor-pointer`}>
                      <p className="text-white font-bold text-lg leading-5 ">{letter}</p>
                    </div>
                    {/* Enhanced Risk Rating Tooltip */}
                                         <div className={`absolute bottom-10 -left-5 transition-all z-[9999] -left-[130px] pointer-events-auto ${
                       tooltipVisible ? "opacity-100 visible" : "opacity-0 invisible"
                     }`}
                     onMouseEnter={handleTooltipMouseEnter}
                     onMouseLeave={handleTooltipMouseLeave}
                     onClick={(e) => e.stopPropagation()}
                     >
                      <div className="relative rounded-lg px-3 md:px-[19px] py-3 md:py-[14px] z-20 text-white text-xs md:text-sm leading-4 bg-blue-button inline-block w-64 md:w-[330px]">
                        <div className="text-left">
                          {/* Header with Risk Rating and Badge */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm">Risk Rating</span>
                            {rating?.poolRating && (
                              <div 
                                className="rounded-full h-5 w-5 flex items-center justify-center text-white font-bold text-xs"
                                style={{ 
                                  backgroundColor: rating.poolRatingColor || '#6B7280' 
                                }}
                              >
                                {rating.poolRating}
                              </div>
                            )}
                          </div>
                          
                          {/* Risk Description */}
                          <div className="font-bold text-sm mb-1">
                            {rating?.poolRating === 'A' && 'This Vault is Safest'}
                            {rating?.poolRating === 'B' && 'This Vault is Safe'}
                            {rating?.poolRating === 'C' && 'This Vault has Moderate Risk'}
                            {rating?.poolRating === 'D' && 'This Vault has High Risk'}
                            {!rating?.poolRating && 'Risk rating not available'}
                          </div>
                          
                          {/* Explanatory Text */}
                          <div className="text-xs text-gray-300 mb-3">
                            Based on audit of code, protocol structure, and blockchain reliability.
                          </div>
                          
                                                     {/* Learn More Link */}
                           {rating?.poolUrl && (
                             <div className="mb-3">
                               <a
                                 href={rating.poolUrl}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="text-blue-400 underline text-xs hover:text-blue-300 transition-colors"
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 Learn more
                               </a>
                             </div>
                           )}
                           
                           {/* Footer Attribution */}
                           <div className="text-center text-xs text-gray-400">
                             <span>Powered by </span>
                             <a
                               href="https://exponential.fi/"
                               target="_blank"
                               rel="noopener noreferrer"
                               className="text-blue-400 hover:text-blue-300 transition-colors"
                               onClick={(e) => e.stopPropagation()}
                             >
                               exponential.fi
                             </a>
                           </div>
                        </div>
                        <span className="absolute -bottom-4 left-[125px]">
                          <svg width="16" height="8" viewBox="0 0 16 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 8L0 0H16L8 8Z" fill="#1B46E0"/>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>

          {/* APY Column */}
          <div className="w-[25%] xl:w-[30%] flex justify-end">
            <motion.div
              className="flex flex-row gap-1 items-center justify-end"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
              <p
                className={classNames(
                  "font-bold text-lg leading-5 text-right",
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
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <FlashIcon
                  color={
                    Number(vaultAPY?.APY7d || 0) > 0 ? "#05D47F" : "#FF1E1E"
                  }
                />
              </motion.div>
            </motion.div>
          </div>

          {/* Button Column */}
          <div className="w-[25%] xl:w-[20%] flex justify-end">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.3 }}
            >
              <AppButton variant="gray" onClick={handleNavigate}>
                {!!walletAddress ? "Details" : "Invest"}
              </AppButton>
            </motion.div>
          </div>
        </div>
      </motion.div>
    );
  },
);

VaultRow.displayName = "VaultRow";
