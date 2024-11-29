import { VaultData, Token, Balance } from "@/types/types";
import mixpanel from "mixpanel-browser";
import { executeDeposit, executeWithdrawal } from "@/actions/actions"
import { Address, Chain, waitForReceipt } from "thirdweb";
import { toast } from "react-toastify";
import { Account } from "thirdweb/wallets";
import { NumberFormatter } from "@/utils/helpers";
import MainActionButton from "@/components/button/MainActionButton"

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

export default function InteractionContainer({ _inputToken, _inputBalance, _action, vaultData, EOAaccount, setTransactionCompleted, refetch, activeChain, setShowModal }:
    { _inputToken: Token, _inputBalance: Balance, _action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, refetch: () => void; activeChain: Chain, setShowModal: Function }): JSX.Element {


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
            setShowModal={setShowModal}
        />
    </div>
}


function Interaction({ inputToken, inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, refetch, activeChain, setShowModal }:
    { inputToken: Token, inputBalance: Balance, action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, refetch: () => void; activeChain: Chain, setShowModal: Function }): JSX.Element {

    async function handleMainAction() {
        setShowModal(false)
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
