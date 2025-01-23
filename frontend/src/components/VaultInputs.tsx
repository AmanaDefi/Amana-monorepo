import TabSelector from "@/components/common/TabSelector";
import InputTokenWithError from "@/components/input/InputTokenWithError";
import { VaultData, Token, Balance, SmartVaultActionType, VaultTotalAssetsinToken, Action } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { Address, getContract } from "thirdweb";
import { useActiveAccount, useActiveWalletChain, useWalletBalance } from "thirdweb/react";
import { client } from "@/utils/client";
import { APPROVED_TOKENS } from "@/constants/chainConfig";
import { getBalance } from "thirdweb/extensions/erc20";
import {determineVaultTokenFromApprovedTokens, getVaultErrorMessage, selectActions} from "@/utils/utils";
import { ethers } from "ethers";
import InteractionContainer from "./interact";

export interface VaultInputsProps {
  vaultData: VaultData;
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalance?: string;
  vaultTotalAssetinToken?: VaultTotalAssetsinToken,
  transactionCompleted: boolean
}

// Custom hook to fetch token balance, including native tokens
function useTokenBalance(token: Token | undefined, userAddress: string | undefined, activeChain: any, transactionCompleted: Boolean) {
  const [balance, setBalance] = useState<string>("0");
  const { data: walletBalance, isLoading, isError } = useWalletBalance({
    chain: activeChain,
    address: userAddress,
    client,
  });

  useEffect(() => {
    const fetchTokenBalance = async () => {
      try {
        if (!token || !userAddress || !activeChain) return;
        if (token.isNative) {
          if (!isLoading && !isError && walletBalance) {
            // Fetch native token balance (ETH, BNB, MATIC, etc.)
            setBalance(walletBalance.displayValue || "0");
          }
          else {
            setBalance("0");
          }
        } else {
          // Fetch ERC-20 token balance
          const contract = getContract({ client, chain: activeChain, address: token.address as Address });
          const { value, decimals } = await getBalance({ contract, address: userAddress as Address });
          const formattedBalance = ethers.formatUnits(value, decimals);
          setBalance(formattedBalance || "0");
        }
      } catch (error) {
        console.error("Error fetching wallet data: ", error);
      }
    };

    fetchTokenBalance();
  }, [token?.address, userAddress, token?.balance, walletBalance, isLoading, isError, transactionCompleted]);

  return balance;
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
  const [inputTokenBalance, setInputTokenBalance] = useState<string>("0");
  const [isDeposit, setIsDeposit] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [allowInput, setAllowInput] = useState<boolean>(false);

  const [steps, setSteps] = useState<Action[]>([]);
  const [step, setStep] = useState<number>(0);
  const [action, setAction] = useState<Action>(steps[0])

  const EOAaccount = useActiveAccount();
  const activeChain = useActiveWalletChain();

  if (!EOAaccount) {
    throw new Error("No active account found");
  }

  if (!activeChain) {
    throw new Error("No active chain found");
  }

  const userAddress = EOAaccount.address;

  // Set input token by filtering approved tokens based on user connected chain
  useEffect(() => {
    if (activeChain.id === 7001 || activeChain.id === 7000) {
      // If on ZetaChain testnet, set inputToken to the vault token
      setInputToken(vaultData.inputToken);

    } else {
      // On other chains, use APPROVED_TOKENS to set available tokens
      setInputToken(determineVaultTokenFromApprovedTokens(activeChain.id, vaultData.inputToken)); // Set to the first approved token as a default
    }

    setAllowInput(true);
  }, [activeChain.id, vaultData.inputToken, isDeposit]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const tokenBalance = useTokenBalance(inputToken, userAddress, activeChain, transactionCompleted);

  // Watch action type change
  useEffect(() => {
    if (inputToken) {
      setShowModal(false)

      // Set the inputTokenBalance separately to track balance as a string
      setInputTokenBalance(tokenBalance);
      setInputBalance({
        ...inputBalance,
        formatted: "0",
      })
      steps.length > 0 && setShowModal(true)
    }
  }, [tokenBalance, isDeposit]);

  // Trigger error message handling
  useEffect(() => {
    if (inputToken && vaultTotalAssetinToken) {
      if (isDeposit) {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, inputTokenBalance, setShowModal, steps));
      } else {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, vaultTotalAssetinToken.toString(), setShowModal, steps));
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
      }
    };
    // Call the async function
    fetchData();
  }, [inputBalance.value, inputToken?.address, activeChain.id])

  function handleTokenSelect(selectedToken: Token): void {
    setInputToken(selectedToken);
    setAllowInput(true);
  }

  async function switchTokens() {
    if (!EOAaccount) {
      throw new Error("No active account found");
    }
    setInputBalance(EMPTY_BALANCE);
    if (inputToken) {
      if (isDeposit) {
        // Switch to Withdraw

        setIsDeposit(false);
        const newAction = SmartVaultActionType.Withdrawal;
        setSteps(await selectActions(newAction, vaultData, activeChain, EOAaccount, inputBalance, inputToken));

      } else {
        // Switch to Deposit
        setIsDeposit(true);
        const newAction = SmartVaultActionType.Deposit;
        setSteps(await selectActions(newAction, vaultData, activeChain, EOAaccount, inputBalance, inputToken));
      }
    }
  }

  function handleChangeInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!inputToken) return;
    let value = e.currentTarget.value;

    const [integers, decimals] = String(value).split('.');
    let inputAmt = value;

    // if precision is more than token decimal, cut it
    if (decimals?.length > inputToken.decimals) {
      inputAmt = `${integers}.${decimals.slice(0, inputToken.decimals)}`;
    }

    // convert string amt to bigint
    const newAmt = parseUnits(inputAmt, inputToken.decimals);

    setInputBalance({ value: newAmt, formatted: inputAmt, formattedUSD: String(Number(inputAmt) * (inputToken.price || 0)) });
  }

  function handleMaxClick() {
    if (!inputToken) return;
    if (isDeposit) {
      handleChangeInput({ currentTarget: { value: inputTokenBalance } } as React.ChangeEvent<HTMLInputElement>);
    } else {
      handleChangeInput({ currentTarget: { value: userVaultBalance } } as React.ChangeEvent<HTMLInputElement>);
    }
  }

  return (
    <>
      <TabSelector
        className="mb-6"
        availableTabs={["Deposit", "Withdraw"]}
        activeTab={isDeposit ? "Deposit" : "Withdraw"}
        setActiveTab={switchTokens}
      />
      <InputTokenWithError
        captionText={isDeposit ? "Deposit Amount" : "Withdraw Amount"}
        onSelectToken={handleTokenSelect}
        allowInput={allowInput}
        vaultData={vaultData}
        onMaxClick={handleMaxClick}
        value={inputBalance.formatted}
        onChange={handleChangeInput}
        selectedToken={inputToken}
        inputTokenbalance={inputTokenBalance}
        errorMessage={errorMessage}
        tokenList={activeChain.id === 7001 || activeChain.id === 7000 ? [vaultData.inputToken] : APPROVED_TOKENS[activeChain.id]}
        disabled={false}
        isDeposit={isDeposit}
        userVaultBalance={userVaultBalance}
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

      {inputToken && showModal && (
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
          setShowModal={setShowModal}
          setInputBalance={setInputBalance}
        />
      )}
    </>
  );
}
