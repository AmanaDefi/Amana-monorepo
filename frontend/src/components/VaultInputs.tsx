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
  chainConfigs,
  chainsWithCustomRpcs,
  SUPPORTED_CHAINS,
} from "@/constants/chainConfig";
import {
  formatCurrency,
  getCurrentSlippage,
  getVaultErrorMessage,
  isZetachain,
  selectActions,
  convertUsdToEth,
  bigIntReviver,
  bigIntReplacer,
  formatSlippageUSD,
} from "@/utils/utils";
import InteractionContainer from "./interactAPI";
import { useSlippage, useTokenPriceBySymbol } from "@/hooks/hooks";
import {
  getPathDataAndAmountOut,
  getPerformanceFee,
  getSharesFromDeposit,
} from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { calculateGasFeeInVaultAsset } from "@/utils/gasFeeCalculations";
import { useRouter, usePathname } from "next/navigation";
import { trackEvent } from "@/utils/trackEvent";

import { motion, AnimatePresence } from "framer-motion";

import {
  CheckTheTxIsInProgress,
  getLocalStorageObject,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { getPublicClient } from "@/utils/getPublicClient";
import { ZRC20_TOKENS_BY_ADDRESS } from "@/constants/ZRC20TokensByAddress";
import ChainSelector from "./VaultsDetailsWrapper/components/ChainSelector";
import SlippageSettingsBlock from "./VaultsDetailsWrapper/components/SlippageSettingsBlock";
import FeeDisplay, {
  ExpectedSlippageBlock,
} from "./VaultsDetailsWrapper/components/FeeDisplay";
import APYChangeCard from "./VaultsDetailsWrapper/components/APYChangeCard";
import { useWallets } from "@privy-io/react-auth";
import { useTransactionStore } from "@/store/transactionStore";
import { formatTokenBalance, formatUSDAmount, formatUSDValue } from "@/utils/tokenFormat";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import { zetachain } from "viem/chains";
import { useAPYStore } from "@/store/APYStore";

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
  gasFeeInVaultAsset?: string;
  gasFeeInUSD?: string;
  gasFeeInETH?: string;
  netDepositToVaultUSD?: string;
  inputAmountInUSDFormatted?: string;
  slippageAmountInUSDFormatted?: string;
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
  const [inputToken, setInputToken] = useState<Token | undefined>(
    selectedToken,
  );
  const [inputBalance, setInputBalance] = useState<Balance>(EMPTY_BALANCE);
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
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const activeWallet = filteredWallets[0];
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
  } = useTransactionStore();

  const { selectedChainFromModal, setSelectedTokenFromModal } =
    useChainTokenModalStore();

  const { setPreviousAPY, setCurrentAPY, setActiveTransactionVault } =
    useAPYStore();

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
      slippageActualValue: null,
      finalConvertedAmountInUSDFormatted: "0.00",
      outputAmountFormatted: "0.00",
      outputAmountInUSDFormatted: "0.00",
    }),
    [],
  );

  const [loadingOutputToken, setLoadingOutputToken] = useState(false);
  const [conversionOutput, setConversionOutput] = useState<ConversionOutput>(
    initialConversionOutput,
  );

  const { walletAddress, activeChain } = useMultiChain();

  const inputTokenPrice = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol);
  const ethPriceUsd = useTokenPriceBySymbol("ETH");

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
       // Якщо selectedChain є ZetaChain або ZetaChain Testnet, завжди використовуємо vaultData.inputToken
       if (
         selectedChain &&
         selectedChain.id === CHAIN_ID["zetachain"] && // <-- Тепер тільки для основної мережі ZetaChain
         vaultData?.inputToken
       ) {
         setInputToken(vaultData.inputToken);
         if (onTokenSelect) {
           onTokenSelect(vaultData.inputToken);
         }
         // Тримайте це для узгодженості взаємодії з модаллю
         setSelectedTokenFromModal(vaultData.inputToken);
       } else if (selectedChain) {
         const tokens = APPROVED_TOKENS[selectedChain.id] || [];
         const defaultToken =
           tokens.find((token) => token.symbol === "USDC") || tokens[0];

         if (defaultToken) {
           setInputToken(defaultToken);
           if (onTokenSelect) {
             onTokenSelect(defaultToken);
           }
           setSelectedTokenFromModal(defaultToken);
         }
       } else {
         setInputToken(undefined);
         if (onTokenSelect) {
           onTokenSelect(undefined);
         }
         setSelectedTokenFromModal(null);
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
   }, [selectedChain, vaultData, onTokenSelect, setSelectedTokenFromModal]);

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
      fetchBalance();
      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("0.00");

      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
        displayValue: "0.00",
      });
    }
  }, [inputToken, selectChain, fetchBalance, vaultData.id]);

  // Trigger error message handling
  useEffect(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
    if (inputToken && userVaultBalance && !isTxInProgress) {
      if (isDeposit) {
        // For Ethereum vaults, use net deposit amount for validation
        // For other vaults, use input amount
        const amountToValidate = !vaultData.depositFeePaidFromGasTank
          ? conversionOutput.netDepositToVaultUSD?.replace(/[^0-9.]/g, "") ||
            inputBalance.formatted
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
            isDeposit,
          ),
        );
      } else {
        const availableBalanceForWithdrawal = userVaultBalance.formatted || "0";

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
    steps,
    inputTokenPrice,
    vaultTokenPrice,
    conversionOutput.netDepositToVaultUSD,
    loadingOutputToken,
    userVaultBalance,
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

  // const switchTokens = async () => {
  //   const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);
  //   if (isTxInProgress) return;
  //   // Get the opposite tab of what's currently in the URL
  //   const newTab = isDeposit ? "withdraw" : "invest";

  //   // Update URL - React will handle state update via the useEffect
  //   handleTabChange(newTab);
  // };

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    [inputToken, inputTokenPrice, isDeposit, vaultToken.decimals, vaultData.id],
  );

  const handleMaxClick = useCallback(() => {
    const isTxInProgress = CheckTheTxIsInProgress(vaultData?.id);

    if (!inputToken || isTxInProgress) return;

    if (isDeposit) {
      const formattedAmount = Number(tokenBalance.formatted).toFixed(7);
      const cleanAmount = Number(formattedAmount).toString();

      setInputBalance({
        ...tokenBalance,
        formatted: cleanAmount,
      });
      setDisplayValue(cleanAmount);
      updateLocalStorageObject(vaultData.id, {
        inputBal: JSON.stringify(
          {
            ...tokenBalance,
            formatted: cleanAmount,
          },
          bigIntReplacer,
        ),
        displayValue: cleanAmount,
      });
    } else {
      const maxValue =
        vaultTotalAssetinToken?.totalAssetsinToken?.toString() ?? "0.00";
      const formattedMaxValue = Number(maxValue).toFixed(7);
      const cleanMaxValue = Number(formattedMaxValue).toString();

      handleChangeInput({
        currentTarget: { value: cleanMaxValue },
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

    if ( !selectedChain?.id || selectedChain.id === 7001 || selectedChain.id === 7000) {
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
          userSlippage * 100,
        );
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
    ],
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
      if (
        actualInputToken.address.toLowerCase() !==
        vaultData.inputToken.address.toLowerCase()
      ) {
        const result = await getPathDataAndAmountOut(
          inputAmountValue,
          actualInputToken,
          vaultData.inputToken,
          vaultData.id as Address,
          userSlippage * 100,
        );
        assetsConversionAmount = result.amountOut;
      }

      console.log("Double Box - Pre Gas Conversion amounts:", {
        assetsConversionAmount: assetsConversionAmount.toString(),
      });

      // 2. Fetch gas fee info from the ZRC20 token

      let gasFeeInVaultAsset = BigInt(0);
      let gasFeeInUSD = "0";
      let gasFeeInETH = "0";
      let netDepositToVaultUSD = "0";

      const publicClient = getPublicClient(SUPPORTED_CHAINS[0].id);
      if (!vaultData.depositFeePaidFromGasTank && !!publicClient) {
        const gasLimitForWithdrawAndCall = await publicClient.readContract({
          address: vaultData.id as Address,
          abi: [
            parseAbiItem(
              "function gasLimitForWithdrawAndCall() view returns (uint256)",
            ),
          ],
          functionName: "gasLimitForWithdrawAndCall",
        });

        console.log("gas limit:", gasLimitForWithdrawAndCall);

        const result = await publicClient.readContract({
          address: vaultData.inputToken.address as Address,
          abi: [
            parseAbiItem(
              "function withdrawGasFeeWithGasLimit(uint256) view returns (address, uint256)",
            ),
          ],
          functionName: "withdrawGasFeeWithGasLimit",
          args: [gasLimitForWithdrawAndCall],
        });
        const gasZRC20 = result[0] as Address;
        const gasFee = result[1] as bigint;

        gasFeeInVaultAsset = gasFee;

        if (gasZRC20 !== vaultData.inputToken.address) {
          // Convert fee from gas token into vault asset terms
          const result = await getPathDataAndAmountOut(
            gasFee,
            ZRC20_TOKENS_BY_ADDRESS[gasZRC20],
            vaultData.inputToken,
            vaultData.id as Address,
            userSlippage * 100,
          );
          gasFeeInVaultAsset = result.amountOut;
        }
        // Format gas fee in USD and ETH
        const gasFeeInTokenUnits =
          Number(gasFeeInVaultAsset) / 10 ** vaultData.inputToken.decimals;
        const gasFeeInUSDAmount = gasFeeInTokenUnits * vaultTokenPrice;
        gasFeeInUSD = formatUSDAmount(gasFeeInUSDAmount);
        const ethAmount = convertUsdToEth(gasFeeInUSDAmount, ethPriceUsd);
        gasFeeInETH = ethAmount.toFixed(5);
      }

      // 4. Subtract gas fee from converted amount
      const finalConvertedAmount =
        assetsConversionAmount > gasFeeInVaultAsset
          ? assetsConversionAmount - gasFeeInVaultAsset
          : BigInt(0);

      console.log("Double Box - Final converted amount after gas fee:", {
        finalConvertedAmount: finalConvertedAmount.toString(),
        gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
      });

      const sharesAmountRaw = await getSharesFromDeposit(
        finalConvertedAmount,
        vaultData,
        activeWallet,
      );

      // Use formatTokenBalance for the output amount formatting
      const sharesAmountFormatted = formatTokenBalance(
        sharesAmountRaw,
        vaultData.symbol,
      );

      const outputSharesAmountInUSD = Number(sharesAmountRaw) * vaultTokenPrice;

      console.log("Double Box - Shares calculation:", {
        sharesAmountFormatted,
        finalConvertedAmount: finalConvertedAmount.toString(),
      });
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

      const calculatedSlippageUSD =
        inputAmountValueInUSD - finalConvertedAmountInUSD;

      const slippageAmountInUSDFormatted = formatSlippageUSD(
        calculatedSlippageUSD,
      );

      if (!vaultData.depositFeePaidFromGasTank && gasFeeInVaultAsset > 0n) {
        const totalLossUSD = inputAmountValueInUSD - finalConvertedAmountInUSD;
        const gasFeeUSD = parseFloat(gasFeeInUSD.replace(/[^0-9.]/g, ""));
        const gasFeeETH = parseFloat(gasFeeInETH);
        const swapLossUSD = totalLossUSD - gasFeeUSD;
      }

      if (inputAmountValue === debouncedInputBalance.value) {
        setConversionOutput({
          slippageActualValue: Number(slippageActualValue.toFixed(2)),
          slippageAmountInUSDFormatted: slippageAmountInUSDFormatted,
          finalConvertedAmountInUSDFormatted: formatUSDValue(
            finalConvertedAmountInUSD,
          ),
          outputAmountFormatted: sharesAmountFormatted,
          outputAmountInUSDFormatted: formatUSDValue(outputSharesAmountInUSD),
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
      inputToken,
      inputTokenPrice,
      vaultData,
      vaultTokenPrice,
      ethPriceUsd,
      activeWallet,
      selectedChain?.id,
      userSlippage,
    ],
  );

  const timeoutRef = useRef<NodeJS.Timeout>();

  const checkSlippageExceedingLimit = () => {
    
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
      setDebouncedInputBalance(EMPTY_BALANCE);
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
      setDebouncedInputBalance(inputBalance);
      setLoadingOutputToken(false);
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

  const isButtonDisabled = useMemo(() => {
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
      const maxWithdrawAmount = userVaultBalance?.formatted || "0";
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
    userVaultBalance,
  ]);
  // 🧪 TESTING: Log final values being displayed
  useEffect(() => {
    if (inputToken && vaultTotalAssetinToken) {
      console.log("=== FINAL UI VALUES ===");
      console.log(`🎯 Mode: ${isDeposit ? "DEPOSIT" : "WITHDRAW"}`);
      console.log(
        `🪙 Input token: ${isDeposit ? inputToken?.symbol : vaultData.inputToken.symbol}`,
      );
      console.log(
        `🪙 Output token: ${vaultData.inputToken.symbol} (underlying asset)`,
      );
      console.log(
        `💰 Balance displayed: ${isDeposit ? tokenBalance.formatted : (vaultTotalAssetinToken?.totalAssetsinToken?.toString() ?? "0")}`,
      );
      console.log(
        `📊 Balance type: ${isDeposit ? "wallet balance" : "maxWithdraw amount"}`,
      );
      console.log(`✅ Consistent UX: Both modes show underlying asset!`);
      console.log("=====================");
    }
  }, [
    isDeposit,
    inputToken?.symbol,
    vaultData.inputToken.symbol,
    tokenBalance.formatted,
    vaultTotalAssetinToken,
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
      <div className="relative mb-6 ">
        <TabSelector
          availableTabs={["Invest", "Withdraw"]}
          activeTab={isDeposit ? "Invest" : "Withdraw"}
          setActiveTab={handleTabChange}
        />
        <div className="absolute top-0 right-0 z-30 mt-3">
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
            <div className="mb-4">
              {onSelectChain && vaultId && isDeposit && (
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
              disabled={false}
              isDeposit={isDeposit}
              loadingOutputToken={loadingOutputToken}
              conversionOutput={conversionOutput}
              isSlippageExceedingLimit={isSlippageExceedingLimit}
              setInputBalance={setInputBalance}
              isOutput={false}
              captionText={!isDeposit ? "Output Amount" : ""}
            />
            <div className="md:my-6">
              <FeeDisplay
                isDeposit={isDeposit}
                vaultData={vaultData}
                conversionOutput={conversionOutput}
                debouncedInputBalance={debouncedInputBalance}
                performanceFee={performanceFee}
              />
            </div>
            <ExpectedSlippageBlock
              conversionOutput={conversionOutput}
              isVisible={!!conversionOutput.slippageActualValue && !outputBoxErrorMessage}
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
              disabled={false}
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
            <div className="mb-4">
              {onSelectChain && vaultId && isDeposit && (
                <ChainSelector
                  selectedChain={selectedChain}
                  onSelectChain={onSelectChain}
                  onSelectChainAndToken={handleSelectChainAngToken}
                  vaultId={vaultId}
                  vaultData={vaultData}
                />
              )}
            </div>
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
              disabled={false}
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
              disabled={false}
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
          outputAmountFormatted={conversionOutput.outputAmountFormatted}
        />
      )}
    </>
  );
}
