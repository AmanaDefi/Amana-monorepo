import { useState, useEffect } from "react"
import { VaultData, Token, Balance } from "@/types/types";
import mixpanel from "mixpanel-browser";
import { executeDeposit, executeWithdrawal, Approvedeposit } from "@/actions/actions"
import { Address, Chain, waitForReceipt, getContract, prepareEvent, defineChain } from "thirdweb";
import { Account } from "thirdweb/wallets";
import { NumberFormatter } from "@/utils/helpers";
import MainActionButton from "@/components/button/MainActionButton"
import { client } from "@/utils/client";
import { useContractEvents } from "thirdweb/react";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import { MoonLoader } from "react-spinners";
import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";

const handleDepositTransaction = async (vaultData: VaultData, inputBalance: Balance, inputToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any, setCrosschainInvestHash: Function, setInputBalance: Function) => {
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
            scaledAmount
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
            setTransactionCompleted(true);
            setInputBalance({
                ...inputBalance,
                formatted: "0",
            })
            mixpanel.track("Deposit Submitted", {
                vault: vaultData.id.toString(),
            });

            throw new Error("Transaction failed");
        }
    }
};

const handleWithdrawTransaction = async (vaultData: VaultData, inputBalance: Balance, withdrawToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any, setCrosschainInvestHash: Function, setInputBalance: Function) => {
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
        setCrosschainInvestHash(receipt.transactionHash)
        return true;
    } catch (error) {
        setTransactionCompleted(true);
        setInputBalance({
            ...inputBalance,
            formatted: "0",
        })
        mixpanel.track("Withdraw Failed", {
            vault: vaultData.id.toString(),
        });

        throw new Error("Transaction failed");
    }
};

export default function InteractionContainer({ step, setStep, action, setAction, _inputToken, _inputBalance, _action, vaultData, EOAaccount, setTransactionCompleted, activeChain, actions, setShowModal, setInputBalance }:
    { step: number, setStep: Function, action: Action, setAction: Function, _inputToken: Token, _inputBalance: Balance, _action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, actions: Action[], setShowModal: Function, setInputBalance: Function }): JSX.Element {

    useEffect(() => {
        setAction(_action)
        setStep(0)
    }, [actions])

    const [strategyAddress] = useState(vaultData.protocol.strategyAddress)
    const [strategyChainID] = useState(vaultData.protocol.chainId)

    const [crosschainInvestHash, setCrosschainInvestHash] = useState("")
    const [crossChainTxId, setcrossChainTxId] = useState<string>("");

    const CrossChainInvestSent = prepareEvent({
        signature: "event CrossChainInvestSent(bytes32 indexed crossChainTxId)",
    });

    const FundsInvested = prepareEvent({
        signature: "event FundsInvested(bytes32 indexed crossChainTxId,address user,uint256 amount)",
    });

    const Deposited = prepareEvent({
        signature: "event Deposited(address indexed user,uint256 amount,uint256 shares,bytes32 indexed crossChainTxId)",
    });

    const DivestSent = prepareEvent({
        signature: "event DivestSent(bytes32 indexed crossChainTxId)",
    });

    const FundsDivested = prepareEvent({
        signature: "event FundsDivested(bytes32 indexed crossChainTxId,address user,uint256 amount)",
    });


    const Withdrawn = prepareEvent({
        signature: "event Withdrawn(address indexed user,address indexed receiver,uint256 amount,uint256 shares,bytes32 indexed crossChainTxId)",
    });

    const CrossChainInvestFailed = prepareEvent({
        signature: "event CrossChainInvestFailed(bytes32 indexed crossChainTxId)",
    });

    const DivestFailed = prepareEvent({
        signature: "event DivestFailed(bytes32 indexed crossChainTxId)",
    });


    const contract = getContract({
        client,
        chain: SUPPORTED_CHAINS[0],
        address: vaultData.id,
    });

    const contract2 = getContract({
        client,
        chain: defineChain(strategyChainID),
        address: strategyAddress,
    });

    const { data: events1 } = useContractEvents({
        contract,
        events: [CrossChainInvestSent, Deposited, DivestSent, Withdrawn, CrossChainInvestFailed, DivestFailed],
    });

    const { data: events2 } = useContractEvents({
        contract: contract2,
        events: [FundsInvested, FundsDivested],
    });

    useEffect(() => {
        if (events1 && events1.length > 0 && crosschainInvestHash != "") {
            console.log("event1: ", events1);
            const last_event = events1[events1.length - 1];
            if (last_event.eventName == "CrossChainInvestSent" && action == Action.deposit) {
                console.log("event2: ", last_event);
                if (last_event.transactionHash == crosschainInvestHash) {
                    console.log("event3: ", last_event);
                    setcrossChainTxId(last_event.args.crossChainTxId.toString())
                    const nextStep = step + 1;
                    setAction(actions[nextStep]);
                    setStep(nextStep);
                    return
                }
            }
            else if (last_event.eventName == "Deposited" && action == ((strategyChainID != 7001 && strategyChainID != 7000) ? Action.FundsInvest : Action.deposit)) {
                if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                    const nextStep = step + 1;
                    setAction(actions[nextStep]);
                    setStep(nextStep);
                    return
                }
            }
            else if (last_event.eventName == "DivestSent" && action == Action.withdraw) {
                console.log("event2: ", last_event);
                if (last_event.transactionHash == crosschainInvestHash) {
                    console.log("event3: ", last_event);
                    setcrossChainTxId(last_event.args.crossChainTxId.toString())
                    const nextStep = step + 1;
                    setAction(actions[nextStep]);
                    setStep(nextStep);
                    return
                }
            }
            else if (last_event.eventName == "Withdrawn" && action == ((strategyChainID != 7001 && strategyChainID != 7000) ? Action.FundsDivested : Action.withdraw)) {
                if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                    const nextStep = step + 1;
                    setAction(actions[nextStep]);
                    setStep(nextStep);
                    return
                }
            }
        }
        console.log("event0: ", events1);
        console.log("event5: ", crosschainInvestHash);
    }, [events1, crosschainInvestHash]);

    useEffect(() => {
        if (events2 && events2.length > 0 && crosschainInvestHash != "") {
            console.log("event21: ", events1);
            const last_event = events2[events2.length - 1];
            if (last_event.eventName == "FundsInvested" && action == Action.crosschainInvest) {
                console.log("event22: ", last_event);
                if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                    console.log("event23: ", last_event);
                    const nextStep = step + 1;
                    setAction(actions[nextStep]);
                    setStep(nextStep);
                    return
                }
            }
            else if (last_event.eventName == "FundsDivested" && action == Action.DivestSent) {
                if (last_event.args.crossChainTxId.toString() == crossChainTxId) {
                    const nextStep = step + 1;
                    setAction(actions[nextStep]);
                    setStep(nextStep);
                    return
                }
            }
        }
        console.log("event20: ", events2);
        console.log("event25: ", crosschainInvestHash);
    }, [events2]);

    async function interactionPostHook(success: boolean) {

        if (success) {
            if (actions[step + 1] == Action.depositApproveConfirmed) {
                const nextStep = step + 1
                setAction(actions[nextStep])
                setStep(nextStep)
                setTimeout(() => {
                    setAction(actions[nextStep + 1])
                    setStep(nextStep + 1)
                }, 3000);
            }
        }
    }




    return <div className="w-full flex flex-col mt-5">
        <Interaction
            setStep={setStep}
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
            setCrosschainInvestHash={setCrosschainInvestHash}
            setInputBalance={setInputBalance}
            step={step}

        />
    </div>
}


function Interaction({ setStep, inputToken, inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, activeChain, interactionPostHook, setShowModal, actions, setCrosschainInvestHash, setInputBalance, step }:
    { setStep: Function, inputToken: Token, inputBalance: Balance, action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, interactionPostHook: (e?: any) => Promise<any>, setShowModal: Function, actions: Action[], setCrosschainInvestHash: Function, setInputBalance: Function, step: number }): JSX.Element {


    const [label, setlabel] = useState('')
    const [status, setStatus] = useState(false)
    const [disabled, setDisabled] = useState(true)

    const [description1, setDescription1] = useState<string[]>(() => {
        const initialDesc: string[] = [];
        for (let i = 0; i <= step; i++) {
            const currentAction = actions[i];
            if (currentAction === Action.depositApprove) {
                initialDesc.push("Transaction approval required");
            }
            else if (currentAction === Action.depositApproveConfirmed) {
                initialDesc.push("Approval completed");
            } else if (currentAction === Action.crosschainInvest) {
                initialDesc.push("Initial deposit transaction on zetachain completed");
            } else if (currentAction === Action.FundsInvest) {
                initialDesc.push("Cross chain transfer and investment of funds completed");
            } else if (currentAction === Action.deposited) {
                initialDesc.push((vaultData.protocol.chainId == 7000 || vaultData.protocol.chainId == 7001) ? "Deposit completed" :
                    "Final confirmation completed, shares issued by vault");
            }
            else if (currentAction === Action.withdraw) {
                initialDesc.push("Withdraw confirmation required");
            }
            else if (currentAction === Action.DivestSent) {
                initialDesc.push("Initial withdraw transaction on zetachain completed");
            }
            else if (currentAction === Action.Withdrawn) {
                initialDesc.push("Return of funds to user completed");
            }
        }
        return initialDesc;
    });

    const [description2, setDescription2] = useState<string[]>(() => {
        const initialDesc: string[] = [];
        for (let i = 0; i <= step; i++) {
            const currentAction = actions[i];
            if (currentAction === Action.depositApprove) {
                initialDesc.push("Approving in progress");
            } else if (currentAction === Action.deposit) {
                initialDesc.push((vaultData.protocol.chainId == 7000 || vaultData.protocol.chainId == 7001)
                    ? "Deposit in progress"
                    : "Initial deposit transaction on zetachain in progress");
            } else if (currentAction === Action.crosschainInvest) {
                initialDesc.push("Cross chain transfer and investment of funds in progress");
            } else if (currentAction === Action.FundsInvest) {
                initialDesc.push("Final confirmation and issue of shares by vault in progress");
            }
            else if (currentAction === Action.withdraw) {
                initialDesc.push(`Withdraw in progress`);
            }
            else if (currentAction === Action.DivestSent) {
                initialDesc.push("Divestment of funds from strategy in progress");
            }
        }
        return initialDesc;
    });


    useEffect(() => {
        const val = NumberFormatter.format(Number(inputBalance.formatted))
        switch (action) {
            case Action.depositApprove:
                setDisabled(status);
                setDescription1(["Transaction approval required"])
                setDescription2(["Approving in progress"])
                setlabel("Approve")
                break;
            case Action.depositApproveConfirmed:
                setDescription1([...description1, "Approval completed"]);
                setlabel("Deposit")
                setTimeout(() => {
                    setDisabled(false);
                }, 3000);
                break;
            case Action.deposit:
                setlabel("Deposit")
                setDisabled(status);
                if (actions.includes(Action.depositApprove)) {
                    setDescription1([...description1, `Deposit`]);
                    setDescription2([...description2, (vaultData.protocol.chainId == 7000 || vaultData.protocol.chainId == 7001) ? "Deposit in progress" : "Initial deposit transaction on zetachain in progress"]);
                }
                else {
                    setDescription1([`Deposit`]);
                    setDescription2([(vaultData.protocol.chainId == 7000 || vaultData.protocol.chainId == 7001) ? "Deposit in progress" : "Initial deposit transaction on zetachain in progress"]);
                }
                break;
            case Action.crosschainInvest:
                setDescription1([...description1, "Initial deposit transaction on zetachain completed"]);
                setDescription2([...description2, "Cross chain transfer and investment of funds in progress"]);
                break;
            case Action.FundsInvest:
                setDescription1([...description1, "Cross chain transfer and investment of funds completed"]);
                setDescription2([...description2, "Final confirmation and issue of shares by vault in progress"]);
                break;
            case Action.deposited:
                setDescription1([...description1, "Final confirmation completed, shares issued by vault"]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.withdraw:
                setlabel("Withdraw")
                setDisabled(status);
                setDescription1(["Withdraw confirmation required"]);
                setDescription2([`Withdraw in progress`]);
                break;
            case Action.DivestSent:
                setDescription1([...description1, "Initial withdraw transaction on zetachain completed"]);
                setDescription2([...description2, "Divestment of funds from strategy in progress"]);
                break;
            case Action.FundsDivested:
                setDescription1([...description1, "Divestment of funds from strategy completed"]);
                setDescription2([...description2, "Return of funds to user in progress"]);
                break;
            case Action.Withdrawn:
                setDescription1([...description1, "Return of funds to user completed"]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 3000);
                break;
            case Action.CrossChainInvestFailed:
                setDescription1([...description1, "CrossChainInvestFailed"]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.DivestFailed:
                setDescription1([...description1, "DivestFailed"]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
        }
    }, [action, status, actions])

    async function handleMainAction() {
        setStatus(true);
        const success = await handleInteraction(
            vaultData,
            inputBalance,
            inputToken,
            EOAaccount,
            setTransactionCompleted,
            activeChain,
            action,
            setCrosschainInvestHash,
            setInputBalance
        )()
        action == Action.depositApprove && setStatus(false)
        await interactionPostHook(success)
    } const val = NumberFormatter.format(Number(inputBalance.formatted))


    useEffect(() => {
        console.log("indexdata", step)
    }, [step])



    return (
        <>
            <p className="text-white text-start text-2xl font-bold leading-none mb-1">{label}</p>
            {
                <>
                    {
                        actions.map((item, index) => (
                            index <= step &&
                            <>
                                {
                                    ((item != Action.deposit && item != Action.withdraw && item != Action.depositApprove) ||
                                        (item == Action.depositApprove && !status && action == Action.depositApprove)
                                        || (item == Action.deposit && !status && action == Action.deposit) || (item == Action.withdraw && !status && action == Action.withdraw)) &&
                                    <div className="flex items-center">
                                        {
                                            (item == Action.deposit || item === Action.withdraw || item == Action.depositApprove) ?
                                                <AiOutlineExclamation color="Green" size={20} />
                                                :
                                                <AiOutlineCheck color="Green" size={20} />
                                        }
                                        <p className="text-white text-start mb-2">{description1[(item == Action.deposit) || item == Action.withdraw || item == Action.depositApprove ||
                                            item == Action.depositApproveConfirmed || !actions.includes(Action.depositApprove) ? index : index + 1]}</p>
                                    </div>
                                }
                                {
                                    index == step &&
                                    ((item !== Action.deposit && item !== Action.withdraw && item !== Action.depositApprove && item != Action.depositApproveConfirmed) || (item === Action.depositApprove && status) || (item === Action.deposit && status) || (item === Action.withdraw && status)) &&
                                    <div className="flex items-center">
                                        <MoonLoader color="red" size={30} speedMultiplier={0.3} />
                                        <p className="text-white text-start mb-2">{description2[index]}</p>
                                    </div>
                                }
                            </>
                        ))
                    }
                </>
            }

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
    action: Action,
    setCrosschainInvestHash: Function,
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
                    setCrosschainInvestHash, setInputBalance);
                return result;
            }
        case Action.withdraw:
            return async () => {
                const result = await handleWithdrawTransaction(
                    vaultData, inputBalance, inputToken, EOAaccount,
                    setTransactionCompleted, activeChain, setCrosschainInvestHash, setInputBalance);
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
