import TabSelector from "@/components/common/TabSelector";
import InputTokenWithError from "@/components/input/InputTokenWithError";
import { VaultData, Token, Balance, SmartVaultActionType, VaultTotalAssetsinToken, Action } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import {useState, useEffect, useMemo, useCallback, useRef} from "react";
import { parseUnits } from "viem";
import { Address, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletChain, useWalletBalance } from "thirdweb/react";
import { client } from "@/utils/client";
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { getBalance } from "thirdweb/extensions/erc20";
import {
  determineVaultTokenFromApprovedTokens,
  formatCurrency,
  getVaultErrorMessage,
  isZetachain,
  selectActions
} from "@/utils/utils";
import { ethers } from "ethers";
import InteractionContainer from "./interact";
import {useTokenPriceBySymbol} from "@/hooks/hooks";
import { ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import {getAmountOutFromSwap, getAssetsFromShares, getSharesFromDeposit} from "@/actions/actions";

export interface VaultInputsProps {
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalance?: string;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken,
  transactionCompleted: boolean
}

// Custom hook to fetch token balance, including native tokens
function useTokenBalance(
  token: Token | undefined,
  userAddress: string | undefined,
  activeChain: any,
  transactionCompleted: boolean,
  isDeposit: boolean // ✅ Accept isDeposit as a parameter
) {
  const [balance, setBalance] = useState<string>("0");
  const { data: walletBalance, isLoading, isError } = useWalletBalance({
    chain: activeChain,
    address: userAddress,
    client,
  });

  useEffect(() => {
    const fetchTokenBalance = async () => {
      try {
        if (!token || !userAddress) return;

        // ✅ Always use ZetaChain for Withdrawals
        const chainToUse = isDeposit ? activeChain : SUPPORTED_CHAINS[0]; // TODO add 7001 for testnet

        if (token.isNative) {
          if (!isLoading && !isError && walletBalance) {
            setBalance(walletBalance.displayValue || "0");
          } else {
            setBalance("0");
          }
        } else {
          const contract = getContract({
            client,
            chain: activeChain, // ✅ Ensure ZetaChain is used for withdraws
            address: token.address as Address,
          });

          const { value, decimals } = await getBalance({
            contract,
            address: userAddress as Address,
          });

          setBalance(ethers.formatUnits(value, decimals) || "0");
        }
      } catch (error) {
        console.error("Error fetching wallet data: ", error);
      }
    };

    fetchTokenBalance();
  }, [token?.address, userAddress, token?.balance, walletBalance, isLoading, isError, transactionCompleted, isDeposit]); // ✅ Add isDeposit as a dependency

  return balance;
}

export type ConversionOutput = {
  assetsConversionInUSDFormatted: string,
  outputAmountFormatted: string,
  outputAmountInUSDFormatted: string
}

export default function VaultInputs({
  vaultData,
  setTransactionCompleted,
  userVaultBalance,
  vaultTotalAssetinToken,
  transactionCompleted
}: VaultInputsProps): JSX.Element {
  const [inputToken, setInputToken] = useState<Token>();
  const [inputBalance, setInputBalance] = useState<Balance>(EMPTY_BALANCE);
  const [debouncedInputBalance, setDebouncedInputBalance] = useState<Balance>(EMPTY_BALANCE);
  const [inputTokenBalance, setInputTokenBalance] = useState<string>("0");
  const [isDeposit, setIsDeposit] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [allowInput, setAllowInput] = useState<boolean>(false);

  const [steps, setSteps] = useState<Action[]>([]);
  const [step, setStep] = useState<number>(0);
  const [action, setAction] = useState<Action>(steps[0])

  // const initialOutputBalance: OutputBalance = useMemo(() => ({
  //   amountFormatted: '0',
  //   amountUSDFormatted: '0'
  // }), [])

  const initialConversionOutput: ConversionOutput = useMemo(() => ({
    assetsConversionInUSDFormatted: '0',
    outputAmountFormatted: '0',
    outputAmountInUSDFormatted: '0'
  }), [])

  const [loadingOutputToken, setLoadingOutputToken] = useState(false);
  const [conversionOutput, setConversionOutput] = useState<ConversionOutput>(initialConversionOutput);

  const EOAaccount = useActiveAccount();
  const activeChain = useActiveWalletChain();

  if (!EOAaccount) {
    throw new Error("No active account found");
  }

  if (!activeChain) {
    throw new Error("No active chain found");
  }

  const userAddress = EOAaccount.address;
  const inputTokenPrice = useTokenPriceBySymbol(inputToken?.symbol)
  const vaultTokenPrice = useTokenPriceBySymbol(vaultData.inputToken?.symbol)

  const vaultToken: Token = useMemo(() => {
    return {
      symbol: vaultData.symbol,
      decimals: vaultData.inputToken.decimals,
      address: vaultData.id as Address,
      imgURL: "",
      price: 1,
      balance: EMPTY_BALANCE,
      isNative: false
    };
  }, [vaultData.id, vaultData.inputToken.decimals, vaultData.symbol])

  // Set input token by filtering approved tokens based on user connected chain
  useEffect(() => {
    if (!inputToken) {
      if (activeChain.id === 7001 || activeChain.id === 7000) {
        // If on ZetaChain testnet, set inputToken to the vault token
        setInputToken(vaultData.inputToken);

      } else {
        // On other chains, use APPROVED_TOKENS to set available tokens
        setInputToken(determineVaultTokenFromApprovedTokens(activeChain.id, vaultData.inputToken)); // Set to the first approved token as a default
      }

      setAllowInput(true);
    }
  }, [activeChain.id, inputToken, vaultData.inputToken]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const tokenBalance = useTokenBalance(inputToken, userAddress, activeChain, transactionCompleted, isDeposit);

  // Watch action type change
  useEffect(() => {
    if (inputToken) {
      console.log("tokenBalance", tokenBalance)
      // Set the inputTokenBalance separately to track balance as a string
      setInputTokenBalance(tokenBalance);
      setInputBalance({
        ...inputBalance,
        formatted: "0",
      })
    }
  }, [tokenBalance, isDeposit]);

  // Trigger error message handling
  useEffect(() => {
    if (inputToken && vaultTotalAssetinToken) {
      if (isDeposit) {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, inputTokenBalance, steps));
      } else {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, vaultTotalAssetinToken.toString(), steps));
      }
    }
  }, [inputToken, inputBalance.formatted, isDeposit, inputTokenBalance, vaultData.id, action, vaultTotalAssetinToken, steps]);

  // Watch input balance and trigger steps config selection
  useEffect(() => {
    const fetchData = async () => {
      if (Number(inputBalance.value) != 0 && inputToken) {
        const actionType = isDeposit ? SmartVaultActionType.Deposit : SmartVaultActionType.Withdrawal;
        const newStepsConfig = await selectActions(actionType, vaultData, activeChain, EOAaccount, inputBalance, inputToken);
        setSteps(newStepsConfig)
        console.log("SETTING ACTION STEPS: ", newStepsConfig, newStepsConfig.map(e => Action[e]))
      } else {
        setSteps([]);
      }
    };
    // Call the async function
    fetchData();
  }, [inputBalance.value, inputToken?.address, activeChain?.id, inputBalance, inputToken, isDeposit, vaultData, activeChain, EOAaccount])

  function handleTokenSelect(selectedToken: Token): void {
    console.log("Token selected:", selectedToken); // Debug log
    setInputToken(selectedToken);
    setAllowInput(true);
  }

  async function switchTokens() {
    if (!EOAaccount) {
      throw new Error("No active account found");
    }
    setInputBalance(EMPTY_BALANCE);
    if (inputToken && activeChain) {
      if (isDeposit) {
        // Switch to Withdraw
        setIsDeposit(false);
        const newAction = SmartVaultActionType.Withdrawal;
        setSteps(await selectActions(newAction, vaultData, activeChain, EOAaccount, inputBalance, inputToken));

      } else {
        // Switch to Deposit
        setIsDeposit(true);
        const newAction = SmartVaultActionType.Deposit;
        activeChain.id === 7001 || activeChain.id === 7000 ? setInputToken(vaultData.inputToken) : setInputToken(determineVaultTokenFromApprovedTokens(activeChain.id, vaultData.inputToken));
        setSteps(await selectActions(newAction, vaultData, activeChain, EOAaccount, inputBalance, inputToken));
      }
    }
  }

  function handleChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!inputToken) return;
    let value = e.currentTarget.value;

    const [integers, decimals] = String(value).split('.');
    let inputAmt = value;

    const decimalsNumber = isDeposit ? inputToken.decimals : vaultToken.decimals;
    // if precision is more than token decimal, cut it
    if (decimals?.length > decimalsNumber) {
      inputAmt = `${integers}.${decimals.slice(0, decimalsNumber)}`;
    }

    // convert string amt to bigint
    const newAmt = parseUnits(inputAmt, decimalsNumber);
    setInputBalance({ value: newAmt, formatted: inputAmt, formattedUSD: String(Number(inputAmt) * inputTokenPrice) });
  }

  function handleMaxClick() {
    if (!inputToken) return;
    if (isDeposit) {
      handleChangeInput({ currentTarget: { value: inputTokenBalance } } as React.ChangeEvent<HTMLInputElement>);
    } else {
      handleChangeInput({ currentTarget: { value: vaultTotalAssetinToken?.toString() } } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  const tokenList = useMemo(() => {
    return activeChain.id === 7001 || activeChain.id === 7000
        ? vaultData.inputToken ? [vaultData.inputToken] : []  // Ensure vault token is defined
        : (APPROVED_TOKENS[activeChain.id] ?? []).filter((token): token is Token => token !== undefined) // Ensure array is valid

  }, [activeChain.id, vaultData.inputToken])

  const getWithdrawOutputAmount = useCallback(async () => {
    const assetsAmount = await getAssetsFromShares(debouncedInputBalance.value, vaultData);
    const inputTokenAddress = isZetachain(activeChain.id) ? inputToken?.address : inputToken?.ZRC20equivalent;

    let tokenConversionAmount = assetsAmount;
    if (inputTokenAddress !== vaultData.inputToken.address) {
      tokenConversionAmount = await getAmountOutFromSwap(assetsAmount, vaultData.inputToken.address, inputTokenAddress as Address, vaultData);
    }
    console.log("COMPARE THESE: ", {
      assetsAmount,
      tokenConversionAmount,
    });
    setConversionOutput({
      assetsConversionInUSDFormatted: formatCurrency(((Number(assetsAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice)).toString(),
      outputAmountFormatted: (Number(tokenConversionAmount) / 10 ** (inputToken?.decimals ?? 18)).toString(),
      outputAmountInUSDFormatted: formatCurrency(((Number(tokenConversionAmount) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice)).toString()
    });
    setLoadingOutputToken(false);
  }, [activeChain.id, debouncedInputBalance.value, inputToken?.ZRC20equivalent, inputToken?.address, inputToken?.decimals, inputTokenPrice, vaultData, vaultTokenPrice])

  const getDepositOutputAmount = useCallback(async () => {
    const inputTokenAddress = isZetachain(activeChain.id) ? inputToken?.address : inputToken?.ZRC20equivalent;

    let assetsConversionAmount: bigint = debouncedInputBalance.value;
    if (inputTokenAddress !== vaultData.inputToken.address) {
      assetsConversionAmount = await getAmountOutFromSwap(debouncedInputBalance.value, inputTokenAddress as Address, vaultData.inputToken.address, vaultData);
    }

    const sharesAmountFormatted = await getSharesFromDeposit(assetsConversionAmount, vaultData);

    console.log("COMPARE THESE: ", {
      assetsAmount: assetsConversionAmount,
      tokenConversionAmount: debouncedInputBalance.value,
    });
    const assetsConversionInUSDFormatted = formatCurrency(((Number(assetsConversionAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice)).toString();
    setConversionOutput({
      assetsConversionInUSDFormatted,
      outputAmountFormatted: sharesAmountFormatted,
      outputAmountInUSDFormatted: assetsConversionInUSDFormatted
    });
    setLoadingOutputToken(false);
  }, [activeChain.id, debouncedInputBalance.value, inputToken?.ZRC20equivalent, inputToken?.address, vaultData, vaultTokenPrice])

  const timeoutRef = useRef<NodeJS.Timeout>();

  // Debounce the input balance in order to calculate the output amount
  useEffect(() => {
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
  }, [initialConversionOutput, inputBalance]);

  useEffect(() => {
    if (!debouncedInputBalance.formatted || Number(debouncedInputBalance.formatted) <= 0) {
      setLoadingOutputToken(false);
      setConversionOutput(initialConversionOutput);
      return;
    }
    console.log("Last called:::=========", debouncedInputBalance.formatted)
    console.log("EXECUTING HERE STILL!")
    if (isDeposit) getDepositOutputAmount()
    else getWithdrawOutputAmount()
  }, [debouncedInputBalance]);

  return (
    <>
      <TabSelector
          className="mb-5"
          availableTabs={["Deposit", "Withdraw"]}
          activeTab={isDeposit ? "Deposit" : "Withdraw"}
          setActiveTab={switchTokens}
      />
      <InputTokenWithError
        captionText={isDeposit ? "Deposit Amount" : "Withdraw Amount"}
        onSelectToken={isDeposit ? handleTokenSelect : () => {}}
        allowInput={allowInput}
        vaultData={vaultData}
        onMaxClick={handleMaxClick}
        value={inputBalance.formatted}
        onChange={handleChangeInput}
        selectedToken={isDeposit ? inputToken : vaultToken}
        inputTokenbalance={isDeposit ? inputTokenBalance : vaultTotalAssetinToken?.toString() ?? "0"}
        errorMessage={errorMessage}
        tokenList={isDeposit ? tokenList : []}
        disabled={false}
        isDeposit={isDeposit}
        userVaultBalance={isDeposit ? userVaultBalance : vaultTotalAssetinToken?.toString() ?? "0"}
        loadingOutputToken={loadingOutputToken}
        conversionOutput={conversionOutput}
      />
      <div className='pt-4 pb-2 flex items-center gap-3'>
        <div className='w-full h-px bg-tuatara-900'></div>
        <button className='group flex-center hover:border-white' onClick={switchTokens}>
          <ArrowDownCircleIcon width={48} height={48} className='size-12 text-tuatara-900 group-hover:text-tuatara-300 transition-colors'/>
        </button>
        <div className='w-full h-px bg-tuatara-900'></div>
      </div>
      <InputTokenWithError
          captionText={"Output amount"}
          onSelectToken={isDeposit ? () => {} : handleTokenSelect}
          allowInput={allowInput}
          vaultData={vaultData}
          onMaxClick={() => {}}
          value={conversionOutput.outputAmountFormatted}
          onChange={() => {}}
          selectedToken={isDeposit ? vaultToken : inputToken}
          inputTokenbalance={isDeposit ? vaultTotalAssetinToken?.toString() ?? "0" : inputTokenBalance}
          errorMessage={''}
          tokenList={isDeposit ? [] : tokenList}

          disabled={false}
          isDeposit={isDeposit}
          userVaultBalance={isDeposit ? vaultTotalAssetinToken?.toString() ?? "0" : userVaultBalance}
          isOutput={true}
          loadingOutputToken={loadingOutputToken}
          conversionOutput={conversionOutput}
      />
      <div className="mt-4">
        <p className="text-white font-bold mb-2 text-start">Fee Breakdown</p>
        <div className="bg-customNeutral200 py-2 px-4 rounded-lg space-y-2">
          <span className="flex flex-row items-center justify-between text-white">
            <p>Deposit Fee</p>
          </span>
          <span className="flex flex-row items-center justify-between text-white">
            <p>Withdrawal Fee</p>
          </span>
          <span className="flex flex-row items-center justify-between text-white">
            <p>Management Fee</p>
          </span>
          <span className="flex flex-row items-center justify-between text-white">
            <p>Performance Fee</p>
          </span>
        </div>
      </div>

      {inputToken && (
        <InteractionContainer
          step={step}
          setStep={setStep}
          action={action}
          setAction={setAction}
          _inputToken={inputToken}
          _inputBalance={inputBalance}
          vaultData={vaultData}
          EOAaccount={EOAaccount}
          setTransactionCompleted={setTransactionCompleted}
          activeChain={activeChain}
          _action={steps[0]}
          actions={steps}
          setInputBalance={setInputBalance}
          errorMessage={errorMessage}
          isDeposit={isDeposit}
        />
      )}
    </>
  );
}
