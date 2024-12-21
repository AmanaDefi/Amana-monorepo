import TabSelector from "@/components/common/TabSelector";
import InputTokenWithError from "@/components/input/InputTokenWithError";
import { VaultData, Token, Balance, UserVaultBalance, SmartVaultActionType } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { Address, getContract, defineChain, readContract } from "thirdweb";
import { useActiveAccount, useActiveWalletChain, useWalletBalance } from "thirdweb/react";
import { client } from "@/utils/client";
import { APPROVED_TOKENS } from "../constants/chainConfig";
import { getBalance } from "thirdweb/extensions/erc20";
import { getVaultErrorMessage, selectActions } from "@/utils/utils";
import { ethers } from "ethers";
import InteractionContainer from "./interact";

export interface VaultInputsProps {
  vaultData: VaultData;
  tokenOptions: Token[];
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalances: UserVaultBalance[];
}

// Custom hook to fetch token balance, including native tokens
function useTokenBalance(token: Token | undefined, userAddress: string | undefined, activeChain: any, userVaultBalances: UserVaultBalance[]) {
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
  }, [token?.address, userAddress, token?.balance, walletBalance, isLoading, isError, userVaultBalances]);

  return balance;
}

export default function VaultInputs({
  vaultData,
  tokenOptions,
  setTransactionCompleted,
  userVaultBalances,
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

  useEffect(() => {
    if (activeChain.id === 7001) {
      // If on ZetaChain testnet, set inputToken to the vault token
      setInputToken(vaultData.inputToken);

    } else {
      // On other chains, use APPROVED_TOKENS to set available tokens
      const approvedTokens = APPROVED_TOKENS[activeChain.id];
      setInputToken(approvedTokens ? approvedTokens[0] : undefined); // Set to the first approved token as a default
    }

    setAllowInput(true);
  }, [activeChain.id, vaultData.inputToken, isDeposit]);

  // Update inputTokenBalance state when useTokenBalance returns a new value
  const tokenBalance = useTokenBalance(inputToken, userAddress, activeChain, userVaultBalances);

  useEffect(() => {
    if (inputToken) {
      setShowModal(false)
      // Create a new inputToken object with the updated balance

      const updatedToken: Token = {
        ...inputToken,
        balance: {
          ...inputToken.balance,
          formatted: tokenBalance,
          value: parseUnits(tokenBalance, inputToken.decimals)
        },
      };

      // Update the inputToken state with the updated balance
      setInputToken(updatedToken);

      // Set the inputTokenBalance separately to track balance as a string
      setInputTokenBalance(tokenBalance);
      setInputBalance({
        ...inputBalance,
        value: parseUnits(tokenBalance, inputToken.decimals),
        formatted: "0",
      })
      steps.length > 0 && setShowModal(true)
    }
  }, [tokenBalance, isDeposit]);

  useEffect(() => {
   console.log("77777777777777777",inputBalance.value)
  }, [inputBalance.value])
  

  useEffect(() => {
    if (inputToken) {
      if (isDeposit) {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, inputTokenBalance, setShowModal, steps));
      } else {
        const userVaultBalance = userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance.toString();
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, userVaultBalance, setShowModal, steps));
      }
    }
  }, [inputToken, inputBalance.formatted, isDeposit, inputTokenBalance, userVaultBalances, vaultData.id, action]);

  useEffect(() => {
    const fetchData = async () => {
      if (Number(inputBalance.value) != 0 && inputToken) {
        isDeposit ? setSteps(await selectActions(SmartVaultActionType.Deposit, vaultData, activeChain, EOAaccount, inputBalance, inputToken))
          : setSteps(await selectActions(SmartVaultActionType.Withdrawal, vaultData, activeChain, EOAaccount, inputBalance, inputToken))
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
    if (isDeposit) {
      setErrorMessage(getVaultErrorMessage(value, inputTokenBalance, setShowModal, steps));
    } else {
      const userVaultBalance = userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance.toString();
      setErrorMessage(getVaultErrorMessage(value, userVaultBalance, setShowModal, steps));
    }
  }

  function handleMaxClick() {
    if (!inputToken) return;
    if (isDeposit) {
      handleChangeInput({ currentTarget: { value: inputTokenBalance } } as React.ChangeEvent<HTMLInputElement>);
    } else {
      const userVaultBalance = userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance || "0";
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
        errorMessage={errorMessage}
        tokenList={activeChain.id === 7001 || activeChain.id === 7000 ? [vaultData.inputToken] : APPROVED_TOKENS[activeChain.id]}
        disabled={false}
        isDeposit={isDeposit}
        userVaultBalances={userVaultBalances}
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

enum Action {
  depositApprove,
  depositApproveConfirmed,
  deposit,
  depositConfirmed,
  crosschainInvest,
  deposited,
  FundsInvest,
  withdraw,
  withdrawconfirmed,
  DivestSent,
  FundsDivested,
  ReturnFundsToUserSent,
  Withdrawn,
  CrossChainInvestFailed,
  DivestFailed,
  ReturnFundsToUserFailed
}
