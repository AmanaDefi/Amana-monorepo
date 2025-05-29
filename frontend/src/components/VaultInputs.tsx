import TabSelector from "@/components/common/TabSelector";
import InputTokenWithError from "@/components/input/InputTokenWithError";
import {
  VaultData,
  Token,
  Balance,
  SmartVaultActionType,
  VaultTotalAssetsinToken,
  Action,
} from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { parseUnits } from "viem";
import { Address, Chain, getContract, readContract } from "thirdweb";
import { client } from "@/utils/client";
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
} from "@/utils/utils";
import { ethers } from "ethers";
import InteractionContainer from "./interact";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import {
  getAmountOutFromSwap,
  getAssetsFromShares,
  getPerformanceFee,
  getSharesFromDeposit,
} from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { ZRC20_TOKENS_BY_ADDRESS } from "@/constants/ZRC20TokensByAddress";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from "@/utils/trackEvent";
import { InformationCircleIcon } from "@heroicons/react/24/solid";
import ResponsiveTooltip from "@/components/common/Tooltip";
import { ACTION_STEP, ACTION_STEPS, CURRENT_ACTION } from "@/constants/localStorageKeys";

// Helper function for formatting token balances based on token type
const formatTokenBalance = (balance: string | number, symbol: string): string => {
  const num = Math.max(0, Number(balance));
  // Check if token is a stablecoin
  const isStablecoin = symbol?.includes('USD') || symbol?.includes('DAI') ||
                    symbol?.includes('USDT') || symbol?.includes('USDC') ||
                    symbol?.includes('BUSD');
  // Format with 2 decimal places for stablecoins, 4 for others
  const decimals = isStablecoin ? 2 : 4;
  return num.toFixed(decimals);
};

// When displaying USD value for outputs or net deposits, ensure it's never negative
const formatUSDValue = (value: number): string => {
  return formatCurrency(Math.max(0, value));
}

export interface VaultInputsProps {
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalance?: Balance;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken;
  transactionCompleted: boolean;
  initialIsDeposit?: boolean;
  onTokenSelect?: (token: Token) => void;
  selectedToken?: Token 
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
  selectedToken
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
  const tabParam = searchParams.get('tab');

  // Update isDeposit when URL tab parameter changes
  useEffect(() => {
    const shouldBeDeposit = tabParam !== 'withdraw';

    // Only update if the state is different from what it should be
    if (isDeposit !== shouldBeDeposit) {
      setIsDeposit(shouldBeDeposit);
    }
  }, [tabParam, searchParams]);

  // // Check if user has balance for withdrawal if tab=withdraw
  // useEffect(() => {
  //   // Only redirect if we're explicitly on withdraw tab AND there's no balance
  //   if (tabParam === 'withdraw' &&
  //       userVaultBalance !== undefined &&
  //       Number(userVaultBalance) === 0) {
  //     // If no balance for withdrawal, redirect to deposit tab
  //     router.push(`${pathname}?tab=deposit`);
  //   }
  // }, [tabParam, userVaultBalance, pathname, router]);

  const [steps, setSteps] = useState<Action[]>([]);
  const [step, setStep] = useState<number>(0);
  const [action, setAction] = useState<Action>(steps[0]);
  const [performanceFee, setPerformanceFee] = useState<number>(0);

  useEffect(() => {
    async function handlePerformanceFee() {
      const perfFee = await getPerformanceFee(vaultData.id as Address);
      const percentagePerformanceFee = Number((perfFee / 100).toFixed(2));
      setPerformanceFee(percentagePerformanceFee);
    }
    handlePerformanceFee();
  }, [vaultData]);

  useEffect(() => {
    const currentSteps = localStorage.getItem(ACTION_STEPS);
    const currentStep = localStorage.getItem(ACTION_STEP);
    const currentAction = localStorage.getItem(CURRENT_ACTION);
    if (currentSteps) {
      setSteps(JSON.parse(currentSteps))
    }
    if (currentStep) {
      setStep(Number(currentStep))
    }
    if (currentAction) {
      setAction(JSON.parse(currentAction))
    }
  }, [])

  // const initialOutputBalance: OutputBalance = useMemo(() => ({
  //   amountFormatted: '0',
  //   amountUSDFormatted: '0'
  // }), [])

  const initialConversionOutput: ConversionOutput = useMemo(
    () => ({
      slippageActualValue: null,
      finalConvertedAmountInUSDFormatted: "0",
      outputAmountFormatted: "0",
      outputAmountInUSDFormatted: "0",
    }),
    []
  );

  const [loadingOutputToken, setLoadingOutputToken] = useState(false);
  const [conversionOutput, setConversionOutput] = useState<ConversionOutput>(
    initialConversionOutput
  );

  const { activeChain, walletAddress } = useMultiChain();

  const inputTokenPrice = useTokenPriceBySymbol(inputToken?.symbol);
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol);
  const ethPriceUsd = useTokenPriceBySymbol("ETH");

  const vaultToken: Token = useMemo(() => {
    return {
      symbol: vaultData.symbol,
      decimals: vaultData.inputToken.decimals,
      address: vaultData.id as Address,
      imgURL: "",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false,
    };
  }, [vaultData.id, vaultData.inputToken.decimals, vaultData.symbol]);

  // Set input token by filtering approved tokens based on user connected chain
  useEffect(() => {
    if (selectedToken) {
      setInputToken(selectedToken);
    } else if (activeChain?.id === 7001 || activeChain?.id === 7000) {
      // If on ZetaChain testnet, set inputToken to the vault token
      setInputToken(vaultData.inputToken);
    } else {
      // On other chains, use APPROVED_TOKENS to set available tokens
      setInputToken(
        determineVaultTokenFromApprovedTokens(
          activeChain?.id as number,
          vaultData.inputToken
        )
      ); // Set to the first approved token as a default
    }

    setAllowInput(true);
  }, [activeChain, vaultData]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const { balance: tokenBalance, fetchBalance } =
    useMultichainTokenBalance(inputToken);

  // Reset token when chain changes to prevent cross-chain token errors
  useEffect(() => {
    // Clear token selection and balance when the active chain changes
    // This prevents the app from attempting to use a token from the previous chain
    // which could cause AbiDecodingZeroDataError when fetching token balances
    if (activeChain?.id) {
      setInputBalance(EMPTY_BALANCE);
    }
  }, [activeChain?.id]);

  // Force refresh token balance when token or chain changes
  useEffect(() => {
    if (inputToken && activeChain) {
      fetchBalance();
      // Reset input field when token changes
      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("");
    }
  }, [inputToken?.address, activeChain?.id, fetchBalance]);

  // Trigger error message handling
  useEffect(() => {
    if (inputToken && vaultTotalAssetinToken) {
      if (isDeposit) {
        setErrorMessage(
          getVaultErrorMessage(
            inputBalance.value.toString(),
            tokenBalance.value.toString(),
            steps
          )
        );
      } else {
        setErrorMessage(
          getVaultErrorMessage(
            inputBalance.formatted,
            vaultTotalAssetinToken.toString(),
            steps
          )
        );
      }
    }
  }, [
    inputToken,
    inputBalance.formatted,
    isDeposit,
    vaultData.id,
    action,
    vaultTotalAssetinToken,
    steps,
  ]);

  // Watch input balance and trigger steps config selection
  useEffect(() => {
    const fetchData = async () => {
      if (Number(inputBalance.value) != 0 && inputToken) {
        const actionType = isDeposit
          ? SmartVaultActionType.Deposit
          : SmartVaultActionType.Withdrawal;
        const newStepsConfig = await selectActions(
          actionType,
          vaultData,
          activeChain as Chain,
          walletAddress as any,
          inputBalance,
          inputToken
        );
        setSteps(newStepsConfig);
        localStorage.setItem(ACTION_STEPS, JSON.stringify(newStepsConfig))
        /*console.log(
          "SETTING ACTION STEPS: ",
          newStepsConfig,
          newStepsConfig.map((e) => Action[e])
        );*/
      } else {
        setSteps([]);
        localStorage.removeItem(ACTION_STEPS)
      }
    };
    // Call the async function
    fetchData();
  }, [
    inputBalance,
    inputToken?.address,
    activeChain?.id,
    inputToken,
    isDeposit,
    vaultData,
    activeChain,
    walletAddress,
  ]);

  // Replace the handleTokenSelect function with this improved version
  const handleTokenSelect = (selectedToken: Token) => {
    //console.log("Selected token:", selectedToken);

    // If the selected token is the vault token but from a different chain,
    // we should still use it directly without trying to find an equivalent
    if (selectedToken.address === vaultData.inputToken.address) {
      //console.log("Selected vault token directly");
      setInputToken(selectedToken);
      setAllowInput(true);
    } else {
      // Otherwise, use the token as selected
      setInputToken(selectedToken);
      setAllowInput(true);
    }

    // Notify parent component about token selection
    if (onTokenSelect) {
      onTokenSelect(selectedToken);
    }
  };

  const switchTokens = async () => {
    // Get the opposite tab of what's currently in the URL
    const currentTabFromURL = tabParam !== 'withdraw' ? 'deposit' : 'withdraw';
    const newTab = currentTabFromURL === 'deposit' ? 'withdraw' : 'deposit';

    // Update URL - React will handle state update via the useEffect
    router.push(`${pathname}?tab=${newTab}`);
  };

  const handleChangeInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!inputToken) return;
      let value = e.currentTarget.value;

      // Special case for empty input
      if (value === "") {
        setInputBalance({
          value: 0n,
          formatted: "0",
          formattedUSD: "0",
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
        setDisplayValue("0.");
        return;
      }

      // Format the number properly
      if (!value.includes(".")) {
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
    },
    [inputToken, inputTokenPrice, isDeposit, vaultToken.decimals]
  );

  const handleMaxClick = useCallback(() => {
    if (!inputToken) return;
    if (isDeposit) {
      // handleChangeInput({ currentTarget: { value: inputTokenBalance } } as React.ChangeEvent<HTMLInputElement>);
      setInputBalance(tokenBalance);
      setDisplayValue(tokenBalance.formatted)
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
  ]);

  const tokenList = useMemo(() => {
    let tokens: Token[] = [];

    if (activeChain?.id === 7001 || activeChain?.id === 7000) {
      // For ZetaChain, include both the vault's input token AND the approved tokens
      tokens = [...(APPROVED_TOKENS[activeChain.id] || [])];

      // Check if the vault's input token is already in the list
      const vaultTokenExists = tokens.some(
        (token) => token.address === vaultData.inputToken.address
      );

      // Add vault token if it doesn't already exist in the list
      if (!vaultTokenExists && vaultData.inputToken) {
        tokens.push(vaultData.inputToken);
      }
    } else {
      // For other chains, use approved tokens as before
      tokens = (APPROVED_TOKENS[activeChain?.id as number] ?? []).filter(
        (token): token is Token => token !== undefined
      );
    }

    // Make sure we always have at least one token in the list
    // This ensures the token selector is always visible
    if (tokens.length === 0 && vaultData.inputToken) {
      tokens.push(vaultData.inputToken);
    }

    return tokens;
  }, [activeChain?.id, vaultData.inputToken]);

  const getWithdrawOutputAmount = useCallback(
    async (inputAmountValue: bigint) => {
      /*console.log("Double Box - Starting getWithdrawOutputAmount:", {
        inputAmountValue: inputAmountValue.toString(),
      });*/
      const assetsAmount = await getAssetsFromShares(
        inputAmountValue,
        vaultData
      );
      /*console.log("Double Box - Assets from shares:", {
        assetsAmount: assetsAmount.toString(),
      });*/
      const actualInputToken = isZetachain(activeChain?.id as number)
        ? inputToken
        : inputToken?.ZRC20equivalent;
      if (!actualInputToken) return;
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
          vaultData.id as Address
        );
      }
      /*console.log("Double Box - Conversion amounts:", {
        tokenConversionAmount: tokenConversionAmount.toString(),
      });*/

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

        /*console.log("Double Box - Conversion Output:", {
          slippageActualValue: Number(slippageActualValue.toFixed(2)),
          finalConvertedAmountInUSDFormatted: formatCurrency(
            assetsConversionInUSD
          ).toString(),
          outputAmountFormatted: formattedOutputAmount,
          outputAmountInUSDFormatted:
            formatCurrency(tokenConversionInUSD).toString(),
        });*/
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
     /* console.log("Double Box - Starting getDepositOutputAmount:", {
        inputAmountValue: inputAmountValue.toString(),
      });*/
      const actualInputToken = isZetachain(activeChain?.id as number)
        ? inputToken
        : inputToken?.ZRC20equivalent;
      //console.log("inputToken: ", inputToken);
      //console.log("inputToken.ZRC20equivalent: ", inputToken?.ZRC20equivalent);
      //console.log("actualInputToken: ", actualInputToken);
      if (!actualInputToken) return;
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
          vaultData.id as Address
        );
      }

      /*console.log("Double Box - Pre Gas Conversion amounts:", {
        assetsConversionAmount: assetsConversionAmount.toString(),
      });*/

      // 2. Fetch gas fee info from the ZRC20 token

      let gasFeeInVaultAsset = BigInt(0);
      let gasFeeInUSD = "0";
      let gasFeeInETH = "0";
      let netDepositToVaultUSD = "0";
      if (!vaultData.depositFeePaidFromGasTank) {
        const vaultContract = getContract({
          client,
          chain: SUPPORTED_CHAINS[0],
          address: vaultData.id as Address,
        });
        const gasLimitForWithdrawAndCall = await readContract({
          contract: vaultContract,
          method:
            "function gasLimitForWithdrawAndCall() view returns (uint256)",
        });
        const tokenContract = getContract({
          client,
          chain: SUPPORTED_CHAINS[0],
          address: vaultData.inputToken.address as Address,
        });
        const result = await readContract({
          contract: tokenContract,
          method:
            "function withdrawGasFeeWithGasLimit(uint256) view returns (address,uint256)",
          params: [gasLimitForWithdrawAndCall],
        });
        const gasZRC20 = result[0] as Address;
        const gasFee = result[1] as bigint;
        // 3. If vault token and gas token match, subtract directly
        gasFeeInVaultAsset = gasFee;

        if (gasZRC20 !== vaultData.inputToken.address) {
          // Convert fee from gas token into vault asset terms
          gasFeeInVaultAsset = await getAmountOutFromSwap(
            gasFee,
            ZRC20_TOKENS_BY_ADDRESS[gasZRC20],
            vaultData.inputToken,
            vaultData.id as Address
          );
        }
        // Format gas fee in USD and ETH
        const gasFeeInTokenUnits = Number(gasFeeInVaultAsset) / 10 ** vaultData.inputToken.decimals;
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

      /*console.log("Double Box - Final converted amount after gas fee:", {
        finalConvertedAmount: finalConvertedAmount.toString(),
        gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
      });*/

      const sharesAmountRaw = await getSharesFromDeposit(
        finalConvertedAmount,
        vaultData
      );

      // Use formatTokenBalance for the output amount formatting
      const sharesAmountFormatted = formatTokenBalance(
        sharesAmountRaw,
        vaultData.symbol
      );

     /* console.log("Double Box - Shares calculation:", {
        sharesAmountFormatted,
        finalConvertedAmount: finalConvertedAmount.toString(),
      });*/
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

      // === LOGGING FOR DEBUGGING ===
      if (!vaultData.depositFeePaidFromGasTank) {
        const slippageFeeUSD = inputAmountValueInUSD - finalConvertedAmountInUSD;
        const slippageFeeETH = convertUsdToEth(slippageFeeUSD, ethPriceUsd);
        const gasFeeUSD = parseFloat(gasFeeInUSD.replace(/[^0-9.]/g, ''));
        const gasFeeETH = parseFloat(gasFeeInETH);
        /*console.log("==== FEE BREAKDOWN ====");
        console.log("Gas Fee (ETH):", gasFeeETH);
        console.log("Gas Fee (USD):", gasFeeUSD);
        console.log("Slippage Fee (USD):", slippageFeeUSD.toFixed(5));
        console.log("Slippage Fee (ETH):", slippageFeeETH.toFixed(5));
        console.log("Difference (Gas Fee USD - Slippage Fee USD):", (gasFeeUSD - slippageFeeUSD).toFixed(5));
        console.log("Difference (Gas Fee ETH - Slippage Fee ETH):", (gasFeeETH - slippageFeeETH).toFixed(5));
        console.log("=======================");*/
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
    if (conversionOutput.slippageActualValue !== null && conversionOutput.slippageActualValue > 100) {
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage("");
      return;
    }

    if (
      userSlippage &&
      conversionOutput.slippageActualValue !== null &&
      userSlippage < conversionOutput.slippageActualValue &&
      !(isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        debouncedInputBalance.value > 0n &&
        Number(conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, '')) <
          Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, '')))
    ) {
      setIsSlippageExceedingLimit(true);
      setOutputBoxErrorMessage(
        `Slippage of ${conversionOutput.slippageActualValue}% exceeds your maximum slippage setting of ${userSlippage}%`
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
      !(isDeposit &&
        !vaultData.depositFeePaidFromGasTank &&
        debouncedInputBalance.value > 0n &&
        Number(conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, '')) <
          Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, '')))
    ) {
      setOutputBoxErrorMessage("Swap route not found");
    }
  }, [conversionOutput, inputBalance]);

  // Reset input state after transaction completes or fails
  useEffect(() => {
    if (transactionCompleted) {
      setInputBalance(EMPTY_BALANCE);
      setDisplayValue("");
      setConversionOutput(initialConversionOutput);
      setDebouncedInputBalance(EMPTY_BALANCE);
      setOutputBoxErrorMessage("");
      setIsSlippageExceedingLimit(false);
    }
  }, [transactionCompleted, initialConversionOutput, setInputBalance]);

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

    setLoadingOutputToken(true);
    timeoutRef.current = setTimeout(() => {
      setDebouncedInputBalance(inputBalance);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inputBalance]);

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
  }, [debouncedInputBalance, inputToken]);

  // Create an adapter function for InputTokenWithError in Deposit mode
  const handleDepositTokenSelect = (token: Token) => {
    // Call the token selection handler for deposit
    handleTokenSelect(token);
  };

  // Create an adapter function for InputTokenWithError in Withdraw mode
  const handleWithdrawTokenSelect = (token: Token) => {
    // In withdraw mode, we still want to update the input token
    // This ensures proper token selection in both modes
    //console.log("Selected withdraw token:", token);
    setInputToken(token);

    // Notify parent component about token selection
    if (onTokenSelect) {
      onTokenSelect(token);
    }
  };

  // Handle tab selection from TabSelector
  const handleTabChange = (tab: string) => {
    const newIsDeposit = tab === "Deposit";

    // Update URL first to ensure consistency
    router.push(`${pathname}?tab=${newIsDeposit ? 'deposit' : 'withdraw'}`);

    // Reset input balance
    setInputBalance(EMPTY_BALANCE);

    // Only attempt to set steps if we have a token and chain
    if (inputToken && activeChain) {
      const fetchSteps = async () => {
        const newAction = newIsDeposit
          ? SmartVaultActionType.Deposit
          : SmartVaultActionType.Withdrawal;
        const steps = await selectActions(
          newAction,
          vaultData,
          activeChain,
          walletAddress as any,
          inputBalance,
          inputToken
        );
        setSteps(steps);
        localStorage.setItem(ACTION_STEPS, JSON.stringify(steps))
      };
      fetchSteps();
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
  }, [loadingOutputToken, conversionOutput, debouncedInputBalance]);

  return (
    <>
      {/* Add prominent message about gas fees for Ethereum vaults */}
      {isDeposit && !vaultData.depositFeePaidFromGasTank && (
        <div className="bg-yellow-900/30 border border-yellow-500 py-3 px-4 rounded-lg mb-5">
          <p className="text-yellow-400 flex items-center">
            <span className="font-normal">For Ethereum Vaults, Ethereum gas fees are deducted directly from your deposit amount and are not covered by Amana.</span>
          </p>
        </div>
      )}
      <TabSelector
        className="mb-5"
        availableTabs={["Deposit", "Withdraw"]}
        activeTab={isDeposit ? "Deposit" : "Withdraw"}
        setActiveTab={handleTabChange}
      />

      <InputTokenWithError
        captionText={isDeposit ? "Deposit Amount" : "Withdraw Amount"}
        onSelectToken={isDeposit ? handleDepositTokenSelect : () => {}}
        allowInput={allowInput}
        vaultData={vaultData}
        onMaxClick={handleMaxClick}
        value={displayValue}
        onChange={handleChangeInput}
        selectedToken={isDeposit ? inputToken : vaultToken}
        inputTokenbalance={
          isDeposit
            ? tokenBalance.formatted
            : vaultTotalAssetinToken?.toString() ?? "0"
        }
        errorMessage={errorMessage}
        tokenList={isDeposit ? tokenList : []}
        disabled={false}
        isDeposit={isDeposit}
        loadingOutputToken={loadingOutputToken}
        conversionOutput={conversionOutput}
        isSlippageExceedingLimit={isSlippageExceedingLimit}
        setInputBalance={setInputBalance}
      />
      <div className="pt-4 pb-2 flex items-center gap-3">
        <div className="w-full h-px bg-tuatara-900"></div>
        <button
          className="group flex-center hover:border-white"
          onClick={switchTokens}
        >
          <ArrowDownCircleIcon
            width={48}
            height={48}
            className="size-12 text-tuatara-900 group-hover:text-tuatara-300 transition-colors"
          />
        </button>
        <div className="w-full h-px bg-tuatara-900"></div>
      </div>
      <InputTokenWithError
        captionText={"Output amount"}
        onSelectToken={isDeposit ? () => {} : handleWithdrawTokenSelect}
        allowInput={allowInput}
        vaultData={vaultData}
        onMaxClick={() => {}}
        value={conversionOutput.outputAmountFormatted}
        onChange={() => {}}
        selectedToken={isDeposit ? vaultToken : inputToken}
        inputTokenbalance={
          isDeposit
            ? vaultTotalAssetinToken?.toString() ?? "0"
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
      <div className="mt-4">
        {conversionOutput.slippageActualValue !== null && conversionOutput.slippageActualValue < 100 && (
          <p className="text-white font-bold mb-2 text-start">
            Estimated slippage value:
            <span
              className={`${
                isSlippageExceedingLimit ? "text-red-500" : "text-green-500"
              } whitespace-pre`}
            >
              {" "}
              {conversionOutput.slippageActualValue}%
            </span>
          </p>
        )}

 {/* Net Deposit to Vault display with tooltip */}
 {isDeposit &&
         !vaultData.depositFeePaidFromGasTank &&
         conversionOutput.netDepositToVaultUSD &&
         Number(debouncedInputBalance.value) > 0 && (
          <p className="text-white font-bold mb-2 text-start flex items-center">
            <span>Net Deposit to Vault: ${conversionOutput.netDepositToVaultUSD}</span>
            <button id="net-deposit-breakdown" className="group ml-2">
              <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white transition-colors" />
            </button>
            <ResponsiveTooltip
              id={"net-deposit-breakdown"}
              content={
                <p className="w-60">
                  Input amount (${conversionOutput.inputAmountInUSDFormatted}) - Gas fee (${conversionOutput.gasFeeInUSD}) = Net deposit (${conversionOutput.netDepositToVaultUSD})
                </p>
              }
            />
          </p>
        )}

 {/* Display gas fee warning for Ethereum vaults if deposit is too low in USD */}
 {isDeposit &&
   !vaultData.depositFeePaidFromGasTank &&
   debouncedInputBalance.value > 0n &&
   Number(conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, '')) <
     Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, '')) && (
    <div className="bg-red-900/30 border border-red-500 py-2 px-4 rounded-lg mb-4">
      <p className="text-red-400 font-medium">
        Your deposit amount is too low to cover the deposit gas fee.
      </p>
    </div>
  )}


        <p className="text-white font-bold mb-2 text-start">Fee Breakdown</p>
        <div className="bg-customNeutral200 py-2 px-4 rounded-lg">
          {/* Deposit Fee For Ethereum Vaults*/}
          {isDeposit && !vaultData.depositFeePaidFromGasTank &&
           conversionOutput.gasFeeInVaultAsset &&
           Number(conversionOutput.gasFeeInVaultAsset) > 0 && conversionOutput.gasFeeInETH && conversionOutput.gasFeeInUSD && (
            <span className="flex flex-row items-center justify-between text-white py-1">
              <div className="flex items-center">
                <p>Deposit Fee (deducted from your deposit)</p>
                <button id="gas-fee-info" className="ml-2 group">
                  <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white transition-colors" />
                </button>
                <ResponsiveTooltip
                  id="gas-fee-info"
                  content={
                    <p className="w-48">
                      This fee is required for processing your deposit transaction on the Ethereum network.
                      It is deducted directly from your deposit amount and is not covered by Amana.
                    </p>
                  }
                />
              </div>
              <span className="font-bold">
                {conversionOutput.gasFeeInETH} {getOnlyTokenSymbol("ETH")} (~${conversionOutput.gasFeeInUSD})
              </span>
            </span>
          )}
           {/* Deposit Fee For Non-Ethereum Vaults*/}
           {isDeposit &&
           vaultData.depositFeePaidFromGasTank && (
            <span className="flex flex-row items-center justify-between text-white py-1">
              <p>Deposit Fee</p>
              <span className="font-bold">0%</span>
            </span>
           )
          }


          {/* Withdrawal Fee */}
          {
            !isDeposit && (<span className="flex flex-row items-center justify-between text-white py-1">
              <p>Withdrawal Fee</p>
              <span className="font-bold">0%</span>
            </span>)
          }

          {/* <span className="flex flex-row items-center justify-between text-white py-1">
            <p>Management Fee</p>
            <span className="font-bold">0%</span>
          </span> */}
          {/* Performance Fee */}
          <span className="flex flex-row items-center justify-between text-white py-1">
            <div className="flex items-center">
                <p>Performance Fee (deducted upon withdrawal)</p>
                <button id="performance-fee-info" className="group ml-2">
                  <InformationCircleIcon className="w-4 h-4 text-customGray300 group-hover:text-white group-hover:transition-colors" />
                </button>
                <ResponsiveTooltip
                  id={"performance-fee-info"}
                  content={
                    <p className="w-60">
                      15% deducted from the profit earned in the vault
                    </p>
                  }
                />
              </div>
            <span className="font-bold">{performanceFee}%</span>
          </span>
        </div>
      </div>



      {inputToken && !loadingOutputToken && (
        !(isDeposit &&
          !vaultData.depositFeePaidFromGasTank &&
          conversionOutput.gasFeeInVaultAsset &&
          debouncedInputBalance.value > 0n &&
          Number(conversionOutput.inputAmountInUSDFormatted?.replace(/[^0-9.]/g, '')) < Number(conversionOutput.gasFeeInUSD?.replace(/[^0-9.]/g, ''))
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
            activeChain={activeChain as Chain}
            _action={steps[0]}
            actions={steps}
            setInputBalance={setInputBalance}
            errorMessage={errorMessage || outputBoxErrorMessage || ""}
            isDeposit={isDeposit}
            refreshBalance={fetchBalance}
          />
        )
      )}
    </>
  );
}


