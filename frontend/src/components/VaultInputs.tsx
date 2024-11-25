
import TabSelector from "@/components/common/TabSelector"
import InputTokenWithError from "@/components/input/InputTokenWithError"
import { executeDeposit, executeWithdrawal } from "@/actions/actions"
import { VaultData, Token, Balance } from "@/types/types";
import { EMPTY_BALANCE, NumberFormatter } from "@/utils/helpers";
import { ArrowDownIcon } from "@heroicons/react/24/outline"
import { useState, useEffect } from "react"
import { parseUnits } from "viem"
import MainActionButton from "@/components/button/MainActionButton"
import { Address, Chain, waitForReceipt, getContract } from "thirdweb";
import mixpanel from "mixpanel-browser";
import { useActiveAccount, useReadContract, useActiveWalletChain } from "thirdweb/react";
import { toast } from "react-toastify";
import { Account } from "thirdweb/wallets";
import { client } from "@/utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { getBalance } from "thirdweb/extensions/erc20";

export interface VaultInputsProps {
  vaultData: VaultData;
  tokenOptions: Token[];
  setTransactionCompleted: (value: boolean) => void;
}

export default function VaultInputs({
  vaultData,
  tokenOptions,
  setTransactionCompleted
}: VaultInputsProps): JSX.Element {
  const vault = tokenOptions.find(t => t.address === vaultData.inputToken.address)

  const [inputToken, setInputToken] = useState<Token>();
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const [inputBalance, setInputBalance] = useState<Balance>(EMPTY_BALANCE);
  const [isDeposit, setIsDeposit] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const EOAaccount = useActiveAccount();

  useEffect(() => {
    if (EOAaccount) {
      setActiveAccount(EOAaccount);
    } else {
      setActiveAccount(null);
    }
  }, [EOAaccount]);

  if (!EOAaccount) {
    throw new Error("No active account found");
  }

  const activeChain = useActiveWalletChain();

  if (!activeChain) {
    throw new Error("No active chain found");
  }

  function handleTokenSelect(input: Token): void {
    setInputToken(input);
  }

  const inputTokenContract = getContract({
    client,
    chain: SUPPORTED_CHAINS[0],
    address: inputToken?.address as Address,
  });

  const {
    refetch
  } = useReadContract(getBalance, {
    contract: inputTokenContract,
    address: activeAccount?.address as Address,
  });

  function switchTokens() {
    setInputBalance(EMPTY_BALANCE)

    if (isDeposit) {
      // Switch to Withdraw
      setInputToken(vault);
      setIsDeposit(false);

    } else {
      // Switch to Deposit
      setInputToken(undefined);
      setIsDeposit(true);
    }
  }

  function handleChangeInput(e: any) {
    if (!inputToken) return
    let value = e.currentTarget.value;

    const [integers, decimals] = String(value).split('.');
    let inputAmt = value;

    // if precision is more than token decimal, cut it
    if (decimals?.length > inputToken.decimals) {
      inputAmt = `${integers}.${decimals.slice(0, inputToken.decimals)}`;
    }

    // covert string amt to bigint
    const newAmt = parseUnits(inputAmt, inputToken.decimals)

    setInputBalance({ value: newAmt, formatted: inputAmt, formattedUSD: String(Number(inputAmt) * (inputToken.price || 0)) });
  }


  return <>
    <TabSelector
      className="mb-6"
      availableTabs={["Deposit", "Withdraw"]}
      activeTab={isDeposit ? "Deposit" : "Withdraw"}
      setActiveTab={switchTokens}
    />
    <InputTokenWithError
      captionText={isDeposit ? "Deposit Amount" : "Withdraw Amount"}
      onSelectToken={(option) =>
        handleTokenSelect(option)
      }
      value={inputBalance.formatted}
      onChange={handleChangeInput}
      selectedToken={inputToken}
      errorMessage={errorMessage}
      tokenList={tokenOptions}
      allowSelection={isDeposit}
      disabled={false}
      allowInput
    />
    <div className="relative mt-4">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-customGray500" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-customNeutral300 px-4">
          <ArrowDownIcon
            className="h-10 w-10 p-2 text-customGray500 border border-customGray500 rounded-full cursor-pointer hover:text-white hover:border-white"
            aria-hidden="true"
            onClick={switchTokens}
          />
        </span>
      </div>
    </div>
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


    {inputToken && inputBalance.value > 0 &&
      <InteractionContainer
        _inputToken={inputToken}
        _inputBalance={inputBalance}
        _action={isDeposit ? Action.deposit : Action.withdraw}
        vaultData={vaultData}
        EOAaccount={EOAaccount}
        setTransactionCompleted={setTransactionCompleted}
        refetch={refetch}
        activeChain={activeChain}
      />
    }
  </>
}

const handleDepositTransaction = async (vaultData: VaultData, inputBalance: Balance, inputToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, refetch: () => void, activeChain: any) => {
  setTransactionCompleted(false)
  try {
    const value = Number(inputBalance.value)
    const inputToken = vaultData.inputToken;
    const scaledAmount = BigInt(value)

    mixpanel.track("Deposit Submitted", {
      vault: vaultData.id.toString(),
      amount: scaledAmount.toString(),
    });
    const receipt = await executeDeposit(
      vaultData.id as Address,
      inputToken.address as Address,
      EOAaccount,
      activeChain,
      scaledAmount, //TODO make this general for all tokens?
    );

    mixpanel.track("Deposit Submitted", {
      vault: vaultData.id.toString(),
      amount: scaledAmount.toString(),
    });

    await waitForReceipt(receipt)
    toast.success("Transaction confirmed");

    refetch()
    setTransactionCompleted(true);
  } catch (error) {
    mixpanel.track("Deposit Submitted", {
      vault: vaultData.id.toString(),
    });
    toast.error("Transaction failed", {
      position: "top-right",
      autoClose: 2000,  // Close automatically after 2 seconds
    });
    throw new Error("Transaction failed");
  }
};

const handleWithdrawTransaction = async (vaultData: VaultData, inputBalance: Balance, inputToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, refetch: () => void, activeChain: any) => {
  setTransactionCompleted(false)
  try {
    const value = Number(inputBalance.value)



    const inputToken = vaultData.inputToken;
    const scaledAmount = BigInt(value * 10 ** inputToken.decimals)

    mixpanel.track("Withdraw Submitted", {
      vault: vaultData.id.toString(),
      amount: scaledAmount.toString(),
    });

    const receipt = await executeWithdrawal(
      vaultData.id as Address,
      EOAaccount,
      activeChain,
      scaledAmount,
    );
    mixpanel.track("Withdraw Succeeded", {
      vault: vaultData.id.toString(),
      amount: scaledAmount.toString(),
    });

    await waitForReceipt(receipt)
    toast.success("Transaction confirmed");
    refetch()
    setTransactionCompleted(true);
  } catch (error) {
    mixpanel.track("Withdraw Failed", {
      vault: vaultData.id.toString(),
    });
    toast.error("Transaction failed", {
      position: "top-right",
      autoClose: 2000,  // Close automatically after 2 seconds
    });
    throw new Error("Transaction failed");
  }
};

function getLabel(action: Action) {
  switch (action) {
    case Action.depositApprove:
      return "Approve"
    case Action.deposit:
      return "Deposit"
    case Action.withdraw:
      return "Withdraw"
    case Action.done:
      return "Done"
  }
}

function InteractionContainer({ _inputToken, _inputBalance, _action, vaultData, EOAaccount, setTransactionCompleted, refetch, activeChain }:
  { _inputToken: Token, _inputBalance: Balance, _action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, refetch: () => void; activeChain: Chain; }): JSX.Element {


  return <div className="w-full flex flex-col mt-5">
    <Interaction
      inputToken={_inputToken}
      vaultData={vaultData}
      action={_action}
      inputBalance={_inputBalance}
      EOAaccount={EOAaccount}
      setTransactionCompleted={setTransactionCompleted}
      refetch={refetch}
      activeChain={activeChain}
    />
  </div>
}


function Interaction({ inputToken, inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, refetch, activeChain }:
  { inputToken: Token, inputBalance: Balance, action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, refetch: () => void; activeChain: Chain }): JSX.Element {

  async function handleMainAction() {
    if (action == Action.deposit) {
      await handleDepositTransaction(vaultData, inputBalance, inputToken, EOAaccount, setTransactionCompleted, refetch, activeChain);
    }
    else {
      await handleWithdrawTransaction(vaultData, inputBalance, inputToken, EOAaccount, setTransactionCompleted, refetch, activeChain);
    }
  }

  return (
    <>
      <p className="text-white text-start text-2xl font-bold leading-none mb-1">{getLabel(action)}</p>
      <p className="text-white text-start mb-2">{getDescription(inputToken, Number(inputBalance.formatted), action)}</p>
      <MainActionButton label={getLabel(action)} handleClick={handleMainAction} />
    </>
  )
}


function getDescription(inputToken: Token, amount: number, action: Action) {
  const val = NumberFormatter.format(amount)
  switch (action) {
    case Action.deposit:
      return `Depositing ${val} ${inputToken.symbol} into the Vault.`
    case Action.withdraw:
      return `Withdrawing ${val} ${inputToken.symbol}.`
    case Action.done:
      return ""
  }
}

enum Action {
  depositApprove,
  deposit,
  withdraw,
  done
}

