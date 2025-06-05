import React, { FC } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { useMultiChain } from "@/providers/MultiChainProvider";
import {
  UserVaultBalance,
  VaultAPY,
  VaultData,
  VaultTotalAssets,
} from "@/types/types";
import { formatNumberWithSuffix, formatTokenBalance } from "@/utils/utils";
import { VaultCardInfoBlock } from "./VaultCardInfoBlock";
import { calculateRiskLevel } from "..";
import InfoIcon from "@/components/svg/InfoIcon";
import DynamicArrowIcon from "@/components/svg/DynamicArrow";
import classNames from "classnames";
import { AppButton } from "@/components/button/AppButton";
import { InfoPopup } from "./InfoBlock.tsx/InfoPopup";
import { InfoBlock } from "./InfoBlock.tsx";

const RISK_LEVELS: Record<number, { level: string; color: string }> = {
  1: { level: "Low", color: "bg-green-accent" },
  2: { level: "Medium", color: "bg-yellow-500" },
  3: { level: "High", color: "bg-red-500" },
};

const MOCK_DIGITS = 6.43;

type Props = {
  vault: VaultData;
  vaultAPYs: VaultAPY[];
  vaultTotalAssets: VaultTotalAssets[];
  userVaultBalances: UserVaultBalance[];
};

export const VaultCard: FC<Props> = React.memo(
  ({ vault, vaultAPYs, vaultTotalAssets, userVaultBalances }) => {
    const router = useRouter();
    const { walletAddress } = useMultiChain();

    const vaultAPY = vaultAPYs.find((apy) => apy.vaultId === vault.id);
    const totalAssets = vaultTotalAssets.find(
      (asset) => asset.vaultId === vault.id,
    );
    const riskLevel = calculateRiskLevel(vault);

    const handleVaultClick = (vaultId: string) => {
      router.push(`/vaults/${vaultId}`);
    };

    const is30dAPYUp = true;
    const isPredictionUp = false;

    return (
      <div
        className="bg-[#14171F] p-6 rounded-2xl border border-blue-button transition-all cursor-pointer"
        onClick={() => handleVaultClick(vault.id)}
      >
        <div className="flex md:flex-row flex-col gap-1 justify-between">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-md">
            <Image
              src={vault.inputToken.imgURL}
              alt={vault.inputToken.symbol}
              width={40}
              height={40}
              className="rounded-full"
              sizes="36px"
            />
            <div className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-baseline">
                <p className="text-white font-bold text-xl leading-5 -tracking-1">
                  {vault.name.replace("Pool", "").replace("Lend", "")}
                </p>
                <p className="text-white text-sm leading-4">Lend Pool</p>
              </div>
              <p className="text-white text-sm leading-4">
                on {vault.protocol.name}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Image
              src={vault.imgURL || ""}
              alt={vault.protocol.network}
              width={24}
              height={24}
              className="rounded-full"
              sizes="24px"
            />

            <h3 className="text-white text-sm font-bold">
              {vault.protocol.network}
            </h3>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full mb-4">
          {walletAddress && (
            <VaultCardInfoBlock>
              <div className="flex w-full justify-between">
                <span className="font-normal text-base leading-4 text-white">
                  Your Deposit:
                </span>
                <span className="text-blue-digits font-bold text-xl leading-5">
                  $
                  {formatTokenBalance(
                    userVaultBalances.find(
                      (balance: UserVaultBalance) =>
                        balance.vaultId === vault.id,
                    )?.balance || 0,
                    vault.inputToken.symbol,
                  )}
                </span>
              </div>
            </VaultCardInfoBlock>
          )}

          <VaultCardInfoBlock>
            <div className="flex flex-row justify-between items-center w-full">
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1 items-center">
                  <p className="font-normal text-base leading-4 uppercase text-white">
                    TVL
                  </p>
                  <InfoBlock>
                    💡 TVL (Total Value Locked) <br />
                    This is the total amount of assets deposited in this vault
                    by all users across all chains.
                  </InfoBlock>
                </div>
                <p className="text-blue-digits font-bold text-xl leading-5">
                  $
                  {formatNumberWithSuffix(
                    Number(totalAssets?.totalAssets || 0),
                  )}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex flex-row gap-1 items-center">
                  <p className="font-normal text-base leading-4 uppercase text-white">
                    RISK
                  </p>
                  <InfoBlock isMiddle>
                    💡 Risk Rating: A <br />
                    This vault has low protocol and slippage risk. Risk scores
                    are based on volatility, smart contract audits, and
                    liquidity depth.
                  </InfoBlock>
                </div>
                <div className="rounded-full bg-green-accent h-6 w-6 flex items-center justify-center">
                  <p className="text-white font-bold text-lg leading-5 ">A</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1 items-end">
                  <p className="font-normal text-base leading-4 uppercase text-white">
                    APY (7d)
                  </p>
                  <InfoBlock isRight >
                    💡 APY (Annual Percentage Yield) <br />
                    Estimated yearly return with compounding. It may vary based
                    on rewards, liquidity, and market changes.
                  </InfoBlock>
                </div>
                <p
                  className={classNames(
                    "font-bold text-xl leading-5",
                    { "text-green-accent": Number(vaultAPY?.APY7d) > 0 },
                    { "text-red-error": Number(vaultAPY?.APY7d) <= 0 },
                  )}
                >
                  {(Number(vaultAPY?.APY7d || 0) * 100).toFixed(2)}%
                </p>
              </div>
            </div>
          </VaultCardInfoBlock>

          {/*MOCK APY 30d and predictions */}
          <div className="flex flex-row gap-4">
            <VaultCardInfoBlock>
              <div className="flex flex-col gap-2 w-full relative">
                <p className="font-normal text-sm leading-4 text-white">
                  30d avg APY
                </p>
                <div className="flex flex-row gap-8">
                  <p
                    className={classNames(
                      "font-bold text-xl leading-5",
                      { "text-green-accent": is30dAPYUp },
                      { "text-red-error": !is30dAPYUp },
                    )}
                  >
                    6.43%
                  </p>
                  <div className={classNames({ "rotate-180": !is30dAPYUp })}>
                    <DynamicArrowIcon
                      color={is30dAPYUp ? "#05D47F" : "#FF1E1E"}
                    />
                  </div>
                </div>
                <div className="hover:cursor-pointer absolute right-[-10px] top-[-10px]">
                  <InfoIcon />
                </div>
              </div>
            </VaultCardInfoBlock>

            <VaultCardInfoBlock>
              <div className="flex flex-col gap-2  w-full relative">
                <p className="font-normal text-sm leading-4 text-white">
                  30d prediction
                </p>
                <div className="flex flex-row gap-10">
                  <p
                    className={classNames(
                      "font-bold text-xl leading-5",
                      { "text-green-accent": isPredictionUp },
                      { "text-red-error": !isPredictionUp },
                    )}
                  >
                    {(!isPredictionUp ? "-" : "") + MOCK_DIGITS}%
                  </p>
                  <div
                    className={classNames({ "rotate-180": !isPredictionUp })}
                  >
                    <DynamicArrowIcon
                      color={isPredictionUp ? "#05D47F" : "#FF1E1E"}
                    />
                  </div>
                </div>
                <div className="hover:cursor-pointer absolute right-[-10px] top-[-10px]">
                  <InfoIcon />
                </div>
              </div>
            </VaultCardInfoBlock>
          </div>
        </div>

        <p className="font-normal text-xs leading-4 text-white mb-6">
          This vault auto-compounds Lenders Tokens on{" "}
          <p className="flex flex-row gap-1">
            {vault.protocol.name} <InfoIcon />
          </p>
        </p>
        {/* Buttons */}
        <div className="flex gap-4">
          <AppButton
            isBlue
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/vaults/${vault.id}?tab=deposit`);
            }}
          >
            Deposit
          </AppButton>
          {userVaultBalances.find(
            (balance: UserVaultBalance) => balance.vaultId === vault.id,
          )?.balance &&
            Number(
              userVaultBalances.find(
                (balance: UserVaultBalance) => balance.vaultId === vault.id,
              )?.balance,
            ) > 0 && (
              <AppButton
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/vaults/${vault.id}?tab=withdraw`);
                }}
              >
                Withdraw
              </AppButton>
            )}
        </div>
      </div>
    );
  },
);
