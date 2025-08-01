"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import VaultInputs from "@/components/VaultInputs";
import {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  VaultTotalAssetsinToken,
  Token,
  Balance,
  Tabs,
} from "@/types/types";
import { useUpdateAPYs } from "@/hooks/hooks";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CHAINS_EXPLORER_BASE_URL_MAINNET,
  CHAIN_ICONS,
  CHAIN_ID,
} from "@/constants/chainConfig";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { bigIntReplacer, bigIntReviver } from "@/utils/utils";
import {
  CheckTheTxIsInProgress,
  getLocalStorageObject,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import Dropdown from "@/components/VaultsDetailsWrapper/components/Dropdown";
import VaultInformationContent from "@/components/VaultsDetailsWrapper/components/VaultInformationDropdown";
import ChartDropdown from "@/components/VaultsDetailsWrapper/components/ChartDropdown";

import Button from "@/components/common/Button";
import BackToVaultsIcon from "@/components/svg/BackToVaultsIcon";
import InvestBlock from "@/components/InvestBlock";
import { SUPPORTED_TOKENS } from "@/constants/tokens";
import { VaultOverviewBlock } from "@/components/VaultOverviewBlock";
import DepositInstruction from "@/components/VaultsDetailsWrapper/components/DepositInstruction";
import { useUserSettingsStore } from "@/store/userSettingsStore";
import { Chain } from "viem";
import clsx from "clsx";
import { useTransactionStore } from "@/store/transactionStore";
import DepositComplete from "@/components/VaultsDetailsWrapper/components/DepositComplete";
import {
  useVaultDetailsFromGraph,
  useUserVaultBalancesFromGraph,
} from "@/hooks/useVaultsGraph";
import {
  convertGraphVaultToVaultData,
  convertGraphVaultToAPY,
  convertGraphVaultToTotalAssets,
} from "@/utils/graphUtils";
import YourInvestment from "@/components/VaultsDetailsWrapper/components/YourInvestment";
import { VaultCardInfoBlock } from "@/components/VaultsWrapper/components/VaultCardInfoBlock";
import { useWallet } from "@solana/wallet-adapter-react";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import MobileInfoModal from "@/components/modal/mobile/MobileInfoModal";
import MobileDepositInstruction from "@/components/VaultsDetailsWrapper/MobileDepositInstruction";
import WithdrawPendingBlock from "@/components/VaultsDetailsWrapper/components/WithdrawPendingBlock";
import MobileInvestmentPopover from "@/components/VaultsDetailsWrapper/components/MobileInvestmentPopover";
import WithdrawalNotice from "@/components/VaultsDetailsWrapper/components/WithdrawalNotice";
import { useWallets } from "@privy-io/react-auth";
import { zetachain } from "viem/chains";

import { motion, AnimatePresence } from "framer-motion";
import VaultHeaderInfo from "@/components/VaultsDetailsWrapper/components/VaultHeaderInfo";
import VaultStats from "@/components/VaultsDetailsWrapper/components/VaultStats";

import ChainsModal from "@/components/modal/chains/ChainsModal";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { AiOutlineConsoleSql } from "react-icons/ai";
import { useExternalTVL } from "@/hooks/useExternalTVL";

const VaultsDetailContainer: React.FC<{
  vaultID: string | string[];
  setVaultSymbol?: (symbol: string) => void;
  isFromTopUp?: boolean;
}> = ({ vaultID, setVaultSymbol, isFromTopUp }) => {
  const [vaultData, setVaultData] = useState<VaultData>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialIsDeposit = tabParam !== "withdraw";
  const wallet = useWallet();

  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalance, setUserVaultBalance] = useState<Balance>();
  const [vaultTotalAsset, setVaultTotalAsset] = useState<VaultTotalAssets>();
  const [vaultTotalAssetinToken, setVaultTotalAssetinToken] =
    useState<VaultTotalAssetsinToken>();
  const [selectedToken, setSelectedToken] = useState<Token | undefined>();
  const [isDeposit, setIsDeposit] = useState<boolean>(initialIsDeposit);
  const [currentTab, setCurrentTab] = useState<string>(initialIsDeposit ? "Invest" : "Withdraw");
  const [showMobileInvestment, setShowMobileInvestment] = useState(false);
  const giftButtonRef = useRef<HTMLButtonElement>(null);
  const { openStep } = useAuthStore();

  const [openDropdown, setOpenDropdown] = useState<string | null>(
    "transaction-progress",
  );

  const handleDropdownToggle = (dropdownId: string, isOpen: boolean) => {
    if (isOpen) {
      setOpenDropdown(dropdownId);
    } else {
      setOpenDropdown(null);
    }
  };

  const [depositData, setDepositData] = useState({
    amount: "0",
    symbol: "",
    usdValue: 0,
  });

  const {
    transactionStepFeedback,
    lastTransactionStepFeedback,
    finishedTransaction,
    setFinishedTransaction,
    setLastTransactionStepFeedback,
    setTransactionStepFeedback,
    setIsTransactionProcessing,
    isTransactionProcessing,
    setLastDepositInfo,
    lastDepositInfo,
    setLastWithdrawInfo,
    lastWithdrawInfo,
    isFailedOnConfirmation,
    setIsFailedOnCOnfirmation,
  } = useTransactionStore();

  const { switchToChain, walletAddress, activeChain, activeEvmWallet: user } =
    useMultiChain();

  const vaultIdStr = Array.isArray(vaultID) ? vaultID[0] : vaultID;

  useEffect(() => {
    const shouldBeDeposit = searchParams.get("tab") !== "withdraw";
    if (vaultData?.id) {
      const TxInfo = getLocalStorageObject(vaultData.id);
      const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
      if (isTxInProgress && TxInfo?.tab) {
        setIsDeposit(TxInfo.tab === Tabs.DEPOSIT);
      } else {
        if (isDeposit !== shouldBeDeposit) {
          setIsDeposit(shouldBeDeposit);
        }
      }
    } else {
      if (isDeposit !== shouldBeDeposit) {
        setIsDeposit(shouldBeDeposit);
      }
    }
    setIsFailedOnCOnfirmation(false);
  }, [searchParams, vaultData?.id]);

  const handleTabChange = (tab: string) => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString());
    if (isTxInProgress) return;

    const newIsDeposit = tab.toLowerCase() === "invest";
    setIsDeposit(newIsDeposit);
    setCurrentTab(tab);

    updateLocalStorageObject(vaultID.toString(), {
      tab: newIsDeposit ? Tabs.DEPOSIT : Tabs.WITHDRAW,
    });

    const newUrl = new URL(window?.location.href);
    if (newIsDeposit) {
      newUrl.searchParams.delete("tab");
    } else {
      newUrl.searchParams.set("tab", "withdraw");
    }
    window?.history.replaceState({}, "", newUrl.toString());
  };

  const handleDepositDataUpdate = useCallback(
    (amount: string, symbol: string, usdValue: number) => {
      setDepositData({ amount, symbol, usdValue });
    },
    [],
  );

  const loadSlippageForVault = useUserSettingsStore(
    (state) => state.loadSlippageForVault,
  );

  useEffect(() => {
    const vaultIdStr = Array.isArray(vaultID) ? vaultID[0] : vaultID;

    if (vaultIdStr) {
      loadSlippageForVault(vaultIdStr);
    }
  }, [vaultID, loadSlippageForVault]);

  const handleChainSelect = useCallback(
    async (chain: Chain) => {
      await switchToChain(chain);
    },
    [switchToChain],
  );

  useEffect(() => {
    if (vaultID && activeChain) {
      const vaultInfo = getLocalStorageObject(vaultID.toString());
      if (vaultInfo?.selectedChain) {
        try {
          const savedChain = JSON.parse(vaultInfo.selectedChain, bigIntReviver);
          if (savedChain.id !== activeChain?.id) {
          }
        } catch (error) {
          console.error("Error parsing selectedChain from localStorage", error);
        }
      }
    }
  }, [vaultID, activeChain]);

  useEffect(() => {
    const checkTransactionState = () => {
      if (!vaultID) return;

      const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString());
      const vaultTxData = getLocalStorageObject(vaultID.toString());

      if (isTxInProgress && vaultTxData) {
        setTransactionStepFeedback(vaultTxData?.transactionStepFeedback ?? {});
        setLastTransactionStepFeedback(
          vaultTxData?.lastTransactionStepFeedback ?? {},
        );
        setFinishedTransaction(vaultTxData?.finishedTransaction ?? false);
        setIsTransactionProcessing(
          vaultTxData?.isTransactionProcessing ?? false,
        );
      } else {
        setTransactionStepFeedback({});
        setLastTransactionStepFeedback({});
        setFinishedTransaction(false);
        setIsTransactionProcessing(false);
        setIsFailedOnCOnfirmation(false);
      }
    };

    checkTransactionState();
  }, [vaultID, user, wallet]);

  const currentVault = useMemo(() => {
    return vaultData ? [vaultData] : null;
  }, [vaultData?.id]);

  const { data: vaultFromGraph } = useVaultDetailsFromGraph(vaultIdStr);
  const memoizedWalletAddress = useMemo(
    () => walletAddress || undefined,
    [walletAddress],
  );
  const { userVaultBalances } = useUserVaultBalancesFromGraph(
    memoizedWalletAddress,
  );

  const backPath: string = pathname.includes("old-vaults")
    ? "/old-vaults"
    : "/";

  useEffect(() => {
    if (vaultFromGraph?.vault) {
      const vd = convertGraphVaultToVaultData(vaultFromGraph.vault);
      setVaultData(vd);

      const newAPY = convertGraphVaultToAPY(vaultFromGraph.vault);
      setVaultAPYs((prevAPYs) => {
        const existingAPY = prevAPYs.find(
          (apy) => apy.vaultId === vaultID.toString(),
        );
        if (!existingAPY || existingAPY.APY7d !== newAPY.APY7d) {
          return [newAPY];
        }
        return prevAPYs;
      });

      setVaultTotalAsset(convertGraphVaultToTotalAssets(vaultFromGraph.vault));
    }
  }, [vaultID, vaultFromGraph]);

  // Integrate external TVL data for the vault detail page
  const {
    enhancedTotalAssets,
    isLoading: externalTVLLoading,
    error: externalTVLError,
  } = useExternalTVL({
    vaultIds: vaultData ? [vaultData.id] : [],
    existingTotalAssets: vaultTotalAsset ? [vaultTotalAsset] : [],
    enabled: !!vaultData
  });

  // Update the vault total assets with external TVL data when available
  const finalVaultTotalAsset = useMemo(() => {
    if (enhancedTotalAssets.length > 0) {
      return enhancedTotalAssets[0];
    }
    return vaultTotalAsset;
  }, [enhancedTotalAssets, vaultTotalAsset]);

  // Set user vault balance from graph data
  useEffect(() => {
    const userBalance = userVaultBalances?.find(
      (balance) => balance.vaultId === vaultIdStr,
    );

    if (userVaultBalances?.length && vaultIdStr) {
      if (userBalance) {
        const balanceValue = String(userBalance.balance);

        if (userVaultBalance?.formatted !== balanceValue) {
          const balance: Balance = {
            value: BigInt(0),
            formatted: balanceValue,
            formattedUSD: "$0.00",
          };

          setUserVaultBalance(balance);

          setVaultTotalAssetinToken({
            vaultId: vaultIdStr,
            totalAssetsinToken: balanceValue,
          });
        }
      } else if (
        userVaultBalance !== undefined ||
        vaultTotalAssetinToken !== undefined
      ) {
        setUserVaultBalance(undefined);
        setVaultTotalAssetinToken(undefined);
      }
    }
  }, [userVaultBalances, vaultIdStr, userVaultBalance, vaultTotalAssetinToken]);

  const strategyExplorerBaseUrl = useMemo(() => {
    if (!vaultData?.protocol?.chainId) return "";
    return CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] ?? "";
  }, [vaultData?.protocol?.chainId]);

  const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000];

  const vaultTokenPrice = useTokenPriceBySymbol(vaultData?.inputToken.symbol);

  const crvTokenPrice = useTokenPriceBySymbol("CRV");
  const cvxTokenPrice = useTokenPriceBySymbol("CVX");
  const ethTokenPrice = useTokenPriceBySymbol("ETH");
  const compTokenPrice = useTokenPriceBySymbol("COMP");
  const opTokenPrice = useTokenPriceBySymbol("OP");
  const btcTokenPrice = useTokenPriceBySymbol("CBBTC");

  const memoizedPrices = useMemo(
    () => ({
      crv: crvTokenPrice,
      cvx: cvxTokenPrice,
      eth: ethTokenPrice,
      comp: compTokenPrice,
      op: opTokenPrice,
      btc: btcTokenPrice,
    }),
    [
      Math.floor((crvTokenPrice || 0) * 100),
      Math.floor((cvxTokenPrice || 0) * 100),
      Math.floor((ethTokenPrice || 0) * 100),
      Math.floor((compTokenPrice || 0) * 100),
      Math.floor((opTokenPrice || 0) * 100),
      Math.floor((btcTokenPrice || 0) * 100),
    ],
  );

  useUpdateAPYs(
    currentVault,
    setVaultAPYs,
    setLoading,
    memoizedPrices.crv,
    memoizedPrices.cvx,
    memoizedPrices.eth,
    memoizedPrices.comp,
    memoizedPrices.op,
    memoizedPrices.btc,
    user,
  );

  const handleTokenSelect = useCallback(
    (token: Token | undefined) => {
      setSelectedToken(token);
      updateLocalStorageObject(vaultID.toString(), {
        selectedToken: JSON.stringify(token, bigIntReplacer),
      });
    },
    [vaultID],
  );

  const handleChainAndTokenSelect = useCallback(
    async (chain: Chain, token: Token) => {
      handleTokenSelect(token);
      console.log("handleChainAndTokenSelect");
      handleChainSelect(chain);
    },
    [handleChainSelect, handleTokenSelect],
  );

  const isProcessingTx =
    isTransactionProcessing ||
    (!finishedTransaction && Object.keys(transactionStepFeedback).length > 0);

  const handleBack = () => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString());
    if (!isTxInProgress) {
      updateLocalStorageObject(vaultID.toString(), null);
    }
    router.push(backPath);
    setIsFailedOnCOnfirmation(false);
  };

  const isWithdraw = !isDeposit;

  const shouldShowTransactionComplete =
    finishedTransaction &&
    (Object.keys(lastTransactionStepFeedback).length > 0 ||
      Object.keys(transactionStepFeedback).length > 0);
  const currentTransactionInfo = isDeposit ? lastDepositInfo : lastWithdrawInfo;

  return vaultData ? (
    <div className=" font-gotham">
      {!walletAddress && <InvestBlock />}
      <div
        className={clsx(
          "flex flex-row justify-between items-center",
          !walletAddress && "mt-4 md:mt-6",
          walletAddress && "mt-0",
        )}
      >
        <Button
          variant="outlined"
          onClick={handleBack}
          className="flex items-center md:justify-between max-h-[42px] md:max-h-[56px] !px-[16px] !py-[10px] md:!py-[17px] !max-w-[181px] md:!max-w-[192px]"
        >
          <div className="w-5 h-5 relative z-2 flex items-center justify-center">
            <BackToVaultsIcon width={7} height={12} />
          </div>
          <p className="text-white leading-0 relative z-2 text-[18px] font-normal">
            Back to vaults
          </p>
        </Button>

        {(!walletAddress || walletAddress) && (
          <>
            <button
              ref={giftButtonRef}
              onClick={() => {
                if (!walletAddress || isDeposit) {
                  openStep("mobileInfo");
                } else if (
                  vaultData?.protocolPoints &&
                  vaultData.protocolPoints > 0
                ) {
                  setShowMobileInvestment((prev) => !prev);
                } else {
                  openStep("mobileInfo");
                }
              }}
              className="text-white rounded-full p-1 flex md:hidden hover:bg-gray-800/50 transition-colors cursor-pointer"
              type="button"
            >
              {!walletAddress ? (
                <ErrorInputIcon className="w-5 h-5 text-white" />
              ) : isDeposit ? (
                <ErrorInputIcon className="w-5 h-5 text-white" />
              ) : vaultData?.protocolPoints && vaultData.protocolPoints > 0 ? (
                <div className="rounded-[4px] w-6 h-6 flex items-center justify-center bg-[#0C1015]">
                  <Image
                    src="/rewards.png"
                    alt="reward star"
                    width={20}
                    height={18}
                  />
                </div>
              ) : (
                <ErrorInputIcon className="w-5 h-5 text-white" />
              )}
            </button>
            <MobileInfoModal
              vaultData={vaultData}
              walletAddress={walletAddress || undefined}
              isWithdraw={isWithdraw}
              selectedToken={selectedToken}
              selectedChain={activeChain ?? zetachain}
              vaultExplorerBaseUrl={vaultExplorerBaseUrl}
              strategyExplorerBaseUrl={strategyExplorerBaseUrl}
              depositData={depositData}
            />

            <MobileInvestmentPopover
              isVisible={
                showMobileInvestment &&
                isWithdraw &&
                !!walletAddress &&
                !!(vaultData?.protocolPoints && vaultData.protocolPoints > 0)
              }
              onClose={() => setShowMobileInvestment(false)}
              triggerRef={giftButtonRef}
              depositAmount={depositData.amount}
              vaultTokenSymbol={depositData.symbol}
              depositUSDValue={depositData.usdValue}
              vaultData={vaultData}
            />
          </>
        )}

        {user?.walletClientType !== "privy" && (
          <div className={`hidden md:flex items-center gap-4`}>
            <p className="text-white text-[18px] font-bold">
              Invest from any chain
            </p>

            <div className="flex items-center -space-x-2">
              {SUPPORTED_TOKENS.map((token, index) => (
                <div
                  key={token.symbol}
                  className="w-8 h-8 rounded-full overflow-hidden hover:scale-110 transition-transform duration-200 relative"
                  title={token.name}
                  style={{ zIndex: index }}
                >
                  <img
                    src={token.icon}
                    alt={token.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* {walletAddress && isWithdraw && <WithdrawPendingBlock />} */}

      <VaultHeaderInfo vaultData={vaultData} />

      {/* Mobile Vault Header */}
      <div className="md:hidden flex w-full flex-row items-center mt-4 mb-4">
        <div className="flex items-center gap-3 max-w-full flex-wrap flex-1">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.imgURL ?? ""}
                alt={vaultData.protocol.network}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
                sizes="24px"
              />
            </div>
            <h2 className="font-bold text-white text-sm">{vaultData.protocol.network}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.protocol.imgURL}
                alt={vaultData.protocol.name}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
                sizes="24px"
              />
            </div>
            <h2 className="font-bold text-white text-sm">{vaultData.protocol.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image
                src={vaultData.inputToken.imgURL}
                alt={vaultData.name}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
                sizes="24px"
              />
            </div>
            <h2 className="font-bold text-white text-sm">{vaultData.name}</h2>
            <h2 className="font-bold text-white py-1 ">
            {vaultData.type}
          </h2>
          </div>
          
        </div>
      </div>

      {walletAddress && isDeposit && (
        <div className="block lg:hidden mt-6 lg:mt-0">
          <VaultStats
            vaultData={vaultData}
            userVaultBalance={userVaultBalance}
            selectedVaultId={vaultID.toString()}
            vaultAPYs={vaultAPYs}
            transactionCompleted={finishedTransaction}
            selectedToken={selectedToken}
            onDepositDataUpdate={handleDepositDataUpdate}
            isDeposit={isDeposit}
          />
        </div>
      )}

      <div className="block md:hidden mt-4">
        <MobileDepositInstruction
          transactionStepFeedback={transactionStepFeedback}
          lastTransactionStepFeedback={lastTransactionStepFeedback}
          finishedTransaction={finishedTransaction}
          activeChainId={activeChain?.id}
          vaultStrategyChainId={vaultData?.protocol?.chainId}
          isDeposit={isDeposit}
          isProcessing={isTransactionProcessing}
          isFailedOnConfirmation={isFailedOnConfirmation}
        />
      </div>

      <section className="w-full flex flex-col justify-between xl:flex-row gap-4 mb-4 mt-8 md:mt-10 font-gotham">
        <AnimatePresence mode="wait" initial={false}>
          {shouldShowTransactionComplete ? (
            <motion.div
              key="deposit-complete-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DepositComplete
                vaultData={vaultData}
                selectedToken={selectedToken}
                userVaultBalance={userVaultBalance}
                isDeposit={isDeposit}
                isFailedOnConfirmation={isFailedOnConfirmation}
                onClose={() => {
                  setFinishedTransaction(false);
                  setLastTransactionStepFeedback({});
                  setTransactionStepFeedback({});
                  setIsTransactionProcessing(false);
                  setLastDepositInfo(null);
                  setLastWithdrawInfo(null);
                  setIsFailedOnCOnfirmation(false);

                  if (vaultID) {
                    updateLocalStorageObject(vaultID.toString(), null);
                  }
                  // setTransactionCompleted(true);
                }}
                depositedInputAmount={
                  currentTransactionInfo?.inputAmount || "0"
                }
                depositedOutputAmount={
                  currentTransactionInfo?.outputAmount || "0"
                }
                depositedInputSymbol={
                  currentTransactionInfo?.inputSymbol ||
                  (isDeposit
                    ? selectedToken?.symbol || vaultData.inputToken.symbol
                    : vaultData.symbol)
                }
                depositedOutputSymbol={
                  currentTransactionInfo?.outputSymbol ||
                  (isDeposit
                    ? vaultData.symbol
                    : selectedToken?.symbol || vaultData.inputToken.symbol)
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key="vault-inputs-block"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-row items-center w-full md:hidden">
                <VaultOverviewBlock
                  vault={vaultData}
                  vaultAPY={vaultAPYs.find(
                    (a) => a.vaultId === vaultID.toString(),
                  )}
                  totalAssets={finalVaultTotalAsset}
                  isLoading={
                    loading ||
                    !vaultAPYs.find((a) => a.vaultId === vaultID.toString())
                  }
                  isDeposit={isDeposit}
                  isReward={true}
                />
              </div>
              <div className="hidden md:block">
                <VaultCardInfoBlock>
                  <VaultOverviewBlock
                    vault={vaultData}
                    vaultAPY={vaultAPYs.find(
                      (a) => a.vaultId === vaultID.toString(),
                    )}
                    totalAssets={finalVaultTotalAsset}
                    titleColor="#535E73"
                    isLoading={
                      loading ||
                      !vaultAPYs.find((a) => a.vaultId === vaultID.toString())
                    }
                    isDeposit={isDeposit}
                    isReward={true}
                  />
                </VaultCardInfoBlock>
              </div>

              {walletAddress && isWithdraw && (
                <WithdrawalNotice vault={vaultData} />
              )}

              <div className="bg-[#14171F] pb-8 pt-6 px-4 md:px-5 min-w-[300px] lg:min-w-[490px] 2xl:min-w-[526px] rounded-[16px] w-full xl:max-w-[526px] mt-4 md:mt-4">
                <VaultInputs
                  vaultData={vaultData}
                  setTransactionCompleted={setFinishedTransaction}
                  userVaultBalance={userVaultBalance}
                  vaultTotalAssetinToken={vaultTotalAssetinToken}
                  transactionCompleted={finishedTransaction}
                  initialIsDeposit={initialIsDeposit}
                  isDeposit={isDeposit}
                  onTabChange={handleTabChange}
                  onTokenSelect={handleTokenSelect}
                  selectedToken={selectedToken}
                  selectedChain={activeChain}
                  onSelectChain={handleChainSelect}
                  onSelectChainAndToken={handleChainAndTokenSelect}
                  vaultId={vaultID.toString()}
                  APY7DValue={
                    vaultAPYs
                      .find((a) => a.vaultId === vaultID.toString())
                      ?.APY7d?.toString() ?? "0.00"
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden md:flex flex-col w-full 2xl:max-w-[576px] mt-8 md:mt-0 space-y-4 font-gotham">
          {isWithdraw &&
            walletAddress &&
            (vaultData?.protocolPoints ?? 0) > 0 && (
              <YourInvestment
                depositAmount={userVaultBalance?.formatted || "0"}
                vaultTokenSymbol={vaultData?.inputToken.symbol || ""}
                depositUSDValue={0}
                vaultData={vaultData}
              />
            )}
          {walletAddress && isDeposit && (
            <div className="hidden lg:block">
              <VaultStats
                vaultData={vaultData}
                userVaultBalance={userVaultBalance}
                selectedVaultId={vaultID.toString()}
                vaultAPYs={vaultAPYs}
                transactionCompleted={finishedTransaction}
                selectedToken={selectedToken}
                onDepositDataUpdate={handleDepositDataUpdate}
                isDeposit={isDeposit}
              />
            </div>
          )}
          <Dropdown
            title={
              isProcessingTx
                ? "Transaction Progress"
                : isWithdraw
                  ? currentTab === "Unstake" ? "Unstake flow" : "Withdraw flow"
                  : "Deposit flow"
            }
            defaultOpen={true}
            isOpen={openDropdown === "transaction-progress"}
            onToggle={(isOpen) =>
              handleDropdownToggle("transaction-progress", isOpen)
            }
          >
            <DepositInstruction
              transactionStepFeedback={transactionStepFeedback}
              lastTransactionStepFeedback={lastTransactionStepFeedback}
              finishedTransaction={finishedTransaction}
              activeChainId={activeChain?.id}
              vaultStrategyChainId={vaultData?.protocol?.chainId}
              isDeposit={isDeposit}
              currentTab={currentTab}
              isProcessing={isTransactionProcessing}
              isFailedOnConfirmation={isFailedOnConfirmation}
            />
          </Dropdown>
          <Dropdown
            title="Historical APY"
            defaultOpen={false}
            isOpen={openDropdown === "chart"}
            onToggle={(isOpen) => handleDropdownToggle("chart", isOpen)}
            transparentDesktop={true}
          >
            <ChartDropdown
              vaultId={vaultID.toString()}
              vaultName={vaultData.name.replace("Pool", "").replace("Lend", "")}
            />
          </Dropdown>
          {isDeposit && (
            <Dropdown
              title="What happens to my deposit?"
              defaultOpen={false}
              isOpen={openDropdown === "deposit-info"}
              onToggle={(isOpen) =>
                handleDropdownToggle("deposit-info", isOpen)
              }
            >
              <VaultInformationContent
                vaultData={vaultData}
                vaultExplorerBaseUrl={vaultExplorerBaseUrl}
                strategyExplorerBaseUrl={strategyExplorerBaseUrl}
                walletAddress={walletAddress || undefined}
                selectedToken={selectedToken}
                selectedChain={activeChain}
                type="deposit-flow"
              />
            </Dropdown>
          )}

          <Dropdown
            title="Information"
            defaultOpen={false}
            isOpen={openDropdown === "information"}
            onToggle={(isOpen) => handleDropdownToggle("information", isOpen)}
          >
            <VaultInformationContent
              vaultData={vaultData}
              vaultExplorerBaseUrl={vaultExplorerBaseUrl}
              strategyExplorerBaseUrl={strategyExplorerBaseUrl}
              walletAddress={walletAddress || undefined}
              selectedToken={selectedToken}
              selectedChain={activeChain}
              type="information"
            />
          </Dropdown>
        </div>
      </section>

      {vaultData && <ChainsModal vaultData={vaultData} />}
    </div>
  ) : (
    <div></div>
  );
};

export default VaultsDetailContainer;
