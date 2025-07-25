"use client";
import TabSelector from "@/components/common/TabSelector";
import InputTokenWithError from "@/components/input/InputTokenWithError";
import {
  VaultData,
  Token,
  Balance,
  SmartVaultActionType,
  VaultTotalAssetsinToken,
  Action,
  Tabs,
} from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Address, parseAbiItem, parseUnits } from "viem";
import { Chain } from "viem";
import {
  APPROVED_TOKENS,
  CHAIN_ID,
  chainsWithCustomRpcs,
} from "@/constants/chainConfig";
import {
  formatCurrency,
  getVaultErrorMessage,
  isZetachain,
  selectActions,
  bigIntReviver,
  bigIntReplacer,
  formatSlippageUSD,
  useDebounce,
} from "@/utils/utils";
import InteractionContainer from "./interactAPI";
import { useSlippage, useTokenPriceBySymbol } from "@/hooks/hooks";
import {
  fetchUserVaultMaxWithdraw,
  getPathDataAndAmountOut,
  getPerformanceFee,
} from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";

import {
  calculateDepositOutput,
  DepositCalculationResult,
  isCachedCalculationValid,
  getCacheStats,
} from "@/utils/depositCalculations";

import { trackEvent } from "@/utils/trackEvent";

import { motion, AnimatePresence } from "framer-motion";

import {
  CheckTheTxIsInProgress,
  getLocalStorageObject,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import ChainSelector from "./VaultsDetailsWrapper/components/ChainSelector";
import SlippageSettingsBlock from "./VaultsDetailsWrapper/components/SlippageSettingsBlock";
import FeeDisplay, {
  SwapSlippageBlock,
  DepositSlippageBlock,
  NetDepositBlock,
} from "./VaultsDetailsWrapper/components/FeeDisplay";
import APYChangeCard from "./VaultsDetailsWrapper/components/APYChangeCard";
import { useTransactionStore } from "@/store/transactionStore";
import {
  formatTokenBalance,
  formatUSDAmount,
  formatUSDValue,
  formatShares,
} from "@/utils/tokenFormat";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { useAPYStore } from "@/store/APYStore";
import { useMaxAmount } from "@/hooks/useMaxAmount";
import { InfoBlock } from "./VaultsWrapper/components/InfoBlock.tsx";
import { useTokenPrices } from "@/providers/TokenPriceProvider";
import { getTokenPrice } from "@/hooks/useVaultData";
import { getVaultGasTokenInfo } from "@/utils/getVaultGasTokenInfo";

export interface VaultInputsProps {
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalance?: Balance;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken;
  transactionCompleted: boolean;
  initialIsDeposit?: boolean;
  onTokenSelect: (token: Token | undefined) => void;
  selectedToken?: Token;
  selectedChain?: Chain | null;
  onSelectChain?: (chain: Chain) => void;
  onSelectChainAndToken?: (chain: Chain, token: Token) => void;
  vaultId: string;
  isDeposit: boolean;
  onTabChange: (tab: string) => void;
  APY7DValue: string;
}

export type ConversionOutput = {
  slippageActualValue: number | null;
  finalConvertedAmountInUSDFormatted: string;
  outputAmountFormatted: string;
  outputAmountInUSDFormatted: string;
  gasFeeInInputToken?: string;
  gasFeeInUSD?: string;
  gasFeeInETH?: string;
  netDepositToVaultUSD?: string;
  inputAmountInUSDFormatted?: string;
  slippageAmountInUSDFormatted?: string;
  // New fields for detailed breakdown
  swapSlippageUSD?: string;
  depositSlippageUSD?: string;
  totalLossUSD?: string;
  swapSlippagePercentage?: number;
  depositSlippagePercentage?: number;
  totalLossPercentage?: number;
};

export default function VaultInputs({
  vaultData,
  setTransactionCompleted,
  userVaultBalance,
  vaultTotalAssetinToken,
  transactionCompleted,
  initialIsDeposit = true,
  onTokenSelect,
  selectedToken,
  onSelectChain,
  onSelectChainAndToken,
  vaultId,
  isDeposit,
  onTabChange,
  selectedChain,
  APY7DValue,
}: VaultInputsProps): JSX.Element {
  const priceContext = useTokenPrices();
  const [gasTokenSymbol, setGasTokenSymbol] = useState<string>("ETH");
  const [gasTokenPrice, setGasTokenPrice] = useState<number>(0);

  useEffect(() => {
    async function fetchGasTokenSymbol() {
      if (!vaultData) return;
      const { gasZRC20Symbol } = await getVaultGasTokenInfo(vaultData);
      if (gasZRC20Symbol) {
        setGasTokenSymbol(gasZRC20Symbol);
        setGasTokenPrice(getTokenPrice(gasZRC20Symbol, priceContext));
      } else {
        setGasTokenSymbol("ETH");
        setGasTokenPrice(getTokenPrice("ETH", priceContext));
      }
    }
    fetchGasTokenSymbol();
  }, [vaultData, priceContext]);

  const [inputToken, setInputToken] = useState<Token | undefined>(
    selectedToken,
  );
  const [inputBalance, setCurrentInputBalance] =
    useState<Balance>(EMPTY_BALANCE);
  const [displayValue, setDisplayValue] = useState<string>("0.00");
  const [debouncedInputBalance, setDebouncedInputBalance] =
    useState<Balance>(EMPTY_BALANCE);
  const [isSlippageExceedingLimit, setIsSlippageExceedingLimit] =
    useState<boolean>(true);
  const [outputBoxErrorMessage, setOutputBoxErrorMessage] =
    useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [allowInput, setAllowInput] = useState<boolean>(false);
  const [label, setLabel] = useState(isDeposit ? "Invest" : "Withdraw");
  const {
    walletAddress,
    activeChain,
    activeEvmWallet: activeWallet,
  } = useMultiChain();

  const selectChain = useMemo(() => selectedChain, [selectedChain]);

  const { slippageValue: userSlippage } = useSlippage(vaultId);

  const handleSelectChainAngToken = (chain: Chain, token: Token) => {
    setInputToken(token);

    if (onSelectChainAndToken) {
      onSelectChainAndToken(chain, token);
    }
  };

  // Update label when isDeposit prop changes
  useEffect(() => {
    setLabel(isDeposit ? "Invest" : "Withdraw");
  }, [isDeposit]);

  const [steps, setSteps] = useState<Action[]>([]);
  const [step, setStep] = useState<number>(0);
  const [action, setAction] = useState<Action>(steps[0]);
  const [performanceFee, setPerformanceFee] = useState<number>(0);

  const {
    setIsButtonDisabled,
    setLastDepositInfo,
    setLastWithdrawInfo,
    finishedTransaction,
    clearDepositCalculationCache,
  } = useTransactionStore();

  const { isOpen, setSelectedTokenFromModal, selectedTokenFromModal } =
    useChainTokenModalStore();

  const { setPreviousAPY, setCurrentAPY, setActiveTransactionVault } =
    useAPYStore();

  const setDebouncedBalance = useDebounce(setDebouncedInputBalance, 500);

  const setInputBalance = useCallback(
    (bal: Balance) => {
      setCurrentInputBalance(bal);
      setDebouncedBalance(bal);
    },
    [setCurrentInputBalance, setDebouncedBalance],
  );

  useEffect(() => {
    async function handlePerformanceFee() {
      const perfFee = await getPerformanceFee(
        vaultData.id,
        vaultData.protocol.chainId ?? chainsWithCustomRpcs()[0].id,
        activeWallet,
      );
      const percentagePerformanceFee = Number((perfFee / 100).toFixed(2));
      setPerformanceFee(percentagePerformanceFee);
    }
    if (vaultData) {
      handlePerformanceFee();
    }
  }, [vaultData, activeWallet, selectChain]);

  useEffect(() => {
    if (vaultData?.id) {
      const TxInfo = getLocalStorageObject(vaultData.id);
      const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
      if (isTxInProgress) {
        if (TxInfo?.steps) {
          setSteps(TxInfo?.steps);
        }
        if (TxInfo?.step) {
          setStep(TxInfo?.step);
        }
        if (TxInfo?.action) {
          setAction(TxInfo?.action);
        }
        if (TxInfo?.inputBal) {
          setInputBalance(JSON.parse(TxInfo?.inputBal, bigIntReviver));
          setDisplayValue(
            JSON.parse(TxInfo?.inputBal, bigIntReviver)?.formatted ?? "0.00",
          );
        }
      }
    }
  }, [vaultData.id]);

  const initialConversionOutput: ConversionOutput = useMemo(
    () => ({
      slippageActualValue: null, // Keep for backward compatibility
      finalConvertedAmountInUSDFormatted: "0.00",
      outputAmountFormatted: "0.00",
      outputAmountInUSDFormatted: "0.00",
      swapSlippageUSD: undefined,
      depositSlippageUSD: undefined,
      totalLossUSD: undefined,
      swapSlippagePercentage: undefined,
      depositSlippagePercentage: undefined,
      totalLossPercentage: undefined,
    }),
    [],
  );

  const [loadingOutputToken, setLoadingOutputToken] = useState(false);
  const [conversionOutput, setConversionOutput] = useState<ConversionOutput>(
    initialConversionOutput,
  );

  const inputTokenPrice = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol);

  const isSelectedTokenInput =
    selectedTokenFromModal &&
    inputToken &&
    selectedTokenFromModal?.address === inputToken?.address &&
    selectedTokenFromModal?.symbol === inputToken?.symbol;

  const vaultToken: Token = useMemo(() => {
    return {
      symbol: vaultData.symbol,
      decimals: vaultData.inputToken.decimals,
      address: vaultData.id,
      imgURL: "",
      chainId: vaultData.protocol.chainId,
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    };
  }, [vaultData]);

  useEffect(() => {
    const setTokenBasedOnChain = () => {
      if (isOpen || isSelectedTokenInput) return;

      if (!selectedChain) {
        setInputToken(undefined);
        if (onTokenSelect) {
          onTokenSelect(undefined);
        }
        setSelectedTokenFromModal(null);
        return;
      }

      const tokens = APPROVED_TOKENS[selectedChain.id] || [];

      if (
        selectedChain &&
        selectedChain.id === CHAIN_ID["zetachain"] &&
        vaultData?.inputToken
      ) {
        setInputToken(vaultData.inputToken);
        if (onTokenSelect) {
          onTokenSelect(vaultData.inputToken);
        }
        setSelectedTokenFromModal(vaultData.inputToken);
      } else {
        const defaultToken =
          tokens.find((token) => token.symbol === "USDC") || tokens[0];

        if (defaultToken) {
          setInputToken(defaultToken);
          if (onTokenSelect) {
            onTokenSelect(defaultToken);
          }
          setSelectedTokenFromModal(defaultToken);
        }
      }
    };

    if (vaultData?.id) {
      const vaultInfo = getLocalStorageObject(vaultData?.id);
      const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);

      if (isTxInProgress && vaultInfo?.selectedToken) {
        setInputToken(JSON.parse(vaultInfo.selectedToken, bigIntReviver));
      } else {
        setTokenBasedOnChain();
      }
    } else {
      setTokenBasedOnChain();
    }

    setAllowInput(true);
  }, [
    selectedChain,
    vaultData,
    onTokenSelect,
    setSelectedTokenFromModal,
    isOpen,
    isSelectedTokenInput,
  ]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const { balance: tokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  // Reset token when chain changes to prevent cross-chain token errors
  useEffect(() => {
    // Clear token selection and balance when the active chain changes
    // This prevents the app from attempting to use a token from the previous chain
    // which could cause AbiDecodingZeroDataError when fetching token balances
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);

    if (selectChain?.id && !isTxInProgress) {
      setInputBalance(EMPTY_BALANCE);
      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
      });
      setDisplayValue("0.00");
    }
  }, [selectChain?.id, vaultData.id]);

  // Force refresh token balance when token or chain changes
  useEffect(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (inputToken && selectChain && !isTxInProgress) {
      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("0.00");

      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
        displayValue: "0.00",
      });
    }
  }, [inputToken, selectChain, vaultData.id]);

useEffect(() => {
  const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
// Fallback for missing input token price
if (isDeposit && (inputToken && (inputTokenPrice === 0 || inputTokenPrice === undefined))) {
  setErrorMessage("Token price unavailable. Please try again later or select a different token.");
  return;
}
  if (!inputToken || isTxInProgress) {
    return;
  }

  if (loadingOutputToken) {
    setErrorMessage("");
    return;
  }

  if (isDeposit) {
    setErrorMessage(
      getVaultErrorMessage(
        inputBalance.formatted, 
        tokenBalance.formatted, 
        steps,
        vaultData,
        inputTokenPrice,
        isDeposit,
      ),
    );
  } else {
    const availableBalanceForWithdrawal = userVaultBalance?.formatted || "0";

    setErrorMessage(
      getVaultErrorMessage(
        inputBalance.formatted,
        availableBalanceForWithdrawal,
        steps,
        vaultData,
        vaultTokenPrice,
        isDeposit,
      ),
    );
  }
}, [
  inputToken,
  inputBalance.formatted,
  isDeposit,
  vaultData,
  steps,
  inputTokenPrice,
  vaultTokenPrice,
  loadingOutputToken,
  userVaultBalance?.formatted,
  tokenBalance.formatted,
]);

  const isButtonDisabled = useMemo(async () => {
    if (
      !inputBalance.formatted ||
      inputBalance.formatted === "0" ||
      inputBalance.formatted === "0.00" ||
      Number(inputBalance.formatted) <= 0
    ) {
      setIsButtonDisabled(true);
      return true;
    }

    if (loadingOutputToken) {
      setIsButtonDisabled(true);
      return true;
    }

    if (errorMessage || outputBoxErrorMessage) {
      setIsButtonDisabled(true);
      return true;
    }

    if (isDeposit) {
      if (Number(inputBalance.value) > Number(tokenBalance.value)) {
        setIsButtonDisabled(true);
        return true;
      }
    } else {
      if (!walletAddress) {
        setIsButtonDisabled(true);
        return true;
      }
      const maxWithdrawAmount = await fetchUserVaultMaxWithdraw(
        vaultData.inputToken.decimals,
        walletAddress,
        vaultData.id,
      );
      if (Number(inputBalance.formatted) > Number(maxWithdrawAmount)) {
        setIsButtonDisabled(true);
        return true;
      }
    }

    if (
      isDeposit &&
      !vaultData.depositFeePaidFromGasTank &&
      debouncedInputBalance.value > 0n &&
      Number(
        conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
      ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""))
    ) {
      setIsButtonDisabled(true);
      return true;
    }
    if (
      inputBalance.value > 0n &&
      conversionOutput.outputAmountFormatted &&
      Number(conversionOutput.outputAmountFormatted) === 0 &&
      !(
        isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        debouncedInputBalance.value > 0n &&
        Number(
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, "") ??
            0,
        ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, "") ?? 0)
      )
    ) {
      setIsButtonDisabled(true);
      return true;
    }

    if (isSlippageExceedingLimit) {
      setIsButtonDisabled(true);
      return true;
    }
    setIsButtonDisabled(false);
    return false;
  }, [
    inputBalance.formatted,
    inputBalance.value,
    loadingOutputToken,
    errorMessage,
    outputBoxErrorMessage,
    isDeposit,
    tokenBalance.value,
    vaultData.depositFeePaidFromGasTank,
    debouncedInputBalance.value,
    conversionOutput.inputAmountInUSDFormatted,
    conversionOutput.gasFeeInUSD,
    conversionOutput.outputAmountFormatted,
    isSlippageExceedingLimit,
    setIsButtonDisabled,
    walletAddress,
    vaultData.id,
    vaultData.inputToken.decimals,
  ]);

  // Watch input balance and trigger steps config selection
  useEffect(() => {
    const fetchData = async () => {
      if (Number(inputBalance.value) !== 0 && inputToken && selectedChain) {
        const actionType = isDeposit
          ? SmartVaultActionType.Deposit
          : SmartVaultActionType.Withdrawal;

        const newStepsConfig = await selectActions(
          actionType,
          vaultData,
          selectedChain as Chain,
          walletAddress as any,
          inputBalance,
          inputToken,
          activeWallet,
        );

        setSteps(newStepsConfig);
        updateLocalStorageObject(vaultData.id, { steps: newStepsConfig });
      } else {
        setSteps([]);
        updateLocalStorageObject(vaultData.id, { steps: [] });
      }
    };

    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (!isTxInProgress) {
      fetchData();
    }
  }, [
    inputBalance,
    inputToken?.address,
    selectedChain?.id, // Use selectedChain instead of activeChain
    inputToken,
    isDeposit,
    vaultData,
    selectedChain,
    walletAddress,
    activeWallet,
    activeChain,
  ]);

  const handleTokenSelect = (selectedToken: Token) => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (isTxInProgress) return;

    // If the selected token is the vault token but from a different chain,
    // we should still use it directly without trying to find an equivalent
    setInputToken(selectedToken);
    setAllowInput(true);
    updateLocalStorageObject(vaultData.id, {
      selectedToken: JSON.stringify(selectedToken, bigIntReplacer),
    });

    // Notify parent component about token selection
    if (onTokenSelect) {
      onTokenSelect(selectedToken);
    }
  };

  // Handle tab selection from TabSelector
  const handleTabChange = (tab: string) => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (isTxInProgress) return;

    localStorage.removeItem(vaultData?.id);
    const newIsDeposit = tab.toLowerCase() === "invest";
    const newTab = newIsDeposit ? Tabs.DEPOSIT : Tabs.WITHDRAW;

    // Update label
    setLabel(newIsDeposit ? "Invest" : "Withdraw");

    // Reset input balance
    setInputBalance(EMPTY_BALANCE);
    setDisplayValue("0.00");
    updateLocalStorageObject(vaultData.id, {
      tab: newTab,
      inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
    });

    // Notify parent component about tab change
    onTabChange(tab);

    // Only attempt to set steps if we have a token and chain
    if (inputToken && selectedChain) {
      const fetchSteps = async () => {
        const newAction = newIsDeposit
          ? SmartVaultActionType.Deposit
          : SmartVaultActionType.Withdrawal;
        const steps = await selectActions(
          newAction,
          vaultData,
          selectedChain,
          walletAddress as any,
          inputBalance,
          inputToken,
          activeWallet,
        );
        setSteps(steps);
        updateLocalStorageObject(vaultData.id, {
          steps: steps,
          selectedToken: JSON.stringify(inputToken, bigIntReplacer),
        });
      };
      fetchSteps();
    }
  };

  const handleChangeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      if (isDeposit && (inputTokenPrice === 0 || inputTokenPrice === undefined)) {
        setErrorMessage("Token price unavailable. Please try again later or select a different token.");
        return;
      }
      if (!inputToken) return;
      const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxInProgress) return;

      let value = e.currentTarget.value;

      if (value === "") {
        setInputBalance({
          value: 0n,
          formatted: "0",
          formattedUSD: "0",
        });
        updateLocalStorageObject(vaultData.id, {
          inputBal: JSON.stringify(
            {
              value: 0n,
              formatted: "0",
              formattedUSD: "0",
            },
            bigIntReplacer,
          ),
          displayValue: "",
        });
        setDisplayValue("");
        return;
      }

      if (value === "0.") {
        setInputBalance({
          value: 0n,
          formatted: "0",
          formattedUSD: "0",
        });
        updateLocalStorageObject(vaultData.id, {
          inputBal: JSON.stringify(
            {
              value: 0n,
              formatted: "0",
              formattedUSD: "0",
            },
            bigIntReplacer,
          ),
          displayValue: "0.",
        });
        setDisplayValue("0.");
        return;
      }

      if (!value?.includes(".")) {
        value = String(Number(value));
      } else {
        const [integers, decimals] = value.split(".");
        const cleanIntegers = String(Number(integers));
        value = `${cleanIntegers}.${decimals}`;
      }

      const [integers, decimals] = value.split(".");
      let inputAmt = value;

      const decimalsNumber = isDeposit
        ? inputToken.decimals
        : vaultToken.decimals;
      if (decimals?.length > decimalsNumber) {
        inputAmt = `${integers}.${decimals.slice(0, decimalsNumber)}`;
      }

      if (isNaN(Number(inputAmt))) {
        return;
      }
      // convert string amt to bigint
      const newAmt = parseUnits(inputAmt, decimalsNumber);

      setInputBalance({
        value: newAmt,
        formatted: inputAmt,
        formattedUSD: String(Number(inputAmt) * inputTokenPrice),
      });

      setDisplayValue(inputAmt);

      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(
          {
            value: newAmt,
            formatted: inputAmt,
            formattedUSD: String(Number(inputAmt) * inputTokenPrice),
          },
          bigIntReplacer,
        ),
        displayValue: inputAmt,
      });
    },
    [inputToken, inputTokenPrice, isDeposit, vaultToken.decimals, vaultData.id, setInputBalance],
  );

  const { handleMaxClick } = useMaxAmount({
    inputToken,
    tokenBalance,
    isDeposit,
    vaultId: vaultData.id,
    vaultTotalAssetinToken,
    setInputBalance,
    setDisplayValue,
    handleChangeInput,
    walletAddress,
    vaultTokenDecimals: vaultData.inputToken.decimals,
  });

  const tokenList = useMemo(() => {
    let tokens: Token[] = [];

    if (
      !selectedChain?.id ||
      selectedChain.id === 7001 ||
      selectedChain.id === 7000
    ) {
      if (vaultData.inputToken) {
        tokens = [vaultData.inputToken];
      }
    } else {
      tokens = (APPROVED_TOKENS[selectedChain.id] || []).filter(
        (token): token is Token => token !== undefined,
      );
    }
    return tokens;
  }, [selectedChain?.id, vaultData.inputToken]);

  const getWithdrawOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      // 🔄 NEW LOGIC: Input is now in underlying asset terms, not shares
      // So we don't need to convert from shares to assets - the input IS the asset amount
      if (!isDeposit) {
        const availableBalance = userVaultBalance?.formatted || "0";
        const inputFormatted = (
          Number(inputAmountValue) /
          10 ** vaultData.inputToken.decimals
        ).toString();

        if (Number(inputFormatted) > Number(availableBalance)) {
          setLoadingOutputToken(false);
          return;
        }
      }

      let assetsAmount = inputAmountValue;

      const actualInputToken = isZetachain(activeChain?.id as number)
        ? inputToken
        : inputToken?.ZRC20equivalent;
      if (!actualInputToken) return;

      let tokenConversionAmount = assetsAmount;
      if (actualInputToken.address.toLowerCase() !== vaultData.inputToken.address.toLowerCase()) {
        console.log('[VaultInputs.tsx] Calling getPathDataAndAmountOut', { assetsAmount, vaultData, actualInputToken });
        const result = await getPathDataAndAmountOut(
          assetsAmount,
          vaultData.inputToken,
          actualInputToken,
          vaultData.id as Address,
          userSlippage * 100,
          { inputTokenChainId: vaultData.protocol.chainId, outputTokenChainId: (actualInputToken as any).chainId || vaultData.protocol.chainId }
        );
        console.log('[VaultInputs.tsx] getPathDataAndAmountOut result', result);
        tokenConversionAmount = result.amountOut;
      }

      const assetsConversionInUSD =
        (Number(assetsAmount) / 10 ** vaultData.inputToken.decimals) *
        vaultTokenPrice;

      const tokenConversionFromWei =
        Number(tokenConversionAmount) / 10 ** (inputToken?.decimals ?? 18);
      const tokenConversionInUSD = tokenConversionFromWei * inputTokenPrice;

      const slippageActualValue = Math.max(
        0,
        100 - (tokenConversionInUSD * 100) / assetsConversionInUSD,
      );

      const calculatedSlippageUSD =
        assetsConversionInUSD - tokenConversionInUSD;

      const slippageAmountInUSDFormatted = formatSlippageUSD(
        calculatedSlippageUSD,
      );

      if (inputAmountValue === debouncedInputBalance.value) {
        // Use formatTokenBalance for the output amount formatting
        const formattedOutputAmount = formatTokenBalance(
          tokenConversionFromWei,
          inputToken?.symbol || "",
        );

        setConversionOutput({
          slippageActualValue: Number(slippageActualValue.toFixed(2)),
          slippageAmountInUSDFormatted: slippageAmountInUSDFormatted,
          finalConvertedAmountInUSDFormatted: formatCurrency(
            assetsConversionInUSD,
          ).toString(),
          outputAmountFormatted: formattedOutputAmount,
          outputAmountInUSDFormatted:
            formatCurrency(tokenConversionInUSD).toString(),
        });
      }
      setLoadingOutputToken(false);
    },
    [
      activeChain?.id,
      debouncedInputBalance.value,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
      inputToken,
      userSlippage,
      userVaultBalance?.formatted,
    ],
  );

  const getDepositOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      if (isDeposit && Number(inputAmountValue) > Number(tokenBalance.value)) {
        setLoadingOutputToken(false);
        return;
      }

      if (!inputToken || !activeChain) {
        return;
      }
      // Early return if inputAmountValue is zero
      if (inputAmountValue === 0n) {
        setConversionOutput({
          slippageActualValue: 0,
          slippageAmountInUSDFormatted: formatUSDValue(0),
          finalConvertedAmountInUSDFormatted: formatUSDValue(0),
          outputAmountFormatted: "0",
          outputAmountInUSDFormatted: formatUSDValue(0),
          gasFeeInInputToken: "0",
          gasFeeInUSD: formatUSDValue(0),
          gasFeeInETH: formatUSDValue(0),
          netDepositToVaultUSD: formatUSDValue(0),
          inputAmountInUSDFormatted: formatUSDValue(0),
          swapSlippageUSD: formatUSDValue(0),
          depositSlippageUSD: formatUSDValue(0),
          swapSlippagePercentage: 0,
          depositSlippagePercentage: 0,
        });
        setLoadingOutputToken(false);
        return;
      }

      try {
        // Check cache first - look for existing calculation with same parameters
        const cached = useTransactionStore.getState().lastDepositCalculation;

        let calculationResult;

        if (
          cached &&
          isCachedCalculationValid(
            cached,
            inputAmountValue,
            vaultData.id,
            inputToken,
            activeChain.id,
          )
        ) {
          // Log cache performance stats periodically
          const stats = getCacheStats();
          if (stats.hits % 10 === 0) {
            // Log every 10th cache hit
            console.log("Cache Performance:", stats);
          }

          calculationResult = cached.result;
        } else {
          console.log("Cache miss - performing new deposit calculation");
          const inputTokenPrice = getTokenPrice(
            inputToken?.symbol,
            priceContext,
          );
          if (!inputTokenPrice) {
            return;
          }
          // Use the unified calculation function
          calculationResult = await calculateDepositOutput(
            inputAmountValue,
            vaultData,
            inputToken,
            activeChain,
            activeWallet,
            vaultTokenPrice,
            inputTokenPrice,
            gasTokenPrice,
            formatUSDAmount,
          );

          // Store result in cache for future use
          useTransactionStore.getState().setLastDepositCalculation({
            inputAmount: inputAmountValue.toString(),
            vaultId: vaultData.id,
            result: calculationResult,
            timestamp: Date.now(),
          });
        }

        // Helper function to format and set conversion output
        const formatAndSetConversionOutput = (result: any) => {
          const sharesAmountFormatted = formatShares(result.outputAmount, vaultData.inputToken.decimals);

          const outputAmountInUSD =
            (Number(result.outputAmount) /
              10 ** vaultData.inputToken.decimals) *
            vaultTokenPrice;

          if (inputAmountValue === debouncedInputBalance.value) {
            // Calculate net deposit amount (after gas fee and swap slippage, but before deposit slippage)
            const amountForStrategyInUSD =
              (Number(result.amountForStrategy) /
                10 ** vaultData.inputToken.decimals) *
              vaultTokenPrice;

            setConversionOutput({
              slippageActualValue: Number(
                result.totalSlippage.percentage.toFixed(2),
              ),
              slippageAmountInUSDFormatted: result.totalSlippage.amountInUSD,
              finalConvertedAmountInUSDFormatted:
                formatUSDValue(outputAmountInUSD),
              outputAmountFormatted: sharesAmountFormatted,
              outputAmountInUSDFormatted: formatUSDValue(outputAmountInUSD),
              gasFeeInInputToken: result.gasFee.amount.toString(),
              gasFeeInUSD: result.gasFee.amountInUSD,
              gasFeeInETH: result.gasFee.amountInETH,
              netDepositToVaultUSD: formatUSDValue(amountForStrategyInUSD),
              inputAmountInUSDFormatted: formatUSDValue(
                (Number(inputAmountValue) /
                  10 ** (inputToken?.decimals ?? 18)) *
                  inputTokenPrice,
              ),
              swapSlippageUSD: result.swapSlippage.amountInUSD,
              depositSlippageUSD: result.depositSlippage.amountInUSD,
              swapSlippagePercentage: result.swapSlippage.percentage,
              depositSlippagePercentage: result.depositSlippage.percentage,
            });
          }
        };

        // Use the helper function for both cached and new results
        formatAndSetConversionOutput(calculationResult);

        console.log("Unified Deposit Calculation Result:", {
          inputAmount: calculationResult.inputAmount.toString(),
          outputAmount: calculationResult.outputAmount.toString(),
          gasFee: calculationResult.gasFee.amount.toString(),
          swapSlippage: calculationResult.swapSlippage.amount.toString(),
          depositSlippage: calculationResult.depositSlippage.amount.toString(),
          needsTokenSwap: calculationResult.needsTokenSwap,
          needsGasFee: calculationResult.needsGasFee,
        });
      } catch (error) {
        console.error("Error in deposit calculation:", error);
        setOutputBoxErrorMessage("Error calculating deposit output");
      }

      setLoadingOutputToken(false);
    },
    [
      debouncedInputBalance.value,
      inputToken,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
      activeWallet,
      userSlippage,
      gasTokenPrice,
      priceContext,
      activeChain,
      tokenBalance.value,
    ],
  );

  const timeoutRef = useRef<NodeJS.Timeout>();

  const checkSlippageExceedingLimit = () => {
    // Calculate total slippage (swap + deposit)
    const totalSlippagePercentage =
      (conversionOutput.swapSlippagePercentage || 0) +
      (conversionOutput.depositSlippagePercentage || 0);

    // If slippage is over 100%, hide the display completely
    if (totalSlippagePercentage > 100) {
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage("");
      return;
    }

    if (
      userSlippage &&
      totalSlippagePercentage > 0 &&
      userSlippage < totalSlippagePercentage &&
      !(
        isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        inputBalance.value > 0n &&
        Number(
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
        ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""))
      )
    ) {
      setIsSlippageExceedingLimit(true);
      setOutputBoxErrorMessage(
        `Total slippage of ${totalSlippagePercentage.toFixed(2)}% exceeds your maximum slippage setting of ${userSlippage}%`,
      );
    } else {
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage("");
    }
  };

  // Ensure immediately change the conversion to 0 if user input is not valid
  useEffect(() => {
    if (loadingOutputToken) {
      setOutputBoxErrorMessage("");
      return;
    }
    if (
      !debouncedInputBalance.formatted ||
      Number(debouncedInputBalance.formatted) <= 0
    ) {
      setConversionOutput(initialConversionOutput);
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage("");
      return;
    }

    const isGasFeeSpecialCase =
      isDeposit &&
      !vaultData.depositFeePaidFromGasTank &&
      debouncedInputBalance.value > 0n &&
      Number(
        conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, "") ??
          0,
      ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, "") ?? 0);
    if (
      debouncedInputBalance.value > 0n &&
      Number(conversionOutput.outputAmountFormatted) === 0 &&
      !isGasFeeSpecialCase &&
      !loadingOutputToken &&
      conversionOutput.outputAmountFormatted !== "0.00"
    ) {
      console.log("Swap route not found - setting error message", {
        debouncedInputBalance: debouncedInputBalance.value.toString(),
        outputAmount: conversionOutput.outputAmountFormatted,
        isDeposit,
        isGasFeeSpecialCase,
        loadingOutputToken,
      });
      setOutputBoxErrorMessage("Swap route not found");
    } else if (!loadingOutputToken) {
      setOutputBoxErrorMessage("");
    }
  }, [
    conversionOutput.outputAmountFormatted,
    conversionOutput.inputAmountInUSDFormatted,
    conversionOutput.gasFeeInUSD,
    debouncedInputBalance,
    initialConversionOutput,
    isDeposit,
    loadingOutputToken,
    vaultData.depositFeePaidFromGasTank,
  ]);

  useEffect(() => {
    if (vaultData?.id && APY7DValue && Number(inputBalance.formatted) > 0) {
      const hasExistingData = useAPYStore
        .getState()
        .hasAPYChangeData(vaultData.id);
      if (!hasExistingData) {
        setPreviousAPY(vaultData.id, Number(APY7DValue));
        setActiveTransactionVault(vaultData.id);
      }
    }
  }, [
    vaultData?.id,
    APY7DValue,
    inputBalance.formatted,
    setPreviousAPY,
    setActiveTransactionVault,
  ]);

  // Reset input state after transaction completes or fails
  useEffect(() => {
    if (transactionCompleted) {
      if (vaultData?.id && APY7DValue) {
        setCurrentAPY(vaultData.id, Number(APY7DValue));
      }

      if (isDeposit) {
        setLastDepositInfo({
          inputAmount: displayValue,
          outputAmount: conversionOutput.outputAmountFormatted,
          inputSymbol: inputToken?.symbol || "",
          outputSymbol: vaultData.symbol,
        });
      } else {
        setLastWithdrawInfo({
          inputAmount: displayValue,
          outputAmount: conversionOutput.outputAmountFormatted,
          inputSymbol: vaultData.symbol,
          outputSymbol: inputToken?.symbol || vaultData.inputToken.symbol,
        });
      }

      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("0.00");
      setConversionOutput(initialConversionOutput);
      setOutputBoxErrorMessage("");
      setIsSlippageExceedingLimit(false);

      // Reset transactionCompleted to false after processing
      setTimeout(() => {
        setTransactionCompleted(false);
        if (isDeposit) {
          setLastDepositInfo(null);
        } else {
          setLastWithdrawInfo(null);
        }
      }, 1000);
    }
  }, [
    transactionCompleted,
    initialConversionOutput,
    setInputBalance,
    vaultData.id,
    displayValue,
    conversionOutput.outputAmountFormatted,
    inputToken?.symbol,
    vaultData.symbol,
    setTransactionCompleted,
    setLastDepositInfo,
    setLastWithdrawInfo,
    isDeposit,
    vaultData.inputToken.symbol,
    APY7DValue,
    setCurrentAPY,
  ]);

  useEffect(() => {
    if (!finishedTransaction) {
      setActiveTransactionVault(null);
    }
  }, [finishedTransaction, setActiveTransactionVault]);

  // Debounce the input balance in order to calculate the output amount
  useEffect(() => {
    setIsSlippageExceedingLimit(false);
    setOutputBoxErrorMessage("");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!inputBalance.formatted || Number(inputBalance.formatted) <= 0) {
      setConversionOutput(initialConversionOutput);
      setLoadingOutputToken(false);
      return;
    }
  }, [inputBalance, initialConversionOutput]);

  useEffect(() => {
    if (vaultData?.id) {
      const isTxIsInProggress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxIsInProggress) return;
    }
    if (
      !debouncedInputBalance.formatted ||
      Number(debouncedInputBalance.formatted) <= 0
    ) {
      setLoadingOutputToken(false);
      setConversionOutput(initialConversionOutput);
      return;
    }

    setLoadingOutputToken(true);

    if (isDeposit) getDepositOutputAmount(debouncedInputBalance.value);
    else getWithdrawOutputAmount(debouncedInputBalance.value);
  }, [
    debouncedInputBalance,
    inputToken,
    getDepositOutputAmount,
    getWithdrawOutputAmount,
    initialConversionOutput,
    isDeposit,
    vaultData,
  ]);

  // Clear cache when important parameters change
  useEffect(() => {
    clearDepositCalculationCache();
  }, [
    vaultData.id,
    inputToken?.address,
    activeChain?.id,
    userSlippage,
    clearDepositCalculationCache,
  ]);

  // Check slippage limits when conversion output changes
  useEffect(() => {
    checkSlippageExceedingLimit();
  }, [
    conversionOutput.swapSlippagePercentage,
    conversionOutput.depositSlippagePercentage,
    userSlippage,
    debouncedInputBalance.value,
    conversionOutput.inputAmountInUSDFormatted,
    conversionOutput.gasFeeInUSD,
    isDeposit,
    vaultData.depositFeePaidFromGasTank,
  ]);

  // Create an adapter function for InputTokenWithError in Deposit mode
  const handleDepositTokenSelect = (token: Token) => {
    // Call the token selection handler for deposit
    handleTokenSelect(token);
  };

  // Create an adapter function for InputTokenWithError in Withdraw mode
  const handleWithdrawTokenSelect = (token: Token) => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (isTxInProgress) return;
    // In withdraw mode, we still want to update the input token
    // This ensures proper token selection in both modes
    setInputToken(token);

    // Notify parent component about token selection
    if (onTokenSelect) {
      onTokenSelect(token);
    }
  };

  useEffect(() => {
    if (
      !loadingOutputToken &&
      conversionOutput.outputAmountFormatted !== "0" &&
      Number(debouncedInputBalance.value) > 0n
    ) {
      trackEvent("Estimated Output Calculated", {
        isDeposit,
        inputAmount: inputBalance.formatted,
        outputAmount: conversionOutput.outputAmountFormatted,
        outputAmountUSD: conversionOutput.outputAmountInUSDFormatted,
        slippagePercent:
          (conversionOutput.swapSlippagePercentage || 0) +
          (conversionOutput.depositSlippagePercentage || 0),
        inputToken: inputToken?.symbol,
        outputToken: isDeposit ? vaultData.symbol : inputToken?.symbol,
        vaultAddress: vaultData.id,
      });
    }
  }, [
    loadingOutputToken,
    conversionOutput,
    debouncedInputBalance,
    inputBalance.formatted,
    inputToken?.symbol,
    isDeposit,
    vaultData,
  ]);

  const minReceived = useMemo(() => {
    if (!conversionOutput.outputAmountInUSDFormatted) return "0.0";

    const expectedOutputUSD = parseFloat(
      conversionOutput.outputAmountInUSDFormatted.replace(/[^0-9.]/g, ""),
    );
    const slippageDecimal = userSlippage / 100;

    const calculatedMinReceived = expectedOutputUSD * (1 - slippageDecimal);

    return formatUSDValue(calculatedMinReceived);
  }, [conversionOutput.outputAmountInUSDFormatted, userSlippage]);

  return (
    <>
      <div className="mb-4 md:mb-0">
        <div className="relative flex items-center">
          {isDeposit && !vaultData.depositFeePaidFromGasTank && (
            <div className="absolute top-4">
              <InfoBlock iconColor="#FFC700">
                💡 For Ethereum Vaults, Ethereum gas fees are deducted directly
                from your deposit amount and are not covered by Amana.
              </InfoBlock>
            </div>
          )}
          <TabSelector
            availableTabs={["Invest", "Withdraw"]}
            activeTab={isDeposit ? "Invest" : "Withdraw"}
            setActiveTab={handleTabChange}
          />

          <div className="hidden md:block absolute top-0 right-0 z-30 mt-3">
            <SlippageSettingsBlock
              setInputBalance={setInputBalance}
              vaultId={vaultData.id}
              showTransactionSettings={isSlippageExceedingLimit}
            />
          </div>
        </div>

        <div className="flex flex-row relative md:hidden mt-4 justify-end">
          {isDeposit && !vaultData.depositFeePaidFromGasTank && (
            <div className="absolute top-1 right-8">
              <InfoBlock iconColor="#FFC700" isRight>
                💡 For Ethereum Vaults, Ethereum gas fees are deducted directly
                from your deposit amount and are not covered by Amana.
              </InfoBlock>
            </div>
          )}
          <SlippageSettingsBlock
            setInputBalance={setInputBalance}
            vaultId={vaultData.id}
            showTransactionSettings={isSlippageExceedingLimit}
          />
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {isDeposit ? (
          <motion.div
            key="deposit-tab-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {onSelectChain && vaultId && isDeposit && (
              <div className="mb-4">
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelectChain={onSelectChain}
                  vaultId={vaultId}
                  vaultData={vaultData}
                  onSelectChainAndToken={handleSelectChainAngToken}
                />
              </div>
            )}

            <InputTokenWithError
              onSelectChain={onSelectChain}
              onSelectChainAndToken={handleSelectChainAngToken}
              onSelectToken={isDeposit ? handleDepositTokenSelect : () => {}}
              allowInput={allowInput}
              vaultData={vaultData}
              onMaxClick={handleMaxClick}
              value={displayValue}
              onChange={handleChangeInput}
              selectedChain={selectedChain}
              selectedToken={isDeposit ? inputToken : vaultData.inputToken}
              inputTokenbalance={
                isDeposit
                  ? tokenBalance.formatted
                  : (vaultTotalAssetinToken?.totalAssetsinToken?.toString() ??
                    "0.00")
              }
              errorMessage={errorMessage}
              tokenList={isDeposit ? tokenList : []}
              disabled={loadingOutputToken}
              isDeposit={isDeposit}
              loadingOutputToken={loadingOutputToken}
              conversionOutput={conversionOutput}
              isSlippageExceedingLimit={isSlippageExceedingLimit}
              setInputBalance={setInputBalance}
              isOutput={false}
              captionText={!isDeposit ? "Output Amount" : ""}
            />
            <SwapSlippageBlock
              conversionOutput={conversionOutput}
              isVisible={
                !!conversionOutput.swapSlippageUSD
              }
              isBreathing={loadingOutputToken}
            />
            <div className="my-4">
              <FeeDisplay
                isDeposit={isDeposit}
                vaultData={vaultData}
                conversionOutput={conversionOutput}
                debouncedInputBalance={inputBalance}
                performanceFee={performanceFee}
                isBreathing={loadingOutputToken}
              />
            </div>
            <NetDepositBlock
              conversionOutput={conversionOutput}
              vaultData={vaultData}
              debouncedInputBalance={inputBalance}
              isDeposit={isDeposit}
              isVisible={true}
              isBreathing={loadingOutputToken}
            />
            <DepositSlippageBlock
              conversionOutput={conversionOutput}
              isVisible={
                !!conversionOutput.depositSlippageUSD
              }
              isBreathing={loadingOutputToken}
            />

            <div className="mb-4">
              {onSelectChain && vaultId && !isDeposit && (
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelectChain={onSelectChain}
                  vaultId={vaultId}
                  vaultData={vaultData}
                  onSelectChainAndToken={handleSelectChainAngToken}
                />
              )}
            </div>

            <InputTokenWithError
              onSelectChain={onSelectChain}
              onSelectChainAndToken={handleSelectChainAngToken}
              captionText={isDeposit ? "Output Amount" : ""}
              onSelectToken={isDeposit ? () => {} : handleWithdrawTokenSelect}
              allowInput={allowInput}
              vaultData={vaultData}
              onMaxClick={() => {}}
              value={conversionOutput.outputAmountFormatted}
              onChange={() => {}}
              selectedChain={selectedChain}
              selectedToken={isDeposit ? vaultData.inputToken : inputToken}
              inputTokenbalance={
                isDeposit
                  ? (vaultTotalAssetinToken?.totalAssetsinToken?.toString() ??
                    "0.00")
                  : tokenBalance.formatted
              }
              errorMessage={!errorMessage ? outputBoxErrorMessage : ""}
              tokenList={isDeposit ? [] : tokenList}
              disabled={loadingOutputToken}
              isDeposit={isDeposit}
              isOutput={true}
              loadingOutputToken={loadingOutputToken}
              conversionOutput={conversionOutput}
              setInputBalance={setInputBalance}
            />
          </motion.div>
        ) : (
          <motion.div
            key="withdraw-tab-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {onSelectChain && vaultId && isDeposit && (
              <div className="mb-4">
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelectChain={onSelectChain}
                  onSelectChainAndToken={handleSelectChainAngToken}
                  vaultId={vaultId}
                  vaultData={vaultData}
                />
              </div>
            )}

            <InputTokenWithError
              onSelectChain={onSelectChain}
              onSelectChainAndToken={handleSelectChainAngToken}
              onSelectToken={isDeposit ? handleDepositTokenSelect : () => {}}
              allowInput={allowInput}
              vaultData={vaultData}
              onMaxClick={handleMaxClick}
              value={displayValue}
              onChange={handleChangeInput}
              selectedChain={selectedChain}
              selectedToken={isDeposit ? inputToken : vaultData.inputToken}
              inputTokenbalance={
                isDeposit
                  ? tokenBalance.formatted
                  : (vaultTotalAssetinToken?.totalAssetsinToken?.toString() ??
                    "0.00")
              }
              errorMessage={errorMessage}
              tokenList={isDeposit ? tokenList : []}
              disabled={loadingOutputToken}
              isDeposit={isDeposit}
              loadingOutputToken={loadingOutputToken}
              conversionOutput={conversionOutput}
              isSlippageExceedingLimit={isSlippageExceedingLimit}
              setInputBalance={setInputBalance}
              isOutput={false}
              captionText={!isDeposit ? "Output Amount" : ""}
            />
            <div className="mb-6 md:mb-10"></div>
            <div className="mb-4">
              {onSelectChain && vaultId && !isDeposit && (
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelectChain={onSelectChain}
                  vaultId={vaultId}
                  vaultData={vaultData}
                  onSelectChainAndToken={handleSelectChainAngToken}
                />
              )}
            </div>
            <InputTokenWithError
              onSelectChain={onSelectChain}
              onSelectChainAndToken={handleSelectChainAngToken}
              captionText={isDeposit ? "Output Amount" : ""}
              onSelectToken={isDeposit ? () => {} : handleWithdrawTokenSelect}
              allowInput={allowInput}
              vaultData={vaultData}
              onMaxClick={() => {}}
              value={conversionOutput.outputAmountFormatted}
              onChange={() => {}}
              selectedChain={selectedChain}
              selectedToken={isDeposit ? vaultData.inputToken : inputToken}
              inputTokenbalance={
                isDeposit
                  ? (vaultTotalAssetinToken?.totalAssetsinToken?.toString() ??
                    "0.00")
                  : tokenBalance.formatted
              }
              errorMessage={!errorMessage ? outputBoxErrorMessage : ""}
              tokenList={isDeposit ? [] : tokenList}
              disabled={loadingOutputToken}
              isDeposit={isDeposit}
              isOutput={true}
              loadingOutputToken={loadingOutputToken}
              conversionOutput={conversionOutput}
              setInputBalance={setInputBalance}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <APYChangeCard
        isDeposit={isDeposit}
        minReceived={minReceived}
        APYValue={APY7DValue}
        vaultId={vaultId}
      />

      {!(
        isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        conversionOutput.gasFeeInInputToken &&
        inputBalance.value > 0n &&
        Number(
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
        ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""))
      ) && (
        <InteractionContainer
          step={step}
          setStep={setStep}
          action={action}
          setAction={setAction}
          _inputToken={inputToken}
          _inputBalance={inputBalance}
          vaultData={vaultData}
          setTransactionCompleted={setTransactionCompleted}
          activeChain={selectedChain as Chain}
          _action={steps[0]}
          actions={steps}
          setInputBalance={setInputBalance}
          errorMessage={errorMessage || outputBoxErrorMessage || ""}
          isDeposit={isDeposit}
          refreshBalance={fetchBalance}
          hideStepsDisplay={true}
          setLabel={setLabel}
          label={label}
          outputAmountFormatted={conversionOutput.outputAmountFormatted}
        />
      )}
    </>
  );
}
