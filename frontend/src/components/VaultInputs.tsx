
import TabSelector from "@/components/common/TabSelector"
import InputTokenWithError from "@/components/input/InputTokenWithError"
import { VaultData, Token, Balance, UserVaultBalance } from "@/types/types";
import { EMPTY_BALANCE } from "@/utils/helpers";
import { useState, useEffect } from "react"
import { parseUnits } from "viem"
import { Address, getContract } from "thirdweb";
import { useActiveAccount, useReadContract, useActiveWalletChain } from "thirdweb/react";
import { Account } from "thirdweb/wallets";
import { client } from "@/utils/client";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { getBalance } from "thirdweb/extensions/erc20";
import { getVaultErrorMessage } from "@/utils/utils";
import { ethers } from "ethers";
import InteractionContainer from "./interact";

export interface VaultInputsProps {
  vaultData: VaultData;
  tokenOptions: Token[];
  setTransactionCompleted: (value: boolean) => void;
  userVaultBalances: UserVaultBalance[];
}

export default function VaultInputs({
  vaultData,
  tokenOptions,
  setTransactionCompleted,
  userVaultBalances
}: VaultInputsProps): JSX.Element {
  const vault = tokenOptions.find(t => t.address === vaultData.inputToken.address)

  const [inputToken, setInputToken] = useState<Token>();
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);

  const [inputBalance, setInputBalance] = useState<Balance>(EMPTY_BALANCE);
  const [isDeposit, setIsDeposit] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false)
  const [allowInput, setAllowInput] = useState<boolean>(false)

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



  async function handleTokenSelect(input: Token): Promise<void> {
    if (!activeChain) {
      throw new Error("No active chain found");
    }
    const contract = getContract({
      client,
      chain: activeChain,
      address: input.address as Address,
    });
    const { value, decimals } = await getBalance({
      contract,
      address: activeAccount?.address as Address,
    });

    const formattedBalance = ethers.formatUnits(value, decimals);
    input.balance.formatted = formattedBalance || "0";
    setInputToken(input);
    setAllowInput(true)
    if (isDeposit) {
      setErrorMessage(getVaultErrorMessage(inputBalance.formatted, input.balance.formatted, setShowModal))
    }
    else {
      setErrorMessage(getVaultErrorMessage(inputBalance.formatted, userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance.toString(), setShowModal))
    }
  }


  useEffect(() => {
    const fetchData = async () => {
      const contract = getContract({
        client,
        chain: activeChain,
        address: vaultData.inputToken.address as Address,
      });
      const { value, decimals } = await getBalance({
        contract,
        address: EOAaccount?.address as Address,
      });

      const formattedBalance = ethers.formatUnits(value, decimals);
      vaultData.inputToken.balance.formatted = formattedBalance || "0";
      setInputToken(vaultData.inputToken);
      setAllowInput(true)
      if (isDeposit) {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, vaultData.inputToken.balance.formatted, setShowModal))
      }
      else {
        setErrorMessage(getVaultErrorMessage(inputBalance.formatted, userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance.toString(), setShowModal))
      }
    };

    // Call the async function
    fetchData();

  }, [activeChain])

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
      if (vault) {
        setInputToken(vault);
      }
      setIsDeposit(false);

    } else {
      // Switch to Deposit
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
    if (isDeposit) {
      setErrorMessage(getVaultErrorMessage(value, inputToken.balance.formatted, setShowModal))
    }
    else {
      setErrorMessage(getVaultErrorMessage(value, userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance.toString(), setShowModal))
    }
  }

  function handleMaxClick() {
    if (!inputToken) return;
    if (isDeposit) {
      handleChangeInput({ currentTarget: { value: inputToken.balance.formatted } });
    }
    else {
      handleChangeInput({ currentTarget: { value: userVaultBalances.find((balance) => balance.vaultId === vaultData.id)?.balance || "0" } });
    }
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
      allowInput={allowInput}
      vaultData={vaultData}
      onMaxClick={handleMaxClick}
      value={inputBalance.formatted}
      onChange={handleChangeInput}
      selectedToken={inputToken}
      errorMessage={errorMessage}
      tokenList={tokenOptions}
      disabled={false}
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


    {inputToken && showModal &&
      <InteractionContainer
        _inputToken={inputToken}
        _inputBalance={inputBalance}
        _action={isDeposit ? Action.deposit : Action.withdraw}
        vaultData={vaultData}
        EOAaccount={EOAaccount}
        setTransactionCompleted={setTransactionCompleted}
        refetch={refetch}
        activeChain={activeChain}
        setShowModal={setShowModal}
      />
    }
  </>
}


enum Action {
  depositApprove,
  deposit,
  withdraw,
  done
}

