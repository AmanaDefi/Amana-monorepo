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
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import {
  determineVaultTokenFromApprovedTokens,
  formatCurrency,
  getCurrentSlippage,
  getVaultErrorMessage,
  isZetachain,
  selectActions,
  convertUsdToEth,
  getOnlyTokenSymbol,
  bigIntReviver,
  bigIntReplacer,
} from "@/utils/utils";
import InteractionContainer from "./interactAPI";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import {
  getPathDataAndAmountOut,
  getPerformanceFee,
  getSharesFromDeposit,
} from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { calculateGasFeeInVaultAsset } from "@/utils/gasFeeCalculations";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from "@/utils/trackEvent";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import ResponsiveTooltip from "@/components/common/Tooltip";
import {
  CheckTheTxIsInProgress,
  getLocalStorageObject,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import DepositModalArrowsIcon from "./svg/DepositModalArrowsIcon";
import ErrorInputIcon from "./svg/ErrorInputIcon";
import { InfoBlock } from "./VaultsWrapper/components/InfoBlock.tsx";
import { getPublicClient } from "@/utils/getPublicClient";
import { ZRC20_TOKENS_BY_ADDRESS } from "@/constants/ZRC20TokensByAddress";
import { useChain } from "@account-kit/react";
import ChainSelector from "./VaultsDetailsWrapper/components/ChainSelector";
import SlippageSettingsBlock from "./VaultsDetailsWrapper/components/SlippageSettingsBlock";
import FeeDisplay from "./VaultsDetailsWrapper/components/FeeDisplay";
import APYChangeCard from "./VaultsDetailsWrapper/components/APYChangeCard";

// Helper function for formatting token balances based on token type
const formatTokenBalance = (
  balance: string | number,
  symbol: string,
): string => {
  const num = Math.max(0, Number(balance));
  // Check if token is a stablecoin
  const isStablecoin =
    symbol?.includes("USD") ||
    symbol?.includes("DAI") ||
    symbol?.includes("USDT") ||
    symbol?.includes("USDC") ||
    symbol?.includes("BUSD");
  // Format with 2 decimal places for stablecoins, 4 for others
  const decimals = isStablecoin ? 2 : 4;
  return parseFloat(num.toFixed(decimals)).toString();
};

// When displaying USD value for outputs or net deposits, ensure it's never negative
const formatUSDValue = (value: number): string => {
  return formatCurrency(Math.max(0, value));
};

export interface VaultInputsProps {
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalance?: Balance;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken;
  transactionCompleted: boolean;
  initialIsDeposit?: boolean;
  onTokenSelect?: (token: Token) => void;
  selectedToken?: Token;
  selectedChain?: Chain | null;
  onSelectChain?: (chain: Chain) => void;
  vaultId: string;
  isDeposit: boolean;
  onTabChange: (tab: string) => void;
}

export type ConversionOutput = {
  slippageActualValue: number | null;
  finalConvertedAmountInUSDFormatted: string;
  outputAmountFormatted: string;
  outputAmountInUSDFormatted: string;
  gasFeeInVaultAsset?: string;
  gasFeeInUSD?: string;
  gasFeeInETH?: string;
  netDepositToVaultUSD?: string;
  inputAmountInUSDFormatted?: string;
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
  selectedChain,
  onSelectChain,
  vaultId,
  isDeposit,
  onTabChange,
}: VaultInputsProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [inputToken, setInputToken] = useState<Token>();
  const [inputBalance, setInputBalance] = useState<Balance>(EMPTY_BALANCE);
  const [displayValue, setDisplayValue] = useState<string>("");
  const [debouncedInputBalance, setDebouncedInputBalance] =
    useState<Balance>(EMPTY_BALANCE);
  const [isSlippageExceedingLimit, setIsSlippageExceedingLimit] =
    useState<boolean>(true);
  const [outputBoxErrorMessage, setOutputBoxErrorMessage] =
    useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [allowInput, setAllowInput] = useState<boolean>(false);
  const [label, setLabel] = useState(isDeposit ? "Invest" : "Withdraw");

  // Update label when isDeposit prop changes
  useEffect(() => {
    setLabel(isDeposit ? "Invest" : "Withdraw");
  }, [isDeposit]);

  const [steps, setSteps] = useState<Action[]>([]);
  const [step, setStep] = useState<number>(0);
  const [action, setAction] = useState<Action>(steps[0]);
  const [performanceFee, setPerformanceFee] = useState<number>(0);

  useEffect(() => {
    async function handlePerformanceFee() {
      const perfFee = await getPerformanceFee(
        vaultData.id,
        SUPPORTED_CHAINS[0].chain.id,
      );
      const percentagePerformanceFee = Number((perfFee / 100).toFixed(2));
      setPerformanceFee(percentagePerformanceFee);
    }
    if (vaultData) {
      handlePerformanceFee();
    }
  }, [vaultData]);

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
            JSON.parse(TxInfo?.inputBal, bigIntReviver)?.formatted ?? "",
          );
        }
      }
    }
  }, [vaultData.id]);

  const initialConversionOutput: ConversionOutput = useMemo(
    () => ({
      slippageActualValue: null,
      finalConvertedAmountInUSDFormatted: "0",
      outputAmountFormatted: "0",
      outputAmountInUSDFormatted: "0",
    }),
    [],
  );

  const [loadingOutputToken, setLoadingOutputToken] = useState(false);
  const [conversionOutput, setConversionOutput] = useState<ConversionOutput>(
    initialConversionOutput,
  );

  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;
  const { chain: activeChain } = useChain();

  const inputTokenPrice = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol);
  const ethPriceUsd = useTokenPriceBySymbol("ETH");

  const vaultToken: Token = useMemo(() => {
    return {
      symbol: vaultData.symbol,
      decimals: vaultData.inputToken.decimals,
      address: vaultData.id,
      imgURL: "",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    };
  }, [vaultData.id, vaultData.inputToken.decimals, vaultData.symbol]);

  useEffect(() => {
    const setToken = () => {
      if (
        selectedChain &&
        (selectedChain.id === 7001 || selectedChain.id === 7000) &&
        vaultData?.inputToken
      ) {
        setInputToken(vaultData.inputToken);
      } else if (vaultData?.inputToken && selectedChain) {
        const tokens = APPROVED_TOKENS[selectedChain.id] || [];
        const defaultToken =
          tokens.find((token) => token.symbol === "USDC") || tokens[0];

        if (defaultToken) {
          setInputToken(defaultToken);
          if (onTokenSelect) {
            onTokenSelect(defaultToken);
          }
        }
      }
    };

    if (vaultData?.id) {
      const vaultInfo = getLocalStorageObject(vaultData?.id);
      const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);

      if (isTxInProgress && vaultInfo?.selectedToken) {
        setInputToken(JSON.parse(vaultInfo.selectedToken, bigIntReviver));
      } else {
        setInputToken(undefined);
        setToken();
      }
    } else {
      setInputToken(undefined);
      setToken();
    }

    setAllowInput(true);
  }, [selectedChain?.id, vaultData, onTokenSelect]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const { balance: tokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  // Reset token when chain changes to prevent cross-chain token errors
  useEffect(() => {
    // Clear token selection and balance when the active chain changes
    // This prevents the app from attempting to use a token from the previous chain
    // which could cause AbiDecodingZeroDataError when fetching token balances
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);

    if (selectedChain?.id && !isTxInProgress) {
      setInputBalance(EMPTY_BALANCE);
      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
      });
    }
  }, [selectedChain?.id, vaultData.id]);

  // Force refresh token balance when token or chain changes
  useEffect(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (inputToken && selectedChain && !isTxInProgress) {
      fetchBalance();
      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("");

      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
        displayValue: "",
      });
    }
  }, [inputToken, selectedChain, fetchBalance, vaultData.id]);

  // Trigger error message handling
  useEffect(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (inputToken && vaultTotalAssetinToken && !isTxInProgress) {
      if (isDeposit) {
        // For Ethereum vaults, use net deposit amount for validation
        // For other vaults, use input amount
        const amountToValidate = !vaultData.depositFeePaidFromGasTank 
          ? conversionOutput.netDepositToVaultUSD?.replace(/[^0-9.]/g, '') || inputBalance.formatted
          : inputBalance.formatted;
        
        const priceToUse = !vaultData.depositFeePaidFromGasTank 
          ? 1 // netDepositToVaultUSD is already in USD
          : inputTokenPrice;

        setErrorMessage(
          getVaultErrorMessage(
            amountToValidate,
            tokenBalance.formatted,
            steps,
            vaultData,
            priceToUse,
            isDeposit
          )
        );
      } else {
        setErrorMessage(
          getVaultErrorMessage(
            inputBalance.formatted,
            vaultTotalAssetinToken.toString(),
            steps,
            vaultData,
            vaultTokenPrice,
            isDeposit
          )
        );
      }
    } else if (loadingOutputToken) {
      // Clear error message while loading
      setErrorMessage("");
    }
  }, [
    inputToken,
    inputBalance,
    isDeposit,
    vaultData.id,
    action,
    vaultTotalAssetinToken,
    steps,
    inputTokenPrice,
    vaultTokenPrice,
    conversionOutput.netDepositToVaultUSD,
    loadingOutputToken,
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
    setDisplayValue("");
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

  const switchTokens = async () => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (isTxInProgress) return;
    // Get the opposite tab of what's currently in the URL
    const newTab = isDeposit ? "withdraw" : "invest";

    // Update URL - React will handle state update via the useEffect
    handleTabChange(newTab);
  };

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!inputToken) return;
      const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
      if (isTxInProgress) return;

      let value = e.currentTarget.value;

      // Special case for empty input
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

      // Special case for "0." - keep the leading zero for decimal inputs
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

      // Format the number properly
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
    [inputToken, inputTokenPrice, isDeposit, vaultToken.decimals, vaultData.id],
  );

  const handleMaxClick = useCallback(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);

    if (!inputToken || isTxInProgress) return;

    if (isDeposit) {
      setInputBalance(tokenBalance);
      setDisplayValue(tokenBalance.formatted);
      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(tokenBalance, bigIntReplacer),
        displayValue: tokenBalance.formatted,
      });
    } else {
      handleChangeInput({
        currentTarget: { value: vaultTotalAssetinToken?.toString() },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [
    handleChangeInput,
    inputToken,
    tokenBalance,
    isDeposit,
    vaultTotalAssetinToken,
    vaultData.id,
  ]);

  const tokenList = useMemo(() => {
    let tokens: Token[] = [];

    if (!selectedChain?.id) {
      console.log("VaultInputs - No selectedChain, returning empty array");
      return [];
    }

    if (selectedChain.id === 7001 || selectedChain.id === 7000) {
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

  // ... (інші методи getWithdrawOutputAmount, getDepositOutputAmount і т.д. залишаються без змін)

  const getWithdrawOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      // 🔄 NEW LOGIC: Input is now in underlying asset terms, not shares
      // So we don't need to convert from shares to assets - the input IS the asset amount
      let assetsAmount = inputAmountValue;
      
      const actualInputToken = isZetachain(activeChain?.id as number)
        ? inputToken
        : inputToken?.ZRC20equivalent;
      if (!actualInputToken) return;

      let tokenConversionAmount = assetsAmount;
      if (actualInputToken.address !== vaultData.inputToken.address) {
         const result = await getPathDataAndAmountOut(
          assetsAmount,
          vaultData.inputToken,
          actualInputToken,
          vaultData.id as Address,
          getCurrentSlippage() * 100
        );
        tokenConversionAmount = result.amountOut
      }

      const assetsConversionInUSD =
        (Number(assetsAmount) / 10 ** vaultData.inputToken.decimals) *
        vaultTokenPrice;
      const tokenConversionFromWei =
        Number(tokenConversionAmount) / 10 ** (inputToken?.decimals ?? 18);
      const tokenConversionInUSD = tokenConversionFromWei * inputTokenPrice;

      const slippageActualValue = Math.max(
        0,
        100 - (tokenConversionInUSD * 100) / assetsConversionInUSD
      );

      if (inputAmountValue === debouncedInputBalance.value) {
        // Use formatTokenBalance for the output amount formatting
        const formattedOutputAmount = formatTokenBalance(
          tokenConversionFromWei,
          inputToken?.symbol || ""
        );

        setConversionOutput({
          slippageActualValue: Number(slippageActualValue.toFixed(2)),
          finalConvertedAmountInUSDFormatted: formatCurrency(
            assetsConversionInUSD
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
      inputToken?.ZRC20equivalent,
      inputToken?.address,
      inputToken?.decimals,
      inputToken?.symbol,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
    ]
  );
  
    const getDepositOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      const actualInputToken = isZetachain(activeChain?.id as number)
        ? inputToken
        : inputToken?.ZRC20equivalent;
      
      if (!actualInputToken) {
        return;
      }

      let assetsConversionAmount: bigint = inputAmountValue;
      
      // Step 1: Convert input token to vault token if needed
      if (actualInputToken.address !== vaultData.inputToken.address) {
        const result = await getPathDataAndAmountOut(
          inputAmountValue,
          actualInputToken,
          vaultData.inputToken,
          vaultData.id as Address,
          getCurrentSlippage() *100
        );
        assetsConversionAmount = result.amountOut;
      }

      // Step 2: Calculate gas fee if needed (using centralized helper)
      const gasFeeResult = await calculateGasFeeInVaultAsset(
        vaultData,
        actualInputToken,
        activeChain as Chain,
        vaultTokenPrice,
        ethPriceUsd,
        formatCurrency,
        convertUsdToEth
      );

      const gasFeeInVaultAsset = gasFeeResult.gasFeeInVaultAsset;
      const gasFeeInUSD = gasFeeResult.gasFeeInUSD;
      const gasFeeInETH = gasFeeResult.gasFeeInETH;
      let netDepositToVaultUSD = "0";

      // Step 3: Subtract gas fee from converted amount
      const beforeGasDeduction = assetsConversionAmount;
      const finalConvertedAmount =
        assetsConversionAmount > gasFeeInVaultAsset
          ? assetsConversionAmount - gasFeeInVaultAsset
          : BigInt(0);

      // Step 4: Convert final amount to shares
      const sharesAmountRaw = await getSharesFromDeposit(
        finalConvertedAmount,
        vaultData
      );
      
      // Use formatTokenBalance for the output amount formatting
      const sharesAmountFormatted = formatTokenBalance(
        sharesAmountRaw, 
        vaultData.symbol
      );
      const inputAmountValueInUSD =
        (Number(inputAmountValue) / 10 ** (inputToken?.decimals ?? 18)) *
        inputTokenPrice;
      const finalConvertedAmountInUSD =
        (Number(finalConvertedAmount) / 10 ** vaultData.inputToken.decimals) *
        vaultTokenPrice;
      const finalConvertedAmountInUSDFormatted = formatCurrency(
        finalConvertedAmountInUSD
      ).toString();

      // Calculate slippage excluding gas fee
      const slippageActualValue = Math.max(
        0,
        100 - (finalConvertedAmountInUSD * 100) / inputAmountValueInUSD
      );

      if (!vaultData.depositFeePaidFromGasTank && gasFeeInVaultAsset > 0n) {
        const totalLossUSD = inputAmountValueInUSD - finalConvertedAmountInUSD;
        const gasFeeUSD = parseFloat(gasFeeInUSD.replace(/[^0-9.]/g, ''));
        const gasFeeETH = parseFloat(gasFeeInETH);
        const swapLossUSD = totalLossUSD - gasFeeUSD;
      }

      if (inputAmountValue === debouncedInputBalance.value) {
        setConversionOutput({
          slippageActualValue: Number(slippageActualValue.toFixed(2)),
          finalConvertedAmountInUSDFormatted: formatUSDValue(finalConvertedAmountInUSD),
          outputAmountFormatted: sharesAmountFormatted,
          outputAmountInUSDFormatted: formatUSDValue(finalConvertedAmountInUSD),
          gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
          gasFeeInUSD,
          gasFeeInETH,
          netDepositToVaultUSD: formatUSDValue(finalConvertedAmountInUSD),
          inputAmountInUSDFormatted: formatUSDValue(inputAmountValueInUSD),
        });
      }
      setLoadingOutputToken(false);
    },
    [
      activeChain?.id,
      debouncedInputBalance.value,
      inputToken?.ZRC20equivalent,
      inputToken?.address,
      inputToken?.decimals,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
      ethPriceUsd,
    ]
  );

  const timeoutRef = useRef<NodeJS.Timeout>();

  const checkSlippageExceedingLimit = () => {
    const userSlippage = getCurrentSlippage();

    // If slippage is over 100%, hide the display completely
    if (
      conversionOutput.slippageActualValue !== null &&
      conversionOutput.slippageActualValue > 100
    ) {
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage("");
      return;
    }

    if (
      userSlippage &&
      conversionOutput.slippageActualValue !== null &&
      userSlippage < conversionOutput.slippageActualValue &&
      !(
        isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        debouncedInputBalance.value > 0n &&
        Number(
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
        ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""))
      )
    ) {
      setIsSlippageExceedingLimit(true);
      setOutputBoxErrorMessage(
        `Slippage of ${conversionOutput.slippageActualValue}% exceeds your maximum slippage setting of ${userSlippage}%`,
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
    if (!inputBalance.formatted || Number(inputBalance.formatted) <= 0) {
      setConversionOutput(initialConversionOutput);
      setDebouncedInputBalance(inputBalance);
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage("");
      return;
    }

    if (
      inputBalance.value > 0n &&
      Number(conversionOutput.outputAmountFormatted) == 0 &&
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
      console.log(
        "Swap route not found",
        inputBalance.value,
        Number(conversionOutput.outputAmountFormatted),

        isDeposit,
        !vaultData.depositFeePaidFromGasTank,
        debouncedInputBalance,
        Number(
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, "") ??
            0,
        ),
        Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, "") ?? 0),
      );
      setOutputBoxErrorMessage("Swap route not found");
    }
  }, [
    conversionOutput,
    inputBalance,
    debouncedInputBalance,
    initialConversionOutput,
    isDeposit,
    loadingOutputToken,
    vaultData.depositFeePaidFromGasTank,
  ]);

  // Reset input state after transaction completes or fails
  useEffect(() => {
    if (transactionCompleted) {
      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("");
      setConversionOutput(initialConversionOutput);
      setDebouncedInputBalance(EMPTY_BALANCE);
      setOutputBoxErrorMessage("");
      setIsSlippageExceedingLimit(false);
      
      // Reset transactionCompleted to false after processing
      setTimeout(() => {
        setTransactionCompleted(false);
      }, 1000);
    }
  }, [
    transactionCompleted,
    initialConversionOutput,
    setInputBalance,
    vaultData.id,
  ]);

  // Debounce the input balance in order to calculate the output amount
  useEffect(() => {
    setIsSlippageExceedingLimit(false);
    setOutputBoxErrorMessage("");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (!inputBalance.formatted || Number(inputBalance.formatted) <= 0) {
      setConversionOutput(initialConversionOutput);
      setDebouncedInputBalance(inputBalance);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedInputBalance(inputBalance);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
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
        slippagePercent: conversionOutput.slippageActualValue,
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


  return (
    <>
      {/* Add prominent message about gas fees for Ethereum vaults */}
      {isDeposit && !vaultData.depositFeePaidFromGasTank && (
        <div className="bg-yellow-900/30 border border-yellow-500 py-3 px-4 rounded-lg mb-5">
          <p className="text-yellow-400 flex items-center">
            <span className="font-normal">
              For Ethereum Vaults, Ethereum gas fees are deducted directly from
              your deposit amount and are not covered by Amana.
            </span>
          </p>
        </div>
      )}
      <TabSelector
        availableTabs={["Invest", "Withdraw"]}
        activeTab={isDeposit ? "Invest" : "Withdraw"}
        setActiveTab={handleTabChange}
      />
      
      {/* Persistent instant withdrawal limit message */}
      {!isDeposit && vaultData.maxWithdraw && vaultData.maxWithdraw < 1000000 && (
        <div className="bg-orange-900/30 border border-orange-500 py-2 px-4 rounded-lg mb-4">
          <p className="text-orange-400 text-sm">
            <span className="font-medium">Instant withdraw limit of ${vaultData.maxWithdraw.toLocaleString()}</span>
          </p>
        </div>
      )}
      
      <InputTokenWithError
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
            : (vaultTotalAssetinToken?.toString() ?? "0")
        }
        errorMessage={errorMessage}
        tokenList={isDeposit ? tokenList : []}
        disabled={false}
        isDeposit={isDeposit}
        loadingOutputToken={loadingOutputToken}
        conversionOutput={conversionOutput}
        isSlippageExceedingLimit={isSlippageExceedingLimit}
        setInputBalance={setInputBalance}
        isOutput={false}
        captionText={!isDeposit ? "Output Amount" : ""}
      />
      <div className="w-full my-6 md:my-10 flex items-center justify-center">
        <button className="group flex-center p-2" onClick={switchTokens}>
          <DepositModalArrowsIcon width={24} height={24} />
        </button>
      </div>
      <div className="mb-6 md:mb-10">
        <FeeDisplay
          isDeposit={isDeposit}
          vaultData={vaultData}
          conversionOutput={conversionOutput}
          debouncedInputBalance={debouncedInputBalance}
          performanceFee={performanceFee}
        />
      </div>

      <div className="mb-4">
        {selectedChain && onSelectChain && vaultId && !isDeposit && (
          <ChainSelector
            selectedChain={selectedChain}
            onSelectChain={onSelectChain}
            vaultId={vaultId}
          />
        )}
      </div>

      <InputTokenWithError
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
            ? (vaultTotalAssetinToken?.toString() ?? "0")
            : tokenBalance.formatted
        }
        errorMessage={!errorMessage ? outputBoxErrorMessage : ""}
        tokenList={isDeposit ? [] : tokenList}
        disabled={false}
        isDeposit={isDeposit}
        isOutput={true}
        loadingOutputToken={loadingOutputToken}
        conversionOutput={conversionOutput}
        setInputBalance={setInputBalance}
      />
      {!!isDeposit && <APYChangeCard />}

      {inputToken &&
        !loadingOutputToken &&
        !(
          isDeposit &&
          !vaultData.depositFeePaidFromGasTank &&
          conversionOutput.gasFeeInVaultAsset &&
          debouncedInputBalance.value > 0n &&
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
          />
        )}
    </>
  );
}
