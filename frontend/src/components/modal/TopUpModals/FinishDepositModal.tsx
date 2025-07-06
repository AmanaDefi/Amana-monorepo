"use client";

import { Modal } from "../base/Modal";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { useFundWalletStore } from "@/store/fundWalletStore";
import CopyTextButton from "@/components/common/CopyTextButton";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMemo } from "react";
import { AppButton } from "@/components/button/AppButton";
import CheckIcon from "@/components/svg/CheckIcon";
import { formatDateTimeCustom, getBlockchainExplorerBaseUrl } from "@/utils/utils";

export const FinishDeposit = () => {
  const { step, closeAll, transactionHash, depositAmount, currency, chain } =
    useFundWalletStore();

  const { walletAddress } = useMultiChain();

  const formattedQuantity = useMemo(() => {
    return `${depositAmount} ${currency?.symbol}`;
  }, [depositAmount, currency]);

  const blockchainExplorerBaseUrl = getBlockchainExplorerBaseUrl(chain?.id);

  const explorerUrl = useMemo(() => {
    if (!blockchainExplorerBaseUrl || !transactionHash) return "#";
    return `${blockchainExplorerBaseUrl}/tx/${transactionHash}`;
  }, [blockchainExplorerBaseUrl, transactionHash]);

  const handleLink = () => {};

  return (
    <Modal
      isOpen={step === "finishDeposit"}
      onClose={closeAll}
      paddingClass="px-[21px] pt-5 pb-6 w-full flex flex-col items-center"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[358px] md:max-w-[526px]"
    >
        <div className="flex justify-between items-center w-full">
          <div className="w-10 h-10" />
          <p className="text-2xl font-medium mb-2">Deposit Details</p>
          <button
            onClick={closeAll}
            className="rounded-[8px] flex items-center justify-center w-10 h-10"
            aria-label="Close"
          >
            <CloseModalIcon width={16} height={16} />
          </button>
        </div>
      <div className="max-w-[371px]">

        <div className="text-center mb-8">
          <p className="text-base font-normal mb-2 text-[#535E73]">Quantity</p>
          <p className="text-lg font-bold mb-2 uppercase">
            {formattedQuantity}
          </p>
          {transactionHash && (
            <div className="flex items-center justify-center text-[#05D47F] text-xs">
              <CheckIcon color="#05D47F" />
              <p>Succeed</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-[1fr_2fr] gap-y-4 text-sm mb-8">
          <p className="font-bold">Deposit Account</p>
          <p className="font-bold text-right">Funding Account</p>

          <p className="text-gray-400">Chain Type</p>
          <p className="text-right text-white">{chain.name}</p>

          <p className="text-gray-400">Time</p>
          <p className="text-right text-white">
            {formatDateTimeCustom(new Date())}
          </p>

          <p className="text-gray-400">Deposit Address</p>
          <div className="flex items-center gap-1 justify-end text-white">
            <span className="break-all max-w-[calc(100%-30px)] text-right">
              {walletAddress}
            </span>

            <CopyTextButton text={walletAddress ?? ""} />
          </div>

          <p className="text-gray-400">Transaction Hash</p>
          <div className="flex gap-1  items-center justify-end text-white">
            <span className="break-all max-w-[calc(100%-30px)] text-right">
              {transactionHash}
            </span>

            <CopyTextButton text={transactionHash ?? ""} />
          </div>
        </div>
      </div>

      <div className="w-full">
        <AppButton link={explorerUrl} variant="reverse" onClick={handleLink}>
          View in Blockchain Explorer
        </AppButton>
      </div>
    </Modal>
  );
};
