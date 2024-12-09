import { useState, useEffect } from "react"
import { VaultData, Token, Balance } from "@/types/types";
import mixpanel from "mixpanel-browser";
import { executeDeposit, executeWithdrawal, Approvedeposit } from "@/actions/actions"
import { Address, Chain, waitForReceipt } from "thirdweb";
import { toast } from "react-toastify";
import { Account } from "thirdweb/wallets";
import { NumberFormatter } from "@/utils/helpers";
import MainActionButton from "@/components/button/MainActionButton"
import { client } from "@/utils/client";

const handleDepositTransaction = async (vaultData: VaultData, inputBalance: Balance, inputToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any) => {
    setTransactionCompleted(false)
    try {
        const value = Number(inputBalance.value)
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
            scaledAmount,
        );

        mixpanel.track("Deposit Submitted", {
            vault: vaultData.id.toString(),
            amount: scaledAmount.toString(),
        });

        // Create an object to pass to waitForReceipt with the required fields
        const receiptObject = {
            transactionHash: receipt.transactionHash as `0x${string}`,
            client, // Assuming `client` is already defined somewhere in this scope
            chain: activeChain,
        };

        await waitForReceipt(receiptObject);

        toast.success("Transaction confirmed");

        setTransactionCompleted(true);
        return true;
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

const handleWithdrawTransaction = async (vaultData: VaultData, inputBalance: Balance, withdrawToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any) => {
    setTransactionCompleted(false)
    let withdrawZRC20 = withdrawToken.ZRC20equivalent;
    if (activeChain.id === 7001 || activeChain.id === 7000) {
        withdrawZRC20 = withdrawToken.address;
    }
    if (!withdrawZRC20) {
        throw new Error("Withdraw token not found");
    }
    try {
        const value = Number(inputBalance.value)
        const scaledAmount = BigInt(value)

        mixpanel.track("Withdraw Submitted", {
            vault: vaultData.id.toString(),
            amount: scaledAmount.toString(),
        });

        const receipt = await executeWithdrawal(
            vaultData.id as Address,
            EOAaccount,
            activeChain,
            scaledAmount,
            withdrawZRC20
        );
        mixpanel.track("Withdraw Succeeded", {
            vault: vaultData.id.toString(),
            amount: scaledAmount.toString(),
        });

        // Create an object to pass to waitForReceipt with the required fields
        const receiptObject = {
            transactionHash: receipt.transactionHash as `0x${string}`,
            client, // Assuming `client` is already defined somewhere in this scope
            chain: activeChain,
        };

        await waitForReceipt(receiptObject);

        toast.success("Transaction confirmed");
        setTransactionCompleted(true);
        return true;
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

export default function InteractionContainer({ step, setStep, action, setAction, _inputToken, _inputBalance, _action, vaultData, EOAaccount, setTransactionCompleted, activeChain, actions, setShowModal }:
    { step: number, setStep: Function, action: Action, setAction: Function, _inputToken: Token, _inputBalance: Balance, _action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, actions: Action[], setShowModal: Function }): JSX.Element {

    useEffect(() => {
        setAction(_action)
    }, [actions])

    async function interactionPostHook(success: boolean) {
        if (success) {
            const nextStep = step + 1
            if (actions[nextStep] == Action.depositApproveConfirmed) {
                setAction(actions[nextStep])
                setStep(nextStep)
                setTimeout(() => {
                    setAction(actions[nextStep + 1])
                    setStep(nextStep + 1)
                }, 3000);
            }
            else {
                setAction(actions[nextStep])
                setStep(nextStep)
            }

        } else {
            // setAction(Action.done)
        }
    }

    return <div className="w-full flex flex-col mt-5">
        <Interaction
            inputToken={_inputToken}
            vaultData={vaultData}
            action={action}
            inputBalance={_inputBalance}
            EOAaccount={EOAaccount}
            setTransactionCompleted={setTransactionCompleted}
            activeChain={activeChain}
            interactionPostHook={interactionPostHook}
            setShowModal={setShowModal}
            actions={actions}
        />
    </div>
}


function Interaction({ inputToken, inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, activeChain, interactionPostHook, setShowModal, actions }:
    { inputToken: Token, inputBalance: Balance, action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, interactionPostHook: (e?: any) => Promise<any>, setShowModal: Function, actions: Action[] }): JSX.Element {

    const [description, setDescription] = useState('')
    const [label, setlabel] = useState('')
    const [status, setStatus] = useState(false)
    const [disabled, setDisabled] = useState(true)



    useEffect(() => {
        const val = NumberFormatter.format(Number(inputBalance.formatted))
        switch (action) {
            case Action.depositApprove:
                if (status) {
                    setDisabled(true);
                    setDescription(`Approving for Deposit ${val} ${inputToken.symbol} into the Vault.`)
                }
                else {
                    setDisabled(false);
                    setDescription("Transaction approval required.")
                }
                setlabel("Approve")
                break;
            case Action.depositApproveConfirmed:
                setDescription(" Approval Confirmed")
                setlabel("Deposit")
                setTimeout(() => {
                    setDescription("Deposit confirmation required.");
                    setDisabled(false);
                }, 3000);
                break;
            case Action.deposit:
                setlabel("Deposit")
                if (status) {
                    setDisabled(true);
                    setDescription(`Depositing ${val} ${inputToken.symbol} into the Vault.`)
                }
                else {
                    setDisabled(false);
                    setDescription("Deposit confirmation required.")
                }
                break;
            case Action.depositConfirmed:
                setDisabled(false);
                setlabel("Done")
                setDescription("Deposit confirmed.")
                break;
            case Action.withdraw:
                setlabel("Withdraw")
                if (status) {
                    setDisabled(true);
                    setDescription(`Withdrawing ${val} ${inputToken.symbol}.`)
                }
                else {
                    setDisabled(false);
                    setDescription("Withdraw confirmation required.")
                }
                break;
            case Action.withdrawconfirmed:
                setDisabled(false);
                setlabel("Done")
                setDescription("Withdraw confirmed.")
                break;
        }
    }, [action, status])

    async function handleMainAction() {
        setStatus(true);
        const success = await handleInteraction(
            vaultData,
            inputBalance,
            inputToken,
            EOAaccount,
            setTransactionCompleted,
            activeChain,
            action
        )()
        setStatus(false)
        await interactionPostHook(success)
    }

    return (
        <>
            <p className="text-white text-start text-2xl font-bold leading-none mb-1">{label}</p>
            <p className="text-white text-start mb-2">{description}</p>
            <MainActionButton disabled={disabled} label={label} handleClick={handleMainAction} />
        </>
    )
}

function handleInteraction(
    vaultData: VaultData,
    inputBalance: Balance,
    inputToken: Token,
    EOAaccount: Account,
    setTransactionCompleted: (value: boolean) => void,
    activeChain: any,
    action: Action
) {
    switch (action) {
        case Action.depositApprove:
            return async () => {
                const value = Number(inputBalance.value)
                const scaledAmount = BigInt(value)
                const result = await Approvedeposit(
                    vaultData.id as Address,
                    inputToken.address as Address,
                    EOAaccount,
                    activeChain,
                    scaledAmount, //TODO make this general for all tokens?
                )
                return result;
            }
        case Action.deposit:
            return async () => {
                const result = await handleDepositTransaction(vaultData, inputBalance, inputToken, EOAaccount, setTransactionCompleted, activeChain);
                return result;
            }
        case Action.withdraw:
            return async () => {
                const result = await handleWithdrawTransaction(vaultData, inputBalance, inputToken, EOAaccount, setTransactionCompleted, activeChain);
                return result;
            }
        default:
            return () => {
                return false;
            }
    }
}


enum Action {
    depositApprove,
    depositApproveConfirmed,
    deposit,
    depositConfirmed,
    withdraw,
    withdrawconfirmed
}
