"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import VaultHeader from "@/components/VaultHeader";
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
import { CHAINS_EXPLORER_BASE_URL_MAINNET } from "@/constants/chainConfig";
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

import Button from "@/components/Button";
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
import { useChain, useUser } from "@account-kit/react";
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
import { useAuthStore } from "@/store/authStore";
import MobileInfoModal from "@/components/modal/mobile/MobileInfoModal";
import MobileDepositInstruction from "@/components/VaultsDetailsWrapper/MobileDepositInstruction";
import GiftIcon from "@/components/svg/GiftIcon";
import WithdrawPendingBlock from "@/components/VaultsDetailsWrapper/components/WithdrawPendingBlock";
import MobileInvestmentPopover from "@/components/VaultsDetailsWrapper/components/MobileInvestmentPopover";
import WithdrawalNotice from "@/components/VaultsDetailsWrapper/components/WithdrawalNotice";

import { motion, AnimatePresence } from "framer-motion"; // <-- Додаємо імпорти Framer Motion

const VaultsDetailContainer: React.FC<{
  vaultID: string | string[];
  setVaultSymbol?: (symbol: string) => void;
}> = ({ vaultID, setVaultSymbol }) => {
  const [vaultData, setVaultData] = useState<VaultData>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialIsDeposit = tabParam !== "withdraw";
  const user = useUser();
  const wallet = useWallet();

  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalance, setUserVaultBalance] = useState<Balance>();
  const [vaultTotalAsset, setVaultTotalAsset] = useState<VaultTotalAssets>();
  const [vaultTotalAssetinToken, setVaultTotalAssetinToken] =
    useState<VaultTotalAssetsinToken>();
  const [transactionCompleted, setTransactionCompleted] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | undefined>();
  const [isDeposit, setIsDeposit] = useState<boolean>(initialIsDeposit);
  const [showMobileInvestment, setShowMobileInvestment] = useState(false);
  const giftButtonRef = useRef<HTMLButtonElement>(null);

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
  } = useTransactionStore();

  const { switchToChain, walletAddress } = useMultiChain();
  const { chain: activeChain } = useChain();

  const { openStep } = useAuthStore();

  const vaultIdStr = Array.isArray(vaultID) ? vaultID[0] : vaultID;

  useEffect(() => {
    const shouldBeDeposit = searchParams.get("tab") !== "withdraw";
    if (vaultData?.id) {
      const TxInfo = getLocalStorageObject(vaultData.id);
      const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
      if (isTxInProgress && TxInfo?.tab) {
        setIsDeposit(TxInfo.tab === Tabs.DEPOSIT);
      } else {
        setIsDeposit(shouldBeDeposit);
      }
    } else {
      setIsDeposit(shouldBeDeposit);
    }
  }, [searchParams, vaultData]);

  const handleTabChange = (tab: string) => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString());
    if (isTxInProgress) return;

    const newIsDeposit = tab.toLowerCase() === "invest";
    setIsDeposit(newIsDeposit);

    updateLocalStorageObject(vaultID.toString(), {
      tab: newIsDeposit ? Tabs.DEPOSIT : Tabs.WITHDRAW,
    });

    const newUrl = new URL(window.location.href);
    if (newIsDeposit) {
      newUrl.searchParams.delete("tab");
    } else {
      newUrl.searchParams.set("tab", "withdraw");
    }
    window.history.replaceState({}, "", newUrl.toString());
  };

  const handleDepositDataUpdate = useCallback(
    (amount: string, symbol: string, usdValue: number) => {
      setDepositData({ amount, symbol, usdValue });
    },
    [],
  );

  const loadSlippageFromStorage = useUserSettingsStore(
    (state) => state.loadSlippageFromStorage,
  );

  useEffect(() => {
    if (vaultIdStr) {
      loadSlippageFromStorage(vaultIdStr);
    }
  }, [vaultIdStr]);

  const handleChainSelect = useCallback(
    async (chain: Chain) => {
      await switchToChain(chain);

      if (vaultID) {
        updateLocalStorageObject(vaultID.toString(), {
          selectedChain: JSON.stringify(chain, bigIntReplacer),
        });
      }
    },
    [vaultID, switchToChain],
  );

  useEffect(() => {
    if (vaultID) {
      const vaultInfo = getLocalStorageObject(vaultID.toString());
      if (vaultInfo?.selectedChain && activeChain) {
        try {
          const savedChain = JSON.parse(vaultInfo.selectedChain, bigIntReviver);
          if (savedChain.id !== activeChain.id) {
            switchToChain(savedChain);
          }
        } catch (error) {}
      }
    }
  }, [vaultID, switchToChain]);

  useEffect(() => {
    const checkTransactionState = () => {
      if (!vaultID) return;

      if (!user?.address && !wallet?.publicKey) {
        localStorage.removeItem(vaultID.toString());
        return;
      }

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
      setVaultAPYs([convertGraphVaultToAPY(vaultFromGraph.vault)]);
      setVaultTotalAsset(convertGraphVaultToTotalAssets(vaultFromGraph.vault));
    }

    if (vaultID) {
      const vaultInfo = getLocalStorageObject(vaultID.toString());
      const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString());
      if (isTxInProgress) {
        if (vaultInfo?.selectedToken) {
          setSelectedToken(JSON.parse(vaultInfo.selectedToken, bigIntReviver));
        }
        setTransactionCompleted(vaultInfo?.transactionCompleted ?? false);
      } else {
        localStorage.removeItem(vaultID.toString());
        updateLocalStorageObject(vaultID.toString(), {
          tab: initialIsDeposit ? Tabs.DEPOSIT : Tabs.WITHDRAW,
        });
      }
    }
  }, [vaultID, initialIsDeposit, vaultFromGraph]);

  // Set user vault balance from graph data
  useEffect(() => {
    const userBalance = userVaultBalances?.find(
      (balance) => balance.vaultId === vaultIdStr,
    );

    if (userVaultBalances?.length && vaultIdStr) {
      if (userBalance) {
        // Convert formatted balance string to Balance object
        const balanceValue = String(userBalance.balance);

        if (userVaultBalance?.formatted !== balanceValue) {
          const balance: Balance = {
            value: BigInt(0), // We don't have raw value from graph, using 0
            formatted: balanceValue,
            formattedUSD: "$0.00", // Will be calculated in VaultHeader
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

  const memoizedPrices = useMemo(
    () => ({
      crv: crvTokenPrice,
      cvx: cvxTokenPrice,
      eth: ethTokenPrice,
      comp: compTokenPrice,
      op: opTokenPrice,
    }),
    [
      Math.floor((crvTokenPrice || 0) * 100),
      Math.floor((cvxTokenPrice || 0) * 100),
      Math.floor((ethTokenPrice || 0) * 100),
      Math.floor((compTokenPrice || 0) * 100),
      Math.floor((opTokenPrice || 0) * 100),
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
  );

  const handleTokenSelect = useCallback(
    (token: Token) => {
      setSelectedToken(token);
      updateLocalStorageObject(vaultID.toString(), {
        selectedToken: JSON.stringify(token, bigIntReplacer),
      });
    },
    [vaultID],
  );

  const isProcessingTx =
    isTransactionProcessing ||
    (!finishedTransaction && Object.keys(transactionStepFeedback).length > 0);

  const handleBack = () => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString());
    if (!isTxInProgress) {
      localStorage.removeItem(vaultID.toString());
    }
    router.push(backPath);
  };

  const isWithdraw = !isDeposit;

  const shouldShowDepositComplete =
    finishedTransaction &&
    isDeposit &&
    (Object.keys(lastTransactionStepFeedback).length > 0 ||
      Object.keys(transactionStepFeedback).length > 0);

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

        <>
          <button
            ref={giftButtonRef}
            onClick={() => {
              if (!walletAddress || isDeposit) {
                openStep("mobileInfo");
              } else {
                setShowMobileInvestment((prev) => !prev);
              }
            }}
            className="text-white rounded-full p-1 flex md:hidden hover:bg-gray-800/50 transition-colors cursor-pointer"
            type="button"
          >
            {!walletAddress || isDeposit ? (
              <ErrorInputIcon className="w-5 h-5 text-white" />
            ) : (
              <GiftIcon size={20} className="text-white" />
            )}
          </button>

          <MobileInfoModal
            vaultData={vaultData}
            walletAddress={walletAddress || undefined}
            isWithdraw={isWithdraw}
            selectedToken={selectedToken}
            selectedChain={activeChain}
            vaultExplorerBaseUrl={vaultExplorerBaseUrl}
            strategyExplorerBaseUrl={strategyExplorerBaseUrl}
            depositData={depositData}
          />

          <MobileInvestmentPopover
            isVisible={showMobileInvestment && isWithdraw && !!walletAddress}
            onClose={() => setShowMobileInvestment(false)}
            triggerRef={giftButtonRef}
            depositAmount={depositData.amount}
            vaultTokenSymbol={depositData.symbol}
            depositUSDValue={depositData.usdValue}
          />
        </>
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
      </div>
      {walletAddress && isWithdraw && <WithdrawPendingBlock />}
      <VaultHeader
        vaultData={vaultData}
        userVaultBalance={userVaultBalance}
        selectedVaultId={vaultID.toString()}
        vaultTotalAsset={vaultTotalAsset}
        vaultAPYs={vaultAPYs}
        transactionCompleted={transactionCompleted}
        selectedToken={selectedToken}
        onDepositDataUpdate={handleDepositDataUpdate}
        isDeposit={isDeposit}
      />

      <div className="block md:hidden mt-4">
        <MobileDepositInstruction
          transactionStepFeedback={transactionStepFeedback}
          lastTransactionStepFeedback={lastTransactionStepFeedback}
          finishedTransaction={finishedTransaction}
          activeChainId={activeChain?.id}
          vaultStrategyChainId={vaultData?.protocol?.chainId}
          isDeposit={isDeposit}
          isProcessing={isTransactionProcessing}
        />
      </div>

      <section className="w-full flex flex-col justify-between xl:flex-row gap-4 mb-4 mt-8 md:mt-[56px] font-gotham">
        <AnimatePresence mode="wait" initial={false}>
          {shouldShowDepositComplete ? (
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
                onClose={() => {
                  setFinishedTransaction(false);
                  setLastTransactionStepFeedback({});
                  setTransactionStepFeedback({});
                  setIsTransactionProcessing(false);

                  if (vaultID) {
                    localStorage.removeItem(vaultID.toString());
                  }
                  setTransactionCompleted(true);
                }}
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
              <div className="block md:hidden">
                <VaultOverviewBlock
                  vault={vaultData}
                  vaultAPY={vaultAPYs.find(
                    (a) => a.vaultId === vaultID.toString(),
                  )}
                  totalAssets={vaultTotalAsset}
                />
              </div>
              <div className="hidden md:block">
                <VaultCardInfoBlock>
                  <VaultOverviewBlock
                    vault={vaultData}
                    vaultAPY={vaultAPYs.find(
                      (a) => a.vaultId === vaultID.toString(),
                    )}
                    totalAssets={vaultTotalAsset}
                  />
                </VaultCardInfoBlock>
              </div>

              {walletAddress && isWithdraw && <WithdrawalNotice />}

              <div className="bg-[#14171F] pb-8 pt-6 px-4 md:px-5 min-w-[343px] xl:min-w-[450px] 2xl:min-w-[634px] rounded-[16px] w-full xl:max-w-[526px] mt-4 md:mt-8">
                <VaultInputs
                  vaultData={vaultData}
                  setTransactionCompleted={setTransactionCompleted}
                  userVaultBalance={userVaultBalance}
                  vaultTotalAssetinToken={vaultTotalAssetinToken}
                  transactionCompleted={transactionCompleted}
                  initialIsDeposit={initialIsDeposit}
                  isDeposit={isDeposit}
                  onTabChange={handleTabChange}
                  onTokenSelect={handleTokenSelect}
                  selectedToken={selectedToken}
                  selectedChain={activeChain}
                  onSelectChain={handleChainSelect}
                  vaultId={vaultID.toString()}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden md:flex flex-col w-full xl:max-w-[576px] 2xl:max-w-[707px] mt-8 md:mt-0 space-y-4 font-gotham">
          {isWithdraw && walletAddress && (
            <YourInvestment
              depositAmount={depositData.amount}
              vaultTokenSymbol={depositData.symbol}
              depositUSDValue={depositData.usdValue}
            />
          )}
          <Dropdown
            title={
              isProcessingTx
                ? "Transaction Progress"
                : isWithdraw
                  ? "Withdraw flow"
                  : "Deposit flow"
            }
            defaultOpen={true}
          >
            <DepositInstruction
              transactionStepFeedback={transactionStepFeedback}
              lastTransactionStepFeedback={lastTransactionStepFeedback}
              finishedTransaction={finishedTransaction}
              activeChainId={activeChain?.id}
              vaultStrategyChainId={vaultData?.protocol?.chainId}
              isDeposit={isDeposit}
              isProcessing={isTransactionProcessing}
            />
          </Dropdown>
          {isDeposit && (
            <Dropdown title="What happens to my deposit?" defaultOpen={true}>
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
          <Dropdown title="Information" defaultOpen={false}>
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
    </div>
  ) : (
    <div></div>
  );
};

export default VaultsDetailContainer;
