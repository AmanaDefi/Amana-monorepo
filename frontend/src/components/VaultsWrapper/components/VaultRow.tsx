import React, { FC } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";

import { VaultAPY, VaultData, VaultTotalAssets } from "@/types/types";
import { formatNumberWithSuffix, formatTVLInUSD } from "@/utils/utils";
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
        <div className="flex flex-row gap-6 items-center w-[40%] min-w-0">
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
        <div className="flex w-[60%] flex-row xl:gap-14 gap-10 items-center justify-end">
          <div className="flex w-[40%] flex-row gap-14 items-center justify-center">
            <motion.p
              className="text-white font-bold text-lg leading-5 -tracking-1 w-[50%] text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              $
              {totalAssets?.totalAssets
                ? formatTVLInUSD(
                    Number(totalAssets.totalAssets),
                    vault.inputToken.symbol,
                    tokenPrice,
                  )
                : "0"}
            </motion.p>
            <motion.div
              className="w-[50%] flex items-center justify-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="rounded-full bg-green-accent h-6 w-6 flex items-center justify-center">
                <p className="text-white font-bold text-lg leading-5 ">A</p>
              </div>
            </motion.div>
          </div>
          <div className="w-[60%] flex flex-row items-center gap-2 xl:gap-6 justify-end">
            <motion.div
              className="flex flex-row gap-1 items-center w-[50%] justify-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.3 }}
            >
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
            <motion.div
              className="w-[50%]"
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
