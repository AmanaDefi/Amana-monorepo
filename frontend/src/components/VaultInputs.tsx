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
import { parseUnits } from "viem";
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
  getAmountOutFromSwap,
  getAssetsFromShares,
  getPerformanceFee,
  getSharesFromDeposit,
} from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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
  return num.toFixed(decimals);
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
  selectedChain?: Chain; 
  onSelectChain?: (chain: Chain) => void; 
  vaultId: string; 
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
}: VaultInputsProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [inputToken, setInputToken] = useState<Token>();
  const [inputBalance, setInputBalance] = useState<Balance>(EMPTY_BALANCE);
  const [displayValue, setDisplayValue] = useState<string>("");
  const [debouncedInputBalance, setDebouncedInputBalance] =
    useState<Balance>(EMPTY_BALANCE);
  const [isDeposit, setIsDeposit] = useState<boolean>(initialIsDeposit);
  const [isSlippageExceedingLimit, setIsSlippageExceedingLimit] =
    useState<boolean>(true);
  const [outputBoxErrorMessage, setOutputBoxErrorMessage] =
    useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [allowInput, setAllowInput] = useState<boolean>(false);

  // Use searchParams to directly determine tab state
  const searchParams = useSearchParams();

  // Update isDeposit when URL tab parameter changes
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
  }, [searchParams, vaultData.id]);


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
      if (selectedToken) {
        setInputToken(selectedToken);
      } else if (
        selectedChain &&
        (selectedChain.id === 7001 || selectedChain.id === 7000) &&
        vaultData?.inputToken
      ) {
        setInputToken(vaultData.inputToken);
      } else if (vaultData?.inputToken && selectedChain) {
        const token = determineVaultTokenFromApprovedTokens(
          selectedChain.id as number,
          vaultData.inputToken,
        );
        setInputToken(token);
      }
    };

    if (vaultData?.id) {
      const vaultInfo = getLocalStorageObject(vaultData.id);
      const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
      if (isTxInProgress && vaultInfo?.selectedToken) {
        setInputToken(JSON.parse(vaultInfo.selectedToken, bigIntReviver));
      } else {
        setToken();
      }
    } else {
      setToken();
    }

    setAllowInput(true);
  }, [selectedChain, vaultData, selectedToken]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const { balance: tokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  // Reset token when chain changes to prevent cross-chain token errors
  useEffect(() => {
    // Clear token selection and balance when the active chain changes
    // This prevents the app from attempting to use a token from the previous chain
    // which could cause AbiDecodingZeroDataError when fetching token balances
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);

    if (selectedChain?.id && !isTxInProgress) {
      setInputBalance(EMPTY_BALANCE);
      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
      });
    }
  }, [selectedChain?.id, vaultData.id]);

  // Force refresh token balance when token or chain changes
  useEffect(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
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
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
    if (inputToken && vaultTotalAssetinToken && !isTxInProgress) {
      if (isDeposit) {
        setErrorMessage(
          getVaultErrorMessage(
            inputBalance.value.toString(),
            tokenBalance.value.toString(),
            steps,
          ),
        );
      } else {
        setErrorMessage(
          getVaultErrorMessage(
            inputBalance.formatted,
            vaultTotalAssetinToken.toString(),
            steps,
          ),
        );
      }
    }
  }, [
    inputToken,
    inputBalance,
    isDeposit,
    vaultData.id,
    action,
    vaultTotalAssetinToken,
    steps,
    tokenBalance.value,
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

    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
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
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
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
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
    if (isTxInProgress) return;

    localStorage.removeItem(vaultData.id);
    const newIsDeposit = tab.toLowerCase() === "deposit";
    const newTab = newIsDeposit ? Tabs.DEPOSIT : Tabs.WITHDRAW;

    // Update URL first to ensure consistency
    router.push(`${pathname}?tab=${newTab}`);

    // Reset input balance
    setInputBalance(EMPTY_BALANCE);
    setDisplayValue("");
    updateLocalStorageObject(vaultData.id, {
      tab: newTab,
      inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
    });

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
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
    if (isTxInProgress) return;
    const tabParam = searchParams.get("tab");
    // Get the opposite tab of what's currently in the URL
    const currentTabFromURL = tabParam !== "withdraw" ? "deposit" : "withdraw";
    const newTab = currentTabFromURL === "deposit" ? "withdraw" : "deposit";

    // Update URL - React will handle state update via the useEffect
    handleTabChange(newTab);
  };

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!inputToken) return;
      const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
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
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);

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

  const getWithdrawOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      try {
        console.log("start");
        /*console.log("Double Box - Starting getWithdrawOutputAmount:", {
        inputAmountValue: inputAmountValue.toString(),
      });*/
        const assetsAmount = await getAssetsFromShares(
          inputAmountValue,
          vaultData,
          selectedChain?.id ?? SUPPORTED_CHAINS[0].chain.id,
        );

        const actualInputToken = isZetachain(selectedChain?.id as number)
          ? inputToken
          : inputToken?.ZRC20equivalent;

        if (!actualInputToken) {
          setLoadingOutputToken(false);
          return;
        }
        /*console.log("Double Box - Token addresses:", {
        inputToken: actualInputToken?.address,
        isZetachain: isZetachain(activeChain?.id as number),
        vaultInputToken: vaultData.inputToken.address,
      });*/
        let tokenConversionAmount = assetsAmount;
        if (actualInputToken.address !== vaultData.inputToken.address) {
          tokenConversionAmount = await getAmountOutFromSwap(
            assetsAmount,
            vaultData.inputToken,
            actualInputToken,
            vaultData.id,
          );
        }

        const assetsConversionInUSD =
          (Number(assetsAmount) / 10 ** vaultData.inputToken.decimals) *
          vaultTokenPrice;
        console.log("assetsConversionInUSD", assetsConversionInUSD);
        const tokenConversionFromWei =
          Number(tokenConversionAmount) / 10 ** (inputToken?.decimals ?? 18);
        const tokenConversionInUSD = tokenConversionFromWei * inputTokenPrice;

        console.log("tokenConversionInUSD", tokenConversionInUSD);
        const slippageActualValue = Math.max(
          0,
          100 - (tokenConversionInUSD * 100) / assetsConversionInUSD,
        );

        if (inputAmountValue === debouncedInputBalance.value) {
          // Use formatTokenBalance for the output amount formatting
          const formattedOutputAmount = formatTokenBalance(
            tokenConversionFromWei,
            inputToken?.symbol || "",
          );

          /*console.log("Double Box - Conversion Output:", {
          slippageActualValue: Number(slippageActualValue.toFixed(2)),
          finalConvertedAmountInUSDFormatted: formatCurrency(
            assetsConversionInUSD
          ).toString(),
          outputAmountFormatted: formattedOutputAmount,
          outputAmountInUSDFormatted:
            formatCurrency(tokenConversionInUSD).toString(),
        });*/
          console.log("formattedOutputAmount", formattedOutputAmount);
          setConversionOutput({
            slippageActualValue: Number(slippageActualValue.toFixed(2)),
            finalConvertedAmountInUSDFormatted: formatCurrency(
              assetsConversionInUSD,
            ).toString(),
            outputAmountFormatted: formattedOutputAmount,
            outputAmountInUSDFormatted:
              formatCurrency(tokenConversionInUSD).toString(),
          });
        }
      } finally {
        console.log("setLoadingOutputToken(false)");
        setLoadingOutputToken(false);
      }
    },
    [
      selectedChain?.id,
      debouncedInputBalance.value,
      inputToken,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
    ],
  );

  const getDepositOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      try {
        const actualInputToken = isZetachain(selectedChain?.id as number)
          ? inputToken
          : inputToken?.ZRC20equivalent;

        if (!actualInputToken) {
          setLoadingOutputToken(false);
          return;
        }
        /*console.log("Double Box - 🏦 Token addresses:", {
        inputToken: actualInputToken.address,
        isZetachain: isZetachain(activeChain?.id as number),
        vaultInputToken: vaultData.inputToken.address,
      });*/
        let assetsConversionAmount: bigint = inputAmountValue;
        if (actualInputToken.address !== vaultData.inputToken.address) {
          assetsConversionAmount = await getAmountOutFromSwap(
            inputAmountValue,
            actualInputToken,
            vaultData.inputToken,
            vaultData.id,
          );
        }

        console.log("Double Box - Pre Gas Conversion amounts:", {
          assetsConversionAmount: assetsConversionAmount.toString(),
        });

        // 2. Fetch gas fee info from the ZRC20 token
        let gasFeeInVaultAsset = BigInt(0);
        let gasFeeInUSD = "0";
        let gasFeeInETH = "0";

        if (!vaultData.depositFeePaidFromGasTank) {
          const publicClient = getPublicClient(selectedChain?.id ?? 7000);
          if (!publicClient) {
            setLoadingOutputToken(false);
            return;
          }
          const vaultAbi = [
            {
              type: "function",
              name: "gasLimitForWithdrawAndCall",
              stateMutability: "view",
              inputs: [],
              outputs: [
                {
                  name: "",
                  type: "uint256",
                  internalType: "uint256",
                },
              ],
            },
          ] as const;

          console.log("publicClient");

          const tokenContractAbi = [
            {
              type: "function",
              name: "withdrawGasFeeWithGasLimit",
              stateMutability: "view",
              inputs: [{ name: "gasLimit", type: "uint256" }],
              outputs: [
                { name: "tokenAddress", type: "address" },
                { name: "gasFee", type: "uint256" },
              ],
            },
          ] as const;

          const gasLimitForWithdrawAndCall = await publicClient.readContract({
            address: vaultData.id,
            abi: vaultAbi,
            functionName: "gasLimitForWithdrawAndCall",
          });

          console.log("gasLimitForWithdrawAndCall");

          const result = await publicClient.readContract({
            address: vaultData.inputToken.address,
            abi: tokenContractAbi,
            functionName: "withdrawGasFeeWithGasLimit",
            args: [gasLimitForWithdrawAndCall],
          });
          console.log("result");
          const gasZRC20 = result[0];
          const gasFee = result[1];
          // 3. If vault token and gas token match, subtract directly
          gasFeeInVaultAsset = gasFee;

          if (gasZRC20 !== vaultData.inputToken.address) {
            // Convert fee from gas token into vault asset terms
            gasFeeInVaultAsset = await getAmountOutFromSwap(
              gasFee,
              ZRC20_TOKENS_BY_ADDRESS[gasZRC20],
              vaultData.inputToken,
              vaultData.id,
            );
            console.log("gasZRC20");
          }

          // Format gas fee in USD and ETH
          const gasFeeInTokenUnits =
            Number(gasFeeInVaultAsset) / 10 ** vaultData.inputToken.decimals;
          const gasFeeInUSDAmount = gasFeeInTokenUnits * vaultTokenPrice;
          gasFeeInUSD = formatCurrency(gasFeeInUSDAmount);
          const ethAmount = convertUsdToEth(gasFeeInUSDAmount, ethPriceUsd);
          gasFeeInETH = ethAmount.toFixed(5);
        }

        // 4. Subtract gas fee from converted amount
        const finalConvertedAmount =
          assetsConversionAmount > gasFeeInVaultAsset
            ? assetsConversionAmount - gasFeeInVaultAsset
            : BigInt(0);

        const sharesAmountRaw = await getSharesFromDeposit(
          finalConvertedAmount,
          vaultData,
        );
        console.log("sharesAmountRaw");

        // Use formatTokenBalance for the output amount formatting
        const sharesAmountFormatted = formatTokenBalance(
          sharesAmountRaw,
          vaultData.symbol,
        );

        const inputAmountValueInUSD =
          (Number(inputAmountValue) / 10 ** (inputToken?.decimals ?? 18)) *
          inputTokenPrice;
        const finalConvertedAmountInUSD =
          (Number(finalConvertedAmount) / 10 ** vaultData.inputToken.decimals) *
          vaultTokenPrice;
        const finalConvertedAmountInUSDFormatted = formatCurrency(
          finalConvertedAmountInUSD,
        ).toString();

        // Calculate slippage excluding gas fee
        const slippageActualValue = Math.max(
          0,
          100 - (finalConvertedAmountInUSD * 100) / inputAmountValueInUSD,
        );

        if (inputAmountValue === debouncedInputBalance.value) {
          setConversionOutput({
            slippageActualValue: Number(slippageActualValue.toFixed(2)),
            finalConvertedAmountInUSDFormatted: formatUSDValue(
              finalConvertedAmountInUSD,
            ),
            outputAmountFormatted: sharesAmountFormatted,
            outputAmountInUSDFormatted: formatUSDValue(
              finalConvertedAmountInUSD,
            ),
            gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
            gasFeeInUSD,
            gasFeeInETH,
            netDepositToVaultUSD: formatUSDValue(finalConvertedAmountInUSD),
            inputAmountInUSDFormatted: formatUSDValue(inputAmountValueInUSD),
          });
          console.log("setConversionOutput");
        }
      } finally {
        setLoadingOutputToken(false);
      }
    },
    [
      selectedChain?.id,
      debouncedInputBalance.value,
      inputToken,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
      ethPriceUsd,
    ],
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
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
        ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ""))
      )
    ) {
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
      localStorage.removeItem(vaultData.id);
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
  ]);

  // Create an adapter function for InputTokenWithError in Deposit mode
  const handleDepositTokenSelect = (token: Token) => {
    // Call the token selection handler for deposit
    handleTokenSelect(token);
  };

  // Create an adapter function for InputTokenWithError in Withdraw mode
  const handleWithdrawTokenSelect = (token: Token) => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData.id);
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

  const isButtonDisabled = useMemo(() => {
    return (
      !walletAddress ||
      !inputBalance.formatted ||
      Number(inputBalance.formatted) <= 0 ||
      !!errorMessage ||
      !!outputBoxErrorMessage ||
      loadingOutputToken ||
      (isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        debouncedInputBalance.value > 0n &&
        Number(
          conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, ""),
        ) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, "")))
    );
  }, [
    walletAddress,
    inputBalance.formatted,
    errorMessage,
    outputBoxErrorMessage,
    loadingOutputToken,
    isDeposit,
    vaultData.depositFeePaidFromGasTank,
    debouncedInputBalance.value,
    conversionOutput.inputAmountInUSDFormatted,
    conversionOutput.gasFeeInUSD,
  ]);

  console.log(conversionOutput)
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
        availableTabs={["Deposit", "Withdraw"]}
        activeTab={isDeposit ? "Deposit" : "Withdraw"}
        setActiveTab={handleTabChange}
      />
      {!isConnected ||
        (!isDeposit && (
          <div className="mb-4">
            <SlippageSettingsBlock
              setInputBalance={setInputBalance}
              vaultId={vaultData.id}
              showTransactionSettings={isSlippageExceedingLimit}
            />
          </div>
        ))}
      <div className="mb-4">
        {selectedChain && onSelectChain && vaultId && isDeposit && (
          <ChainSelector
            selectedChain={selectedChain}
            onSelectChain={onSelectChain}
            vaultId={vaultId}
          />
        )}
      </div>

      <InputTokenWithError
        onSelectToken={isDeposit ? handleDepositTokenSelect : () => {}}
        allowInput={allowInput}
        vaultData={vaultData}
        onMaxClick={handleMaxClick}
        value={displayValue}
        onChange={handleChangeInput}
        selectedToken={isDeposit ? inputToken : vaultToken}
        selectedChain={selectedChain}
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
      <div className="w-full my-10 flex items-center justify-center">
        <button className="group flex-center p-2" onClick={switchTokens}>
          <DepositModalArrowsIcon width={24} height={24} />
        </button>
      </div>
      <div className="mb-10">
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
        selectedToken={isDeposit ? vaultToken : inputToken}
        selectedChain={selectedChain}
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
          />
        )}
    </>
  );
}
