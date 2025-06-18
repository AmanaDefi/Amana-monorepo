"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  TransactionStepMessages,
  TransactionStepStatus,
} from "@/types/types";
import { VAULT_DATA } from "@/constants";
import {
  useUpdateVaultBalanceAndTotalPerVault,
  useUpdateAPYs,
} from "@/hooks/hooks";
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
import { useChain } from "@account-kit/react";


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

  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalance, setUserVaultBalance] = useState<Balance>();
  const [vaultTotalAsset, setVaultTotalAsset] = useState<VaultTotalAssets>();
  const [vaultTotalAssetinToken, setVaultTotalAssetinToken] =
    useState<VaultTotalAssetsinToken>();
  const [transactionCompleted, setTransactionCompleted] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | undefined>();

  const [activeChainId, setActiveChainId] = useState<number>();

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

  const { switchToChain } = useMultiChain();
  const { chain: activeChain } = useChain();

  const vaultIdStr = Array.isArray(vaultID) ? vaultID[0] : vaultID;

  const loadSlippageFromStorage = useUserSettingsStore(
    (state) => state.loadSlippageFromStorage,
  );

  useEffect(() => {
    if (vaultIdStr) {
      loadSlippageFromStorage(vaultIdStr);
    }
  }, [vaultIdStr]);

  const handleChainSelect = useCallback(
    (chain: Chain) => {
      switchToChain(chain);

      if (vaultID) {
        updateLocalStorageObject(vaultID.toString(), {
          selectedChain: JSON.stringify(chain, bigIntReplacer),
        });
      }
    },
    [vaultID, switchToChain],
  );

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
      }
    };

    checkTransactionState();
  }, [vaultID]);

  useEffect(() => {
    if (activeChain?.id) {
      setActiveChainId(activeChain.id);
    }
  }, [activeChain]);

  const currentVault = useMemo(() => {
    return vaultData ? [vaultData] : null;
  }, [vaultData]);

  const vaults: VaultData[] = VAULT_DATA;
  const backPath: string = pathname.includes("old-vaults")
    ? "/old-vaults"
    : "/";
  const { walletAddress } = useMultiChain();

  useEffect(() => {
    const foundVault = vaults.find((v) => v.id === vaultID.toString());

    if (foundVault) {
      setVaultData(foundVault);
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
  }, [vaultID, initialIsDeposit, vaults]);

  const strategyExplorerBaseUrl = useMemo(() => {
    if (!vaultData?.protocol?.chainId) return "";
    return CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] ?? "";
  }, [vaultData?.protocol?.chainId]);

  const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000];

  useUpdateVaultBalanceAndTotalPerVault(
    vaultData || null,
    walletAddress,
    setUserVaultBalance,
    setVaultTotalAsset,
    setVaultTotalAssetinToken,
    transactionCompleted,
  );

  const vaultTokenPrice = useTokenPriceBySymbol(vaultData?.inputToken.symbol);

  useEffect(() => {
    if (userVaultBalance && vaultData) {
      const rawBalance =
        typeof userVaultBalance === "string"
          ? userVaultBalance
          : userVaultBalance.formatted;
      const usdValue = Number(rawBalance) * (vaultTokenPrice || 0);

      console.log(`Vault Deposit Details for ${vaultData.name}:`, {
        vaultId: vaultData.id,
        tokenSymbol: vaultData.inputToken.symbol,
        rawBalance: rawBalance,
        usdValue: `$${usdValue.toFixed(2)}`,
        tokenPrice: `$${vaultTokenPrice || 0}`,
      });
    }
  }, [userVaultBalance, vaultData, vaultTokenPrice]);

  const crvTokenPrice = useTokenPriceBySymbol("CRV");
  const cvxTokenPrice = useTokenPriceBySymbol("CVX");
  const ethTokenPrice = useTokenPriceBySymbol("ETH");
  const compTokenPrice = useTokenPriceBySymbol("COMP");
  const opTokenPrice = useTokenPriceBySymbol("OP");
  useUpdateAPYs(
    currentVault,
    setVaultAPYs,
    setLoading,
    crvTokenPrice,
    cvxTokenPrice,
    ethTokenPrice,
    compTokenPrice,
    opTokenPrice,
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

  const informationDropdownTitle = walletAddress
    ? "What happened with my Deposit?"
    : "Information";
  
   const shouldShowDepositComplete =
     finishedTransaction &&
     initialIsDeposit &&
     (Object.keys(lastTransactionStepFeedback).length > 0 ||
       Object.keys(transactionStepFeedback).length > 0);

  return vaultData ? (
    <div className=" font-gotham">
      {!walletAddress && <InvestBlock />}

      <div
        className={clsx(
          "flex flex-row justify-between",
          !walletAddress && "mt-6",
          walletAddress && "mt-0",
        )}
      >
        <Button
          variant="outlined"
          onClick={handleBack}
          className="flex items-center justify-between max-h-[56px]"
        >
          <div className="w-5 h-5 relative z-2 flex items-center justify-center">
            <BackToVaultsIcon width={7} height={12} />
          </div>
          <p className="text-white leading-0 relative z-2 text-[18px] font-normal">
            Back to vaults
          </p>
        </Button>
        <div className={`flex items-center gap-4`}>
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

      <VaultHeader
        vaultData={vaultData}
        userVaultBalance={userVaultBalance}
        selectedVaultId={vaultID.toString()}
        vaultTotalAsset={vaultTotalAsset}
        vaultAPYs={vaultAPYs}
        transactionCompleted={transactionCompleted}
        selectedToken={selectedToken}
      />

      <section className="w-full flex flex-col justify-between xl:flex-row gap-4 mb-4 mt-[56px] font-gotham">
        <div>
          <VaultOverviewBlock
            vault={vaultData}
            vaultAPY={vaultAPYs.find((a) => a.vaultId === vaultID.toString())}
            totalAssets={vaultTotalAsset}
          />

          {shouldShowDepositComplete ? (
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
              selectedChain={activeChain}
              onSelectChain={handleChainSelect}
              vaultId={vaultID.toString()}
            />
          ) : (
            <div className="bg-[#14171F] pb-8 pt-6 px-5 min-w-[526px] rounded-[16px] w-full xl:max-w-[526px] mt-8">
              <VaultInputs
                vaultData={vaultData}
                setTransactionCompleted={setTransactionCompleted}
                userVaultBalance={userVaultBalance}
                vaultTotalAssetinToken={vaultTotalAssetinToken}
                transactionCompleted={transactionCompleted}
                initialIsDeposit={initialIsDeposit}
                onTokenSelect={handleTokenSelect}
                selectedToken={selectedToken}
                selectedChain={activeChain}
                onSelectChain={handleChainSelect}
                vaultId={vaultID.toString()}
              />
            </div>
          )}
        </div>

        <div className="w-full xl:max-w-[576px] mt-8 md:mt-0 space-y-4 font-gotham">
          <Dropdown title={informationDropdownTitle} defaultOpen={true}>
            <VaultInformationContent
              vaultData={vaultData}
              vaultExplorerBaseUrl={vaultExplorerBaseUrl}
              strategyExplorerBaseUrl={strategyExplorerBaseUrl}
              walletAddress={walletAddress || undefined}
              selectedToken={selectedToken}
              selectedChain={activeChain}
            />
          </Dropdown>
          {walletAddress && (
            <Dropdown
              title={
                isProcessingTx ? "Transaction Progress" : "Deposit instruction"
              }
              defaultOpen={true}
            >
              <DepositInstruction
                transactionStepFeedback={transactionStepFeedback}
                lastTransactionStepFeedback={lastTransactionStepFeedback}
                finishedTransaction={finishedTransaction}
                activeChainId={activeChainId}
                vaultStrategyChainId={vaultData?.protocol?.chainId}
                isDeposit={initialIsDeposit}
                isProcessing={isTransactionProcessing}
              />
            </Dropdown>
          )}
        </div>
      </section>
    </div>
  ) : (
    <div></div>
  );
};

export default VaultsDetailContainer;
