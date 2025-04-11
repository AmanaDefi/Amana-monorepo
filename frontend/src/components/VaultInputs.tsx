import TabSelector from "@/components/common/TabSelector";
import InputTokenWithError, { InputTokenWithErrorProps } from "@/components/input/InputTokenWithError";
import { VaultData, Token, Balance, SmartVaultActionType, VaultTotalAssetsinToken, Action } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Account, parseUnits } from "viem";
import { Address, Chain, getContract, readContract } from "thirdweb";
import { useActiveAccount, useActiveWalletChain, useWalletBalance } from "thirdweb/react";
import { client } from "@/utils/client";
import { APPROVED_TOKENS, SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { getBalance } from "thirdweb/extensions/erc20";
import {
  determineVaultTokenFromApprovedTokens,
  formatCurrency, getCurrentSlippage,
  getVaultErrorMessage,
  isZetachain,
  selectActions
} from "@/utils/utils";
import { ethers } from "ethers";
import InteractionContainer from "./interact";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { ArrowDownCircleIcon } from "@heroicons/react/24/outline";
import { getAmountOutFromSwap, getAssetsFromShares, getPerformanceFee, getSharesFromDeposit } from "@/actions/actions";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useMultichainTokenBalance } from "@/hooks/useMultichainTokenBalance";
import { ZRC20_TOKENS_BY_ADDRESS } from "@/constants/ZRC20TokensByAddress";

export interface VaultInputsProps {
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalance?: string;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken,
  transactionCompleted: boolean
}

export type ConversionOutput = {
  slippageActualValue: number | null
  finalConvertedAmountInUSDFormatted: string,
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
  const [isSlippageExceedingLimit, setIsSlippageExceedingLimit] = useState<boolean>(true);
  const [outputBoxErrorMessage, setOutputBoxErrorMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [allowInput, setAllowInput] = useState<boolean>(false);

  const [steps, setSteps] = useState<Action[]>([]);
  const [step, setStep] = useState<number>(0);
  const [action, setAction] = useState<Action>(steps[0])
  const [performanceFee, setPerformanceFee] = useState<number>(0);

  useEffect(() => {
    async function handlePerformanceFee() {
      const perfFee = await getPerformanceFee(vaultData.id as Address);
      const percentagePerformanceFee = Number((perfFee / 100).toFixed(2));
      setPerformanceFee(percentagePerformanceFee);
    }
    handlePerformanceFee()
  }, [vaultData]);

  // const initialOutputBalance: OutputBalance = useMemo(() => ({
  //   amountFormatted: '0',
  //   amountUSDFormatted: '0'
  // }), [])

  const initialConversionOutput: ConversionOutput = useMemo(() => ({
    slippageActualValue: null,
    finalConvertedAmountInUSDFormatted: '0',
    outputAmountFormatted: '0',
    outputAmountInUSDFormatted: '0'
  }), [])

  const [loadingOutputToken, setLoadingOutputToken] = useState(false);
  const [conversionOutput, setConversionOutput] = useState<ConversionOutput>(initialConversionOutput);

  const { activeChain, walletAddress } = useMultiChain();

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
    if (activeChain?.id === 7001 || activeChain?.id === 7000) {
      // If on ZetaChain testnet, set inputToken to the vault token
      setInputToken(vaultData.inputToken);
    } else {
      // On other chains, use APPROVED_TOKENS to set available tokens
      setInputToken(determineVaultTokenFromApprovedTokens(activeChain?.id as number, vaultData.inputToken)); // Set to the first approved token as a default
    }

    setAllowInput(true);
  }, [activeChain, vaultData]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const tokenBalance = useMultichainTokenBalance(inputToken);

  // Reset token when chain changes to prevent cross-chain token errors
  useEffect(() => {
    // Clear token selection and balance when the active chain changes
    // This prevents the app from attempting to use a token from the previous chain
    // which could cause AbiDecodingZeroDataError when fetching token balances
    if (activeChain?.id) {
      setInputToken(undefined);
      setInputBalance(EMPTY_BALANCE);
    }
  }, [activeChain?.id]);

  // Watch action type change
  useEffect(() => {
    if (inputToken) {
      // Set the inputTokenBalance separately to track balance as a string
      setInputTokenBalance(tokenBalance!.formatted);
      setInputBalance({
        ...tokenBalance,
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
        const newStepsConfig = await selectActions(actionType, vaultData, activeChain as Chain, walletAddress as any, inputBalance, inputToken);
        setSteps(newStepsConfig)
        console.log("SETTING ACTION STEPS: ", newStepsConfig, newStepsConfig.map(e => Action[e]))
      } else {
        setSteps([]);
      }
    };
    // Call the async function
    fetchData();
  }, [inputBalance, inputToken?.address, activeChain?.id, inputToken, isDeposit, vaultData, activeChain, walletAddress])

  // Replace the handleTokenSelect function with this improved version
  const handleTokenSelect = (selectedToken: Token) => {
    console.log("Selected token:", selectedToken);
    
    // If the selected token is the vault token but from a different chain,
    // we should still use it directly without trying to find an equivalent
    if (selectedToken.address === vaultData.inputToken.address) {
      console.log("Selected vault token directly");
      setInputToken(selectedToken);
      setAllowInput(true);
      return;
    }
    
    // Otherwise, use the token as selected
    setInputToken(selectedToken);
    setAllowInput(true);
  };

  async function switchTokens() {
    setInputBalance(EMPTY_BALANCE);
    
    // Remove condition requiring inputToken to switch between deposit and withdrawal modes
    if (isDeposit) {
      // Switch to Withdraw
      setIsDeposit(false);
      
      // Only attempt to set steps if we have a token and chain
      if (inputToken && activeChain) {
        const newAction = SmartVaultActionType.Withdrawal;
        setSteps(await selectActions(newAction, vaultData, activeChain, walletAddress as any, inputBalance, inputToken));
      }
    } else {
      // Switch to Deposit
      setIsDeposit(true);
      
      // Only attempt to set steps if we have a token and chain
      if (inputToken && activeChain) {
        const newAction = SmartVaultActionType.Deposit;
        setSteps(await selectActions(newAction, vaultData, activeChain, walletAddress as any, inputBalance, inputToken));
      }
    }
  }

  const handleChangeInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!inputToken) return;
    let value = e.currentTarget.value;

    // Format the number properly
    if (!value.includes('.')) {
      value = String(Number(value));
    }
    else {
      const [integers, decimals] = value.split('.');
      const cleanIntegers = String(Number(integers));
      value = `${cleanIntegers}.${decimals}`;
    }

    const [integers, decimals] = value.split('.');
    let inputAmt = value;

    const decimalsNumber = isDeposit ? inputToken.decimals : vaultToken.decimals;
    if (decimals?.length > decimalsNumber) {
      inputAmt = `${integers}.${decimals.slice(0, decimalsNumber)}`;
    }

  // convert string amt to bigint
  const newAmt = parseUnits(inputAmt, decimalsNumber);
    
  setInputBalance({ value: newAmt, formatted: inputAmt, formattedUSD: String(Number(inputAmt) * inputTokenPrice) });


  }, [inputToken, inputTokenPrice, isDeposit, vaultToken.decimals])

  const handleMaxClick = useCallback(() => {
    if (!inputToken) return;
    if (isDeposit) {
      // handleChangeInput({ currentTarget: { value: inputTokenBalance } } as React.ChangeEvent<HTMLInputElement>);
      setInputBalance(tokenBalance);
    } else {
      handleChangeInput({ currentTarget: { value: vaultTotalAssetinToken?.toString() } } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [handleChangeInput, inputToken, tokenBalance, isDeposit, vaultTotalAssetinToken])

  const tokenList = useMemo(() => {
    let tokens: Token[] = [];
    
    if (activeChain?.id === 7001 || activeChain?.id === 7000) {
      // For ZetaChain, include both the vault's input token AND the approved tokens
      tokens = [...(APPROVED_TOKENS[activeChain.id] || [])];
      
      // Check if the vault's input token is already in the list
      const vaultTokenExists = tokens.some(token => 
        token.address === vaultData.inputToken.address
      );
      
      // Add vault token if it doesn't already exist in the list
      if (!vaultTokenExists && vaultData.inputToken) {
        tokens.push(vaultData.inputToken);
      }
    } else {
      // For other chains, use approved tokens as before
      tokens = (APPROVED_TOKENS[activeChain?.id as number] ?? [])
        .filter((token): token is Token => token !== undefined);
    }
    
    // Make sure we always have at least one token in the list
    // This ensures the token selector is always visible
    if (tokens.length === 0 && vaultData.inputToken) {
      tokens.push(vaultData.inputToken);
    }
    
    return tokens;
  }, [activeChain?.id, vaultData.inputToken]);

  const getWithdrawOutputAmount = useCallback(async (inputAmountValue: bigint) => {
    console.log('Double Box - Starting getWithdrawOutputAmount:', {
      inputAmountValue: inputAmountValue.toString(),
    });
    const assetsAmount = await getAssetsFromShares(inputAmountValue, vaultData);
    console.log('Double Box - Assets from shares:', {
      assetsAmount: assetsAmount.toString(),
    });
    const actualInputToken = isZetachain(activeChain?.id as number) ? inputToken : inputToken?.ZRC20equivalent;
    if(!actualInputToken) return;
    console.log('Double Box - Token addresses:', {
      inputToken: actualInputToken?.address,
      isZetachain: isZetachain(activeChain?.id as number),
      vaultInputToken: vaultData.inputToken.address
    });
    let tokenConversionAmount = assetsAmount;
    if (actualInputToken.address !== vaultData.inputToken.address) {
      tokenConversionAmount = await getAmountOutFromSwap(assetsAmount, vaultData.inputToken, actualInputToken, vaultData.id as Address);
    }
    console.log('Double Box - Conversion amounts:', {
      tokenConversionAmount: tokenConversionAmount.toString(),
    });

    const assetsConversionInUSD = (Number(assetsAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
    const tokenConversionFromWei = Number(tokenConversionAmount) / 10 ** (inputToken?.decimals ?? 18);
    const tokenConversionInUSD = tokenConversionFromWei * inputTokenPrice;

    const slippageActualValue = Math.max(0, 100 - ((tokenConversionInUSD * 100) / assetsConversionInUSD));

    if (inputAmountValue === debouncedInputBalance.value) {
      console.log('Double Box - Conversion Output:', {
        slippageActualValue: Number(slippageActualValue.toFixed(2)),
        finalConvertedAmountInUSDFormatted: formatCurrency(assetsConversionInUSD).toString(),
        outputAmountFormatted: (tokenConversionFromWei).toString(),
        outputAmountInUSDFormatted: formatCurrency(tokenConversionInUSD).toString()
      });
      setConversionOutput({
        slippageActualValue: Number(slippageActualValue.toFixed(2)),
        finalConvertedAmountInUSDFormatted: formatCurrency(assetsConversionInUSD).toString(),
        outputAmountFormatted: (tokenConversionFromWei).toString(),
        outputAmountInUSDFormatted: formatCurrency(tokenConversionInUSD).toString()
      });
    }
    setLoadingOutputToken(false);
  }, [activeChain?.id, debouncedInputBalance.value, inputToken?.ZRC20equivalent, inputToken?.address, inputToken?.decimals, inputTokenPrice, vaultData, vaultTokenPrice])

  const getDepositOutputAmount = useCallback(async (inputAmountValue: bigint) => {
    console.log('Double Box - Starting getDepositOutputAmount:', {
      inputAmountValue: inputAmountValue.toString(),
    });
    const actualInputToken = isZetachain(activeChain?.id as number) ? inputToken : inputToken?.ZRC20equivalent;
    console.log("inputToken: ", inputToken)
    console.log("inputToken.ZRC20equivalent: ", inputToken?.ZRC20equivalent)
    console.log("actualInputToken: ", actualInputToken)
    if(!actualInputToken) return;
    console.log('Double Box - 🏦 Token addresses:', {
      inputToken: actualInputToken.address,
      isZetachain: isZetachain(activeChain?.id as number),
      vaultInputToken: vaultData.inputToken.address
    });
    let assetsConversionAmount: bigint = inputAmountValue;
    if (actualInputToken.address !== vaultData.inputToken.address) {
      assetsConversionAmount = await getAmountOutFromSwap(inputAmountValue, actualInputToken, vaultData.inputToken, vaultData.id as Address);
    }

    console.log('Double Box - Pre Gas Conversion amounts:', {
      assetsConversionAmount: assetsConversionAmount.toString(),
    });

    // 2. Fetch gas fee info from the ZRC20 token
    const vaultContract = getContract({
      client,
      chain: SUPPORTED_CHAINS[0],
      address: vaultData.id as Address,
    })
    const depositFeePaidFromGasTank = await readContract({
      contract: vaultContract,
      method: "function depositFeePaidFromGasTank() view returns (bool)",
    });
    let gasFeeInVaultAsset = BigInt(0);
    if (!depositFeePaidFromGasTank) {
      const gasLimitForWithdrawAndCall = await readContract({
        contract: vaultContract,
        method: "function gasLimitForWithdrawAndCall() view returns (uint256)",
      });
      const tokenContract = getContract({
        client,
        chain: SUPPORTED_CHAINS[0],
        address: vaultData.inputToken.address as Address,
      })
      const result = await readContract({
        contract: tokenContract,
        method: "function withdrawGasFeeWithGasLimit(uint256) view returns (address,uint256)",
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
    }
    
  // 4. Subtract gas fee from converted amount
  const finalConvertedAmount = assetsConversionAmount - gasFeeInVaultAsset;

  console.log('Double Box - Final converted amount after gas fee:', {
    finalConvertedAmount: finalConvertedAmount.toString(),
    gasFeeInVaultAsset: gasFeeInVaultAsset.toString(),
  });

    const sharesAmountFormatted = await getSharesFromDeposit(finalConvertedAmount, vaultData);

    console.log('Double Box - Shares calculation:', {
      sharesAmountFormatted,
      finalConvertedAmount: finalConvertedAmount.toString()
    });
    const inputAmountValueInUSD = (Number(inputAmountValue) / 10 ** (inputToken?.decimals ?? 18)) * inputTokenPrice;
    const finalConvertedAmountInUSD = (Number(finalConvertedAmount) / 10 ** vaultData.inputToken.decimals) * vaultTokenPrice;
    const finalConvertedAmountInUSDFormatted = formatCurrency(finalConvertedAmountInUSD).toString();

    const slippageActualValue = (Math.max(0, 100 - ((finalConvertedAmountInUSD * 100) / inputAmountValueInUSD)));
    if (inputAmountValue === debouncedInputBalance.value) {
      console.log('Double Box - Conversion Output:', {
        slippageActualValue: Number(slippageActualValue.toFixed(2)),
        finalConvertedAmountInUSDFormatted,
        outputAmountFormatted: sharesAmountFormatted,
        outputAmountInUSDFormatted: finalConvertedAmountInUSDFormatted
      });
      setConversionOutput({
        slippageActualValue: Number(slippageActualValue.toFixed(2)),
        finalConvertedAmountInUSDFormatted,
        outputAmountFormatted: sharesAmountFormatted,
        outputAmountInUSDFormatted: finalConvertedAmountInUSDFormatted
      });
    }
    setLoadingOutputToken(false);
  }, [activeChain?.id, debouncedInputBalance.value, inputToken?.ZRC20equivalent, inputToken?.address, inputToken?.decimals, inputTokenPrice, vaultData, vaultTokenPrice])

  const timeoutRef = useRef<NodeJS.Timeout>();

  const checkSlippageExceedingLimit = () => {
    const userSlippage = getCurrentSlippage();
    if (userSlippage && conversionOutput.slippageActualValue !== null && userSlippage < conversionOutput.slippageActualValue) {
      setIsSlippageExceedingLimit(true);
      setOutputBoxErrorMessage(`Slippage of ${conversionOutput.slippageActualValue}% exceeds your maximum slippage setting of ${userSlippage}%`);
    } else {
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage('');
    }
  }

  // Ensure immediately change the conversion to 0 if user input is not valid
  useEffect(() => {
    if (!inputBalance.formatted || Number(inputBalance.formatted) <= 0) {
      setConversionOutput(initialConversionOutput);
      setDebouncedInputBalance(inputBalance);
      setIsSlippageExceedingLimit(false);
      setOutputBoxErrorMessage('');
      return;
    }
    checkSlippageExceedingLimit();
  }, [conversionOutput]);

  // Debounce the input balance in order to calculate the output amount
  useEffect(() => {
    setIsSlippageExceedingLimit(false);
    setOutputBoxErrorMessage('');
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
    setLoadingOutputToken(true);
    if (isDeposit) getDepositOutputAmount(debouncedInputBalance.value)
    else getWithdrawOutputAmount(debouncedInputBalance.value)
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
    console.log("Selected withdraw token:", token);
    setInputToken(token);
  };

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
        onSelectToken={isDeposit ? handleDepositTokenSelect : () => {}}
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
        isSlippageExceedingLimit={isSlippageExceedingLimit}
        setInputBalance={setInputBalance}
      />
      <div className='pt-4 pb-2 flex items-center gap-3'>
        <div className='w-full h-px bg-tuatara-900'></div>
        <button className='group flex-center hover:border-white' onClick={switchTokens}>
          <ArrowDownCircleIcon width={48} height={48} className='size-12 text-tuatara-900 group-hover:text-tuatara-300 transition-colors' />
        </button>
        <div className='w-full h-px bg-tuatara-900'></div>
      </div>
      <InputTokenWithError
        captionText={"Output amount"}
        onSelectToken={isDeposit ? () => {} : handleWithdrawTokenSelect}
        allowInput={allowInput}
        vaultData={vaultData}
        onMaxClick={() => { }}
        value={conversionOutput.outputAmountFormatted}
        onChange={() => { }}
        selectedToken={isDeposit ? vaultToken : inputToken}
        inputTokenbalance={isDeposit ? vaultTotalAssetinToken?.toString() ?? "0" : inputTokenBalance}
        errorMessage={!errorMessage ? outputBoxErrorMessage : ''}
        tokenList={isDeposit ? [] : tokenList}
        disabled={false}
        isDeposit={isDeposit}
        userVaultBalance={isDeposit ? vaultTotalAssetinToken?.toString() ?? "0" : userVaultBalance}
        isOutput={true}
        loadingOutputToken={loadingOutputToken}
        conversionOutput={conversionOutput}
        setInputBalance={setInputBalance}
      />
      <div className="mt-4">
        {
          conversionOutput.slippageActualValue !== null &&
          (
            <p className='text-white font-bold mb-2 text-start'>
              Estimated slippage value:
              <span className={`${isSlippageExceedingLimit ? 'text-red-500' : 'text-green-500'} whitespace-pre`}>{' '}{conversionOutput.slippageActualValue}%</span>
            </p>
          )
        }
        <p className="text-white font-bold mb-2 text-start">Fee Breakdown</p>
        <div className="bg-customNeutral200 py-2 px-4 rounded-lg">
          <span className="flex flex-row items-center justify-between text-white py-1">
            <p>Deposit Fee</p>
            <span className='font-bold'>0%</span>
          </span>
          <span className="flex flex-row items-center justify-between text-white py-1">
            <p>Withdrawal Fee</p>
            <span className='font-bold'>0%</span>
          </span>
          <span className="flex flex-row items-center justify-between text-white py-1">
            <p>Management Fee</p>
            <span className='font-bold'>0%</span>
          </span>
          <span className="flex flex-row items-center justify-between text-white py-1">
            <p>Performance Fee</p>
            <span className='font-bold'>{performanceFee}%</span>
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
          setTransactionCompleted={setTransactionCompleted}
          activeChain={activeChain as Chain}
          _action={steps[0]}
          actions={steps}
          setInputBalance={setInputBalance}
          errorMessage={errorMessage || outputBoxErrorMessage || ''}
          isDeposit={isDeposit}
        />
      )}
    </>
  );
}
