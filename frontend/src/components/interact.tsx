import {useEffect, useRef, useState} from "react"
import {
    Action,
    Balance,
    Token,
    TransactionStepFeedback,
    TransactionStepMessages,
    TransactionStepStatus,
    VaultData
} from "@/types/types";
import mixpanel from "mixpanel-browser";
import {Approvedeposit, executeDeposit, executeWithdrawal} from "@/actions/actions"
import {Address, Chain, waitForReceipt} from "thirdweb";
import {Account} from "thirdweb/wallets";
import MainActionButton from "@/components/button/MainActionButton"
import {client} from "@/utils/client";
import {MoonLoader} from "react-spinners";
import {AiOutlineCheck, AiOutlineExclamation} from "react-icons/ai";
import {isZetachain} from "@/utils/utils";
import {useInteractionEvents} from "@/hooks/hooks";

const handleDepositTransaction = async (vaultData: VaultData, inputBalance: Balance, inputToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any, setCrosschainInvestHash: Function, setcrossChainTxId: Function, setInputBalance: Function) => {
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
            setcrossChainTxId
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

        setCrosschainInvestHash(receipt.transactionHash)

        return true;
    } catch (error: any) {
        console.log("0-0-0-0-0", error)
        if (!error.message.includes("User denied transaction")) {
            mixpanel.track("Deposit Failed", {
                vault: vaultData.id.toString(),
            });
        }
    }
};

const handleWithdrawTransaction = async (vaultData: VaultData, inputBalance: Balance, withdrawToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any, setCrosschainInvestHash: Function, setcrossChainTxId: Function, setInputBalance: Function) => {
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
            withdrawToken.address as Address,
            withdrawZRC20,
            setcrossChainTxId
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
        setCrosschainInvestHash(receipt.transactionHash)
        return true;
    } catch (error) {
        mixpanel.track("Withdraw Failed", {
            vault: vaultData.id.toString(),
        });
    }
};

export default function InteractionContainer({ step, setStep, action, setAction, _inputToken, _inputBalance, _action, vaultData, EOAaccount, setTransactionCompleted, activeChain, actions, setInputBalance, errorMessage, isDeposit }:
    { step: number, setStep: Function, action: Action, setAction: Function, _inputToken: Token, _inputBalance: Balance, _action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, actions: Action[], setInputBalance: Function, errorMessage: string, isDeposit: boolean }): JSX.Element {

    const [label, setLabel] = useState('')
    const [disabled, setDisabled] = useState(true)

    const processedTxHashesRef = useRef({
        vault: new Set(),
        strategy: new Set(),
        withdrawal: new Set(),
    });

    useEffect(() => {
        setAction(_action)
        setStep(0)
    }, [actions])

    const [strategyAddress] = useState(vaultData.protocol.strategyAddress)
    const [strategyChainID] = useState(vaultData.protocol.chainId)

    const [crosschainInvestHash, setCrosschainInvestHash] = useState("")
    const [crossChainTxId, setcrossChainTxId] = useState<string>("");

    const isTestnet = process.env.NEXT_PUBLIC_DEPLOY_ENV === 'testnet';
    const contractWithdrawalReceiverAddress = (isTestnet ? process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS_TESTNET : process.env.NEXT_PUBLIC_WITHDRAWAL_RECEIVER_ADDRESS) as `0x${string}`

    const [transactionStepFeedback, setTransactionStepFeedback] = useState<TransactionStepMessages>({});
    const [lastTransactionStepFeedback, setLastTransactionStepFeedback] = useState<TransactionStepMessages>({});
    const [isTransactionStarted, setIsTransactionStarted] = useState(false);
    const [isTransactionProcessing, setIsTransactionProcessing] = useState(false);
    const [finishedTransaction, setFinishedTransaction] = useState(false);

    const {
        vaultEvents,
        strategyEvents,
        withdrawalReceiverEvents
    } = useInteractionEvents({vaultData, activeChainId: activeChain.id, strategyChainID, strategyAddress, contractWithdrawalReceiverAddress, isTransactionStarted});

    function completeTransactionProcess(feedbackSnapshot: TransactionStepMessages) {
        setIsTransactionStarted(false);
        if (finishedTransaction) return;
        setIsTransactionProcessing(false);
        setLastTransactionStepFeedback(feedbackSnapshot);
        setFinishedTransaction(true);
        setTransactionStepFeedback({});

        setTransactionCompleted(true);
        setInputBalance({
            value: 0,
            formatted: "0",
            formattedUSD: "0",
        })
    }

    useEffect(() => {
        console.log("event1: ", vaultEvents);
        console.log("crosschainInvestHash: ", crosschainInvestHash);
        console.log("crossChainTxId: ", crossChainTxId);
        if (vaultEvents && vaultEvents.length > 0 && crosschainInvestHash != "") {
            const newEvents = vaultEvents.filter(event => {
                const eventKey = `${event.transactionHash}-${event.logIndex}`;
                if (processedTxHashesRef.current.vault.has(eventKey)) {
                    return false;
                }
                processedTxHashesRef.current.vault.add(eventKey);
                return true;
            });

            console.log("New vault events: ", newEvents);

            for (let i = 0; i < newEvents.length; i++) {
                const last_event = newEvents[i];
                if (last_event.eventName == "CrossChainInvestSent" && action == (isZetachain(activeChain.id) ? Action.deposit : Action.depositConfirmed)) {
                    console.log("EVENT CrossChainInvestSent: ", last_event, action, step);
                    if (
                        (last_event.args.crossChainTxId.toString() == crossChainTxId && !isZetachain(activeChain.id)) ||
                        (last_event.transactionHash == crosschainInvestHash && isZetachain(activeChain.id))
                    ) {
                        console.log("PASSED EVENT CrossChainInvestSent: ", last_event, action, step);
                        setcrossChainTxId(last_event.args.crossChainTxId.toString())
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "Deposit" && isZetachain(strategyChainID) && isZetachain(activeChain.id) && action === Action.deposit) {
                    console.log("EVENT Deposit: ", last_event, action, step);
                    if (last_event.transactionHash == crosschainInvestHash) {
                        console.log("PASSED EVENT Deposit: ", last_event, action, step);
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "Withdraw" && action === Action.withdraw && isZetachain(strategyChainID)) {
                    console.log("EVENT Withdraw: ", last_event, action, step);
                    if (last_event.transactionHash == crosschainInvestHash) {
                        console.log("PASSED EVENT Withdraw: ", last_event, action, step);
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "Deposited" && action == (!isZetachain(strategyChainID) ? Action.FundsInvest : (isZetachain(activeChain.id) ? Action.deposit : Action.depositConfirmed))) {
                    console.log("EVENT Deposited: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT Deposited: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.deposited);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "DivestSent" && action == (isZetachain(activeChain.id) ? Action.withdraw : Action.withdrawconfirmed)) {
                    console.log("EVENT DivestSent: ", last_event, action, step);
                    if (
                        (last_event.args.crossChainTxId.toString() == crossChainTxId && !isZetachain(activeChain.id)) ||
                        (last_event.transactionHash == crosschainInvestHash && isZetachain(activeChain.id))
                    ) {
                        console.log("PASSED EVENT DivestSent: ", last_event, action, step);
                        setcrossChainTxId(last_event.args.crossChainTxId.toString())
                        const nextStep = actions.findIndex(el => el == Action.DivestSent);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "ReturnFundsToUserSent" && action == (!isZetachain(strategyChainID) ? Action.FundsDivested : (isZetachain(activeChain.id) ? Action.withdraw : Action.withdrawconfirmed))) {
                    console.log("EVENT ReturnFundsToUserSent: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT ReturnFundsToUserSent: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == (isZetachain(activeChain.id) ? Action.withdrew : Action.ReturnFundsToUserSent));
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "CrossChainInvestFailed" && action == Action.crosschainInvest) {
                    console.log("EVENT CrossChainInvestFailed: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT CrossChainInvestFailed: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.CrossChainInvestFailed);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "DivestFailed" && action == Action.DivestSent) {
                    console.log("EVENT DivestFailed: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT DivestFailed: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.DivestFailed);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "ReturnFundsToUserFailed" && action == Action.ReturnFundsToUserSent) {
                    console.log("EVENT ReturnFundsToUserFailed: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT ReturnFundsToUserFailed: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.ReturnFundsToUserFailed);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [vaultEvents, crosschainInvestHash]);

    useEffect(() => {
        if (strategyEvents && strategyEvents.length > 0 && crosschainInvestHash != "") {
            console.log("event21: ", strategyEvents);
            const newEvents = strategyEvents.filter(event => {
                const eventKey = `${event.transactionHash}-${event.logIndex}`;
                if (processedTxHashesRef.current.strategy.has(eventKey)) {
                    return false;
                }
                processedTxHashesRef.current.strategy.add(eventKey);
                return true;
            });
            console.log("New strategy events: ", newEvents);
            for (let i = 0; i < newEvents.length; i++) {
                const last_event = newEvents[i];
                if (last_event.eventName == "FundsInvested" && action == Action.crosschainInvest) {
                    console.log("EVENT FundsInvested: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT FundsInvested: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.FundsInvest);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "FundsDivested" && action == Action.DivestSent) {
                    console.log("EVENT FundsDivested: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT FundsDivested: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.FundsDivested);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "InvestConfirmFailed" && action == Action.FundsInvest) {
                    console.log("EVENT InvestConfirmFailed: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT InvestConfirmFailed: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.InvestConfirmFailed);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (last_event.eventName == "ReturnFundsFromStrategyFailed" && action == Action.FundsDivested) {
                    console.log("EVENT ReturnFundsFromStrategyFailed: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT ReturnFundsFromStrategyFailed: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.ReturnFundsFromStrategyFailed);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [strategyEvents]);

    useEffect(() => {
        if (withdrawalReceiverEvents && withdrawalReceiverEvents.length > 0 && crosschainInvestHash != "") {
            console.log("event31: ", withdrawalReceiverEvents);
            const newEvents = withdrawalReceiverEvents.filter(event => {
                const eventKey = `${event.transactionHash}-${event.logIndex}`;
                if (processedTxHashesRef.current.withdrawal.has(eventKey)) {
                    return false;
                }
                processedTxHashesRef.current.withdrawal.add(eventKey);
                return true;
            });
            console.log("New withdrawalReceiver events: ", newEvents);
            for (let i = 0; i < newEvents.length; i++) {
                const last_event = newEvents[i];
                if (last_event.eventName == "FundsReturned" && action == Action.CrossChainInvestFailed) {
                    console.log("EVENT FundsReturned on deposit: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT FundsReturned on deposit: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.FundsReturnedError);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
                else if (
                    last_event.eventName == "FundsReturned" && action == Action.ReturnFundsToUserSent
                ) {
                    console.log("EVENT FundsReturned on withdraw: ", last_event, action, step);
                    if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                        console.log("PASSED EVENT FundsReturned on withdraw: ", last_event, action, step);
                        const nextStep = actions.findIndex(el => el == Action.withdrew);
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [withdrawalReceiverEvents]);

    function updateTransactionStepFeedback(actionIndex: Action, data: Partial<TransactionStepFeedback>) {
        setTransactionStepFeedback(prev => ({
            ...prev,
            [actionIndex]: {
                ...prev[actionIndex],
                ...data
            }
        }));
    }

    useEffect(() => {
        setTransactionStepFeedback({});
    }, [actions]);

    // Track user interaction to release last transaction logs
    // START

    function resetTransactionState() {
        setFinishedTransaction(false)
        setIsTransactionProcessing(false)
        setIsTransactionStarted(false)
        setCrosschainInvestHash('');
        setcrossChainTxId('');
    }
    useEffect(() => {
        if (Number(_inputBalance.value) > 0) {
            resetTransactionState()
        }
    }, [_inputBalance.value]);

    useEffect(() => {
        resetTransactionState()
    }, [_inputToken]);

    useEffect(() => {
        resetTransactionState()
    }, [isDeposit]);

    // END

    return <div className="w-full flex flex-col mt-5">
        <Interaction
            setStep={setStep}
            setAction={setAction}
            inputToken={_inputToken}
            vaultData={vaultData}
            action={action}
            inputBalance={_inputBalance}
            EOAaccount={EOAaccount}
            setTransactionCompleted={setTransactionCompleted}
            activeChain={activeChain}
            actions={actions}
            setCrosschainInvestHash={setCrosschainInvestHash}
            setcrossChainTxId={setcrossChainTxId}
            setInputBalance={setInputBalance}
            step={step}
            transactionStepFeedback={transactionStepFeedback}
            setTransactionStepFeedback={setTransactionStepFeedback}
            updateTransactionStepFeedback={updateTransactionStepFeedback}
            label={label}
            setLabel={setLabel}
            errorMessage={errorMessage}

            lastTransactionStepFeedback={lastTransactionStepFeedback}
            setLastTransactionStepFeedback={setLastTransactionStepFeedback}
            isTransactionStarted={isTransactionStarted}
            setIsTransactionStarted={setIsTransactionStarted}
            isTransactionProcessing={isTransactionProcessing}
            setIsTransactionProcessing={setIsTransactionProcessing}
            finishedTransaction={finishedTransaction}
            setFinishedTransaction={setFinishedTransaction}
            completeTransactionProcess={completeTransactionProcess}
        />
    </div>
}


function Interaction(
    {
        setStep,
        setAction,
        inputToken,
        inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, activeChain,
        actions, setCrosschainInvestHash, setcrossChainTxId, setInputBalance, step,
        transactionStepFeedback, setTransactionStepFeedback, updateTransactionStepFeedback, label, setLabel, errorMessage,
        lastTransactionStepFeedback,
        setLastTransactionStepFeedback,
        isTransactionStarted,
        setIsTransactionStarted,
        isTransactionProcessing,
        setIsTransactionProcessing,
        finishedTransaction,
        setFinishedTransaction,
        completeTransactionProcess
    }:
    {
        setStep: Function, setAction: Function, inputToken: Token, inputBalance: Balance, action: Action,
        vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void,
        activeChain: Chain, actions: Action[], setCrosschainInvestHash: Function,
        setcrossChainTxId: Function, setInputBalance: Function, step: number,
        transactionStepFeedback: TransactionStepMessages,
        setTransactionStepFeedback: (newData: TransactionStepMessages | ((prev: TransactionStepMessages) => TransactionStepMessages)) => void,
        updateTransactionStepFeedback: (actionIndex: Action, data: Partial<TransactionStepFeedback>) => void,
        label: string,
        setLabel: (label: string) => void,
        errorMessage: string,
        lastTransactionStepFeedback: TransactionStepMessages,
        setLastTransactionStepFeedback: (feedback: TransactionStepMessages) => void,
        isTransactionStarted: boolean,
        setIsTransactionStarted: (started: boolean) => void,
        isTransactionProcessing: boolean,
        setIsTransactionProcessing: (processing: boolean) => void,
        finishedTransaction: boolean,
        setFinishedTransaction: (finished: boolean) => void,
        completeTransactionProcess: (snapshot: TransactionStepMessages) => void
    }):
    JSX.Element {

    useEffect(() => {
        console.log("%c Called SWITCH!!", 'color: blue')
        let newTransactionStepFeedback;
        let targetAction: Action;
        let description: string;
        switch (action) {
            case Action.depositApprove:
                setTransactionStepFeedback({
                    [Action.depositApprove]: {
                        label: 'Approve',
                        description: 'Transaction approval required',
                        status: TransactionStepStatus.pending
                    }
                })
                setLabel("Approve")
                break;
            case Action.depositApproveConfirmed:
                setTransactionStepFeedback({
                    [Action.depositApprove]: {
                        label: 'Approve',
                        description: 'Approval completed',
                        status: TransactionStepStatus.completed
                    }
                })
                setIsTransactionProcessing(false);
                break;
            case Action.deposit:
                setLabel("Deposit")
                break;
            case Action.depositConfirmed:
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [Action.deposit]: {
                        label: 'Deposit',
                        description: 'Initial deposit transaction on local chain completed',
                        status: TransactionStepStatus.completed
                    },
                    [Action.depositConfirmed]: {
                        label: 'Deposit',
                        description: 'Cross chain transfer to vault in progress',
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.withdrawconfirmed:
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [Action.withdraw]: {
                        label: 'Withdraw',
                        description: 'Initial withdraw transaction on local chain completed',
                        status: TransactionStepStatus.completed
                    },
                    [Action.withdrawconfirmed]: {
                        label: 'Withdraw',
                        description: 'Cross chain request to vault in progress',
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.crosschainInvest:
                if (isZetachain(activeChain.id)) {
                    setTransactionStepFeedback(prev => ({
                        ...prev,
                        [Action.deposit]: {
                            label: 'Deposit',
                            description: `Initial deposit transaction on ${activeChain.name} completed`,
                            status: TransactionStepStatus.completed
                        },
                        [Action.crosschainInvest]: {
                            label: 'Deposit',
                            description: 'Cross chain transfer and investment of funds in progress',
                            status: TransactionStepStatus.processing
                        },
                    }))
                } else {
                    setTransactionStepFeedback(prev => ({
                        ...prev,
                        [Action.depositConfirmed]: {
                            label: 'Deposit',
                            description: 'Cross chain transfer to vault completed',
                            status: TransactionStepStatus.completed
                        },
                        [Action.crosschainInvest]: {
                            label: 'Deposit',
                            description: 'Cross chain transfer and investment of funds in progress',
                            status: TransactionStepStatus.processing
                        },
                    }))
                }
                break;
            case Action.FundsInvest:
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [Action.crosschainInvest]: {
                        label: 'Deposit',
                        description: 'Cross chain transfer and investment of funds completed',
                        status: TransactionStepStatus.completed
                    },
                    [Action.FundsInvest]: {
                        label: 'Deposit',
                        description: 'Final confirmation and issue of shares by vault in progress',
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.deposited:
                if (isZetachain(vaultData.protocol.chainId)) {
                    if (isZetachain(activeChain.id)) {
                        newTransactionStepFeedback = {
                            ...transactionStepFeedback,
                            [Action.deposit]: {
                                label: 'Deposit',
                                description: "Deposit completed",
                                status: TransactionStepStatus.completed
                            }
                        };
                    } else {
                        newTransactionStepFeedback = {
                            ...transactionStepFeedback,
                            [Action.depositConfirmed]: {
                                label: 'Deposit',
                                description: "Cross chain transfer to vault completed",
                                status: TransactionStepStatus.completed
                            },
                            [Action.deposited]: {
                                label: 'Deposit',
                                description: "Funds invested and shares issued",
                                status: TransactionStepStatus.completed
                            }
                        };
                    }
                } else {
                    newTransactionStepFeedback = {
                        ...transactionStepFeedback,
                        [Action.FundsInvest]: {
                            label: 'Deposit',
                            description: "Final confirmation completed, shares issued by vault",
                            status: TransactionStepStatus.completed
                        }
                    };
                }
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
            case Action.InvestConfirmFailed:
                newTransactionStepFeedback = {
                    ...transactionStepFeedback,
                    [Action.FundsInvest]: {
                        label: 'Deposit',
                        description: 'Final confirmation failed',
                        status: TransactionStepStatus.error
                    }
                };
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
            case Action.withdraw:
                setLabel("Withdraw")
                break;
            case Action.DivestSent:
                if (isZetachain(activeChain.id)) {
                    targetAction = Action.withdraw;
                    description = `Initial withdraw transaction on ${activeChain.name} completed`
                } else {
                    targetAction = Action.withdrawconfirmed;
                    description = 'Cross chain request to vault completed'
                }
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [targetAction]: {
                        label: 'Withdraw',
                        description: description,
                        status: TransactionStepStatus.completed
                    },
                    [Action.DivestSent]: {
                        label: 'Withdraw',
                        description: 'Divestment of funds from strategy in progress',
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.ReturnFundsToUserSent:
                if (isZetachain(vaultData.protocol.chainId)) {
                    targetAction = Action.withdrawconfirmed
                    description = 'Cross chain request to vault completed'
                } else {
                    targetAction = Action.FundsDivested
                    description = 'Withdrawal confirmation completed'
                }
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [targetAction]: {
                        label: 'Withdraw',
                        description: description,
                        status: TransactionStepStatus.completed
                    },
                    [Action.ReturnFundsToUserSent]: {
                        label: 'Withdraw',
                        description: 'Return of funds in progress',
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.FundsDivested:
                if (isZetachain(activeChain.id)) {
                    description = 'Withdrawal confirmation and return of funds in progress'
                } else {
                    description = 'Withdrawal confirmation in progress'
                }
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [Action.DivestSent]: {
                        label: 'Withdraw',
                        description: 'Divestment of funds from strategy completed',
                        status: TransactionStepStatus.completed
                    },
                    [Action.FundsDivested]: {
                        label: 'Withdraw',
                        description: description,
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.withdrew:
                if (isZetachain(activeChain.id)) {
                    if (isZetachain(vaultData.protocol.chainId)) {
                        targetAction = Action.withdraw;
                        description = 'Withdraw completed';
                    } else {
                        targetAction = Action.FundsDivested;
                        description = 'Withdrawal confirmation completed, funds returned';
                    }
                } else {
                    targetAction = Action.ReturnFundsToUserSent;
                    description = 'Return of funds completed';
                }
                newTransactionStepFeedback = {
                    ...transactionStepFeedback,
                    [targetAction]: {
                        label: 'Withdraw',
                        description: description,
                        status: TransactionStepStatus.completed
                    }
                };
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
            case Action.CrossChainInvestFailed:
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [Action.crosschainInvest]: {
                        label: 'Deposit',
                        description: 'Cross chain transfer and investment of funds failed',
                        status: TransactionStepStatus.error
                    },
                    [Action.FundsReturnedError]: {
                        label: 'Deposit',
                        description: 'Return of funds in progress',
                        status: TransactionStepStatus.processing
                    },
                }))
                break;
            case Action.FundsReturnedError:
                newTransactionStepFeedback = {
                    ...transactionStepFeedback,
                    [Action.FundsReturnedError]: {
                        label: 'Deposit',
                        description: 'Return of funds completed',
                        status: TransactionStepStatus.completed
                    }
                };
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
            case Action.DivestFailed:
                newTransactionStepFeedback = {
                    ...transactionStepFeedback,
                    [Action.DivestSent]: {
                        label: 'Withdraw',
                        description: 'Divestment of funds from strategy failed, please try again later',
                        status: TransactionStepStatus.error
                    }
                };
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
            case Action.ReturnFundsFromStrategyFailed:
                newTransactionStepFeedback = {
                    ...transactionStepFeedback,
                    [Action.FundsDivested]: {
                        label: 'Withdraw',
                        description: 'Withdrawal confirmation failed, please try again later',
                        status: TransactionStepStatus.error
                    }
                };
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
            case Action.ReturnFundsToUserFailed:
                newTransactionStepFeedback = {
                    ...transactionStepFeedback,
                    [Action.ReturnFundsToUserSent]: {
                        label: 'Withdraw',
                        description: 'Return of funds failed, please try again later',
                        status: TransactionStepStatus.error
                    }
                };
                setTransactionStepFeedback(newTransactionStepFeedback)
                completeTransactionProcess(newTransactionStepFeedback);
                break;
        }
    }, [action, actions])

    async function interactionPostHook(success: boolean) {
        if (success) {
            if (actions[step + 1] == Action.depositApproveConfirmed) {
                const nextStep = step + 1
                setAction(actions[nextStep])
                setStep(nextStep)
                setTimeout(() => {
                    setAction(actions[nextStep + 1])
                    setStep(nextStep + 1)
                }, 100);
            }
            if (action == Action.deposit && actions[step + 1] == Action.depositConfirmed) {
                const nextStep = step + 1
                setAction(actions[nextStep])
                setStep(nextStep)
            }
            if (action == Action.withdraw && actions[step + 1] == Action.withdrawconfirmed) {
                const nextStep = step + 1
                setAction(actions[nextStep])
                setStep(nextStep)
            }
        } else {
            if (action == Action.depositApprove) {
                updateTransactionStepFeedback(action, { status: TransactionStepStatus.error, description: 'Approval transaction failed, please try again' });
            }
            if (action == Action.deposit) {
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [action]: {
                        label: 'Deposit',
                        description: 'Local transaction failed, please try again',
                        status: TransactionStepStatus.error
                    }
                }))
            }
            if (action == Action.withdraw) {
                setTransactionStepFeedback(prev => ({
                    ...prev,
                    [action]: {
                        label: 'Withdraw',
                        description: 'Local transaction failed, please try again',
                        status: TransactionStepStatus.error
                    }
                }))
            }
            setIsTransactionProcessing(false);
        }
    }

    async function handleMainAction() {
        if (isTransactionProcessing) return;
        setIsTransactionProcessing(true);
        if (action == Action.depositApprove) {
            updateTransactionStepFeedback(action, { status: TransactionStepStatus.processing, description: 'Approval in progress' });
        } else {
            // Is either deposit or withdrawal action
            // This marks event listeners as enabled
            setIsTransactionStarted(true);
        }
        if (action == Action.deposit) {
            let description;
            if (isZetachain(activeChain.id)) {
                if (isZetachain(vaultData.protocol.chainId)) {
                    description =  'Deposit in progress';
                } else {
                    description =  `Initial deposit transaction on ${activeChain.name?.toLowerCase()} in progress`;
                }
            } else {
                description =  'Initial deposit transaction on local chain in progress';
            }
            updateTransactionStepFeedback(action, {
                label: 'Deposit',
                description,
                status: TransactionStepStatus.processing
            });
        }
        if (action == Action.withdraw) {
            let description;
            if (isZetachain(vaultData.protocol.chainId)) {
                if (isZetachain(activeChain.id)) {
                    description =  `Withdrawing ${inputBalance.formatted} ${vaultData.inputToken.symbol}`;
                } else {
                    description =  `Initial withdraw transaction on local chain in progress`;
                }
            } else {
                description =  `Initial withdraw transaction on ${activeChain.name} in progress`;
            }
            updateTransactionStepFeedback(action, {
                label: 'Withdraw',
                description: description,
                status: TransactionStepStatus.processing
            });
        }
        const success = await handleInteraction(
            vaultData,
            inputBalance,
            inputToken,
            EOAaccount,
            setTransactionCompleted,
            activeChain,
            action,
            setCrosschainInvestHash,
            setcrossChainTxId,
            setInputBalance
        )()
        await interactionPostHook(!!success)
    }

    useEffect(() => {
        console.log("processActionsFeedback", transactionStepFeedback)
        console.log("lastProcessActionsFeedback", lastTransactionStepFeedback)
    }, [lastTransactionStepFeedback, transactionStepFeedback]);

    function handleDone() {
        setLastTransactionStepFeedback({});
        setFinishedTransaction(false);
    }

    return (
        <>
            {
                ((Number(inputBalance.formatted) > 0 && actions.length) || finishedTransaction) && !errorMessage &&
                <>
                    <p className="text-white text-start text-2xl font-bold leading-none mb-3">{label}</p>
                    {
                        <>
                            {
                                (Object.keys(Action) as Array<keyof typeof Action>).map(key => key as unknown as Action).map((item, index) => {
                                    const feedbackData = finishedTransaction ? lastTransactionStepFeedback : transactionStepFeedback;
                                    if (feedbackData[item]) {
                                        const actionFeedback = feedbackData[item];
                                        return (
                                            <div className='flex flex-col gap-2 mb-2 last:mb-4' key={index}>
                                                <div className='flex gap-2 items-center'>
                                                    <div
                                                        className="w-6 h-6 rounded-full bg-gray-800 flex-center [&:has(.pending-state)]:bg-[transparent] [&:has(.pending-state)]:border-none">
                                                        {
                                                            ((actionStatus) => {
                                                                switch (actionStatus) {
                                                                    case TransactionStepStatus.pending:
                                                                        return <div
                                                                            className="w-4 h-4 bg-blue-500 rounded-full animate-[ping_1.5s_ease-in-out_infinite]"
                                                                        />
                                                                    case TransactionStepStatus.error:
                                                                        return <AiOutlineExclamation className='text-red-600' size={16}/>
                                                                    case TransactionStepStatus.processing:
                                                                        return <MoonLoader color="yellow" size={18}
                                                                                           speedMultiplier={0.3}
                                                                                           className='pending-state'/>
                                                                    case TransactionStepStatus.completed:
                                                                        return <AiOutlineCheck className='text-green-400' size={16}/>
                                                                    default:
                                                                        return null;
                                                                }
                                                            })(actionFeedback.status)
                                                        }
                                                    </div>
                                                    <p className="text-white text-start">{actionFeedback.description}</p>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return null;
                                })
                            }
                        </>
                    }
                    {
                        finishedTransaction ?
                            <MainActionButton label='Done' handleClick={handleDone}/> :
                            <MainActionButton disabled={isTransactionProcessing} label={label} handleClick={handleMainAction}/>
                    }
                </>
            }
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
    action: Action,
    setCrosschainInvestHash: Function,
    setcrossChainTxId: Function,
    setInputBalance: Function
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
                    scaledAmount
                )
                return result;
            }
        case Action.deposit:
            return async () => {
                const result = await handleDepositTransaction(
                    vaultData, inputBalance, inputToken, EOAaccount,
                    setTransactionCompleted, activeChain,
                    setCrosschainInvestHash, setcrossChainTxId, setInputBalance);
                return result;
            }
        case Action.withdraw:
            return async () => {
                const result = await handleWithdrawTransaction(
                    vaultData, inputBalance, inputToken, EOAaccount,
                    setTransactionCompleted, activeChain, setCrosschainInvestHash, setcrossChainTxId, setInputBalance);
                return result;
            }
        default:
            return () => {
                return false;
            }
    }
}
