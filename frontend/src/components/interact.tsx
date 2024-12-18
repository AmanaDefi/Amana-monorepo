import { useState, useEffect } from "react"
import { VaultData, Token, Balance } from "@/types/types";
import mixpanel from "mixpanel-browser";
import { executeDeposit, executeWithdrawal, Approvedeposit } from "@/actions/actions"
import { Address, Chain, waitForReceipt, getContract, prepareEvent, readContract, defineChain } from "thirdweb";
import { toast } from "react-toastify";
import { Account } from "thirdweb/wallets";
import { NumberFormatter } from "@/utils/helpers";
import MainActionButton from "@/components/button/MainActionButton"
import { client } from "@/utils/client";
import { useContractEvents } from "thirdweb/react";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";

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

        toast.success("Transaction confirmed");

        return true;
    } catch (error) {
        setTransactionCompleted(true);
        setInputBalance({
            ...inputBalance,
            formatted: "0",
        })
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

const handleWithdrawTransaction = async (vaultData: VaultData, inputBalance: Balance, withdrawToken: Token, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: any, setInputBalance: Function) => {
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
        toast.error("Transaction failed", {
            position: "top-right",
            autoClose: 2000,  // Close automatically after 2 seconds
        });
        throw new Error("Transaction failed");
    }
};

export default function InteractionContainer({ step, setStep, action, setAction, _inputToken, _inputBalance, _action, vaultData, EOAaccount, setTransactionCompleted, activeChain, actions, setShowModal, setInputBalance }:
    { step: number, setStep: Function, action: Action, setAction: Function, _inputToken: Token, _inputBalance: Balance, _action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, actions: Action[], setShowModal: Function, setInputBalance: Function }): JSX.Element {

    useEffect(() => {
        setAction(_action)
    }, [actions])


    const [strategyAddress, setstrategyAddress] = useState("")
    const [strategyChainID, setstrategyChainID] = useState(0)

    async function getStrategyChain() {
        const contract = getContract({
            client,
            chain: SUPPORTED_CHAINS[0],
            address: vaultData.id,
        });
        const [strategyAddress, chainID] = await readContract({
            contract,
            method: "function getStrategy() view returns (address, uint32)",
        });

        setstrategyAddress(strategyAddress)
        setstrategyChainID(chainID)

    }

    useEffect(() => {

        getStrategyChain()

    }, [])

    const [crosschainInvestHash, setCrosschainInvestHash] = useState("")

    const CrossChainInvestSent = prepareEvent({
        signature: "event CrossChainInvestSent(uint256 indexed crossChainTxId)",
    });

    const FundsInvested = prepareEvent({
        signature: "event FundsInvested(uint256 indexed crossChainTxId,address userAddress,uint256 amount)",
    });

    const Deposited = prepareEvent({
        signature: "event Deposited(address indexed userAddress,uint256 amount,uint256 shares,uint256 indexed crossChainTxId)",
    });

    const DivestSent = prepareEvent({
        signature: "event DivestSent(uint256 indexed crossChainTxId)",
    });

    const FundsDivested = prepareEvent({
        signature: "event FundsDivested(uint256 indexed crossChainTxId,address userAddress,uint256 amount)",
    });

    const ReturnFundsToUserSent = prepareEvent({
        signature: "event ReturnFundsToUserSent(uint256 indexed crossChainTxId)",
    });

    const Withdrawn = prepareEvent({
        signature: "event Withdrawn( address indexed userAddress,uint256 amount,uint256 shares,uint256 crossChainTxId)",
    });

    const CrossChainInvestFailed = prepareEvent({
        signature: "event CrossChainInvestFailed(uint256 indexed crossChainTxId)",
    });

    const DivestFailed = prepareEvent({
        signature: "event DivestFailed(uint256 indexed crossChainTxId)",
    });

    const ReturnFundsToUserFailed = prepareEvent({
        signature: "event ReturnFundsToUserFailed(uint256 indexed crossChainTxId)",
    });

    const contract = getContract({
        client,
        chain: SUPPORTED_CHAINS[0],
        address: vaultData.id,
    });

    const contractEvents = useContractEvents({
        contract,
        events: [CrossChainInvestSent],
    });

    const contract1 = getContract({
        client,
        chain: defineChain(strategyChainID),
        address: strategyAddress,
    });

    const FundsEvents = contract1 != undefined &&
        useContractEvents({
            contract: contract1,
            events: [FundsInvested],
        })

    const FundsDivestedEvents = contract1 != undefined &&
        useContractEvents({
            contract: contract1,
            events: [FundsDivested],
        })


    const DepositedEvents = useContractEvents({
        contract,
        events: [Deposited],
    });

    const DivestSentEvents = useContractEvents({
        contract,
        events: [DivestSent],
    });

    const ReturnFundsToUserSentEvents = useContractEvents({
        contract,
        events: [ReturnFundsToUserSent],
    });

    const WithdrawnEvents = useContractEvents({
        contract,
        events: [Withdrawn],
    });

    const CrossChainInvestFailedEvents = useContractEvents({
        contract,
        events: [CrossChainInvestFailed],
    });

    const DivestFailedEvents = useContractEvents({
        contract,
        events: [DivestFailed],
    });

    const ReturnFundsToUserFailedEvents = useContractEvents({
        contract,
        events: [ReturnFundsToUserFailed],
    });


    useEffect(() => {
        if (contractEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < contractEvents.data.length; index++) {
                for (let index = 0; index < contractEvents.data.length; index++) {
                    const element = contractEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [contractEvents.data, crosschainInvestHash])

    useEffect(() => {
        if (DivestSentEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < DivestSentEvents.data.length; index++) {
                for (let index = 0; index < DivestSentEvents.data.length; index++) {
                    const element = DivestSentEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [DivestSentEvents.data, crosschainInvestHash])

    useEffect(() => {
        if (ReturnFundsToUserSentEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < ReturnFundsToUserSentEvents.data.length; index++) {
                for (let index = 0; index < ReturnFundsToUserSentEvents.data.length; index++) {
                    const element = ReturnFundsToUserSentEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [ReturnFundsToUserSentEvents.data, crosschainInvestHash])


    useEffect(() => {
        if (WithdrawnEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < WithdrawnEvents.data.length; index++) {
                for (let index = 0; index < WithdrawnEvents.data.length; index++) {
                    const element = WithdrawnEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [WithdrawnEvents.data, crosschainInvestHash])

    useEffect(() => {
        if (CrossChainInvestFailedEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < CrossChainInvestFailedEvents.data.length; index++) {
                for (let index = 0; index < CrossChainInvestFailedEvents.data.length; index++) {
                    const element = CrossChainInvestFailedEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        setAction(Action.CrossChainInvestFailed);
                        setStep(0);
                        return
                    }
                }
            }
        }
        console.log("CrossChainInvestFailedEvents", CrossChainInvestFailedEvents)
    }, [CrossChainInvestFailedEvents.data, crosschainInvestHash])

    useEffect(() => {
        if (DivestFailedEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < DivestFailedEvents.data.length; index++) {
                for (let index = 0; index < DivestFailedEvents.data.length; index++) {
                    const element = DivestFailedEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        setAction(Action.DivestFailed);
                        setStep(0);
                        return
                    }
                }
            }
        }
    }, [DivestFailedEvents.data, crosschainInvestHash])

    useEffect(() => {
        if (ReturnFundsToUserFailedEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < ReturnFundsToUserFailedEvents.data.length; index++) {
                for (let index = 0; index < ReturnFundsToUserFailedEvents.data.length; index++) {
                    const element = ReturnFundsToUserFailedEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        setAction(Action.ReturnFundsToUserFailed);
                        setStep(0);
                        return
                    }
                }
            }
        }
    }, [ReturnFundsToUserFailedEvents.data, crosschainInvestHash])

    useEffect(() => {
        if (contract1.address != "" && contract1.chain.id != 0) {
            if (FundsEvents && typeof FundsEvents === 'object' && FundsEvents !== null && crosschainInvestHash != "") {
                if (FundsEvents.data?.length) {
                    for (let index = 0; index < FundsEvents.data.length; index++) {
                        for (let index = 0; index < FundsEvents.data.length; index++) {
                            const element = FundsEvents.data[index];
                            if (element.transactionHash == crosschainInvestHash) {
                                const nextStep = step + 1;
                                setAction(actions[nextStep]);
                                setStep(nextStep);
                                return
                            }
                        }
                    }
                }
            }
        }
    }, [FundsEvents, crosschainInvestHash])

    useEffect(() => {
        if (contract1.address != "" && contract1.chain.id != 0) {
            if (FundsDivestedEvents && typeof FundsDivestedEvents === 'object' && FundsDivestedEvents !== null && crosschainInvestHash != "") {
                if (FundsDivestedEvents.data?.length) {
                    for (let index = 0; index < FundsDivestedEvents.data.length; index++) {
                        for (let index = 0; index < FundsDivestedEvents.data.length; index++) {
                            const element = FundsDivestedEvents.data[index];
                            if (element.transactionHash == crosschainInvestHash) {
                                const nextStep = step + 1;
                                setAction(actions[nextStep]);
                                setStep(nextStep);
                                return
                            }
                        }
                    }
                }
            }
        }
    }, [FundsDivestedEvents, crosschainInvestHash])

    useEffect(() => {
        if (DepositedEvents.data?.length && crosschainInvestHash != "") {
            for (let index = 0; index < DepositedEvents.data.length; index++) {
                for (let index = 0; index < DepositedEvents.data.length; index++) {
                    const element = DepositedEvents.data[index];
                    if (element.transactionHash == crosschainInvestHash) {
                        const nextStep = step + 1;
                        setAction(actions[nextStep]);
                        setStep(nextStep);
                        return
                    }
                }
            }
        }
    }, [DepositedEvents.data, crosschainInvestHash])



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
            setCrosschainInvestHash={setCrosschainInvestHash}
            setInputBalance={setInputBalance}
        />
    </div>
}


function Interaction({ inputToken, inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, activeChain, interactionPostHook, setShowModal, actions, setCrosschainInvestHash, setInputBalance }:
    { inputToken: Token, inputBalance: Balance, action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, interactionPostHook: (e?: any) => Promise<any>, setShowModal: Function, actions: Action[], setCrosschainInvestHash: Function, setInputBalance: Function }): JSX.Element {

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
                setDescription("Deposit confirmed.")
                break;
            case Action.crosschainInvest:
                setDescription("CrossChainInvestSent.")
                break;
            case Action.FundsInvest:
                setDescription("FundsInvested.")
                break;
            case Action.deposited:
                setDescription("Deposited.")
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
                setDescription("Withdraw confirmed.")
                break;
            case Action.DivestSent:
                setDescription("DivestSent.")
                break;
            case Action.FundsDivested:
                setDescription("FundsDivested.")
                break;
            case Action.ReturnFundsToUserSent:
                setDescription("ReturnFundsToUserSent.")
                break;
            case Action.Withdrawn:
                setDescription("Withdrawn.")
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.CrossChainInvestFailed:
                setDescription("CrossChainInvestFailed.")
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.DivestFailed:
                setDescription("DivestFailed.")
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.ReturnFundsToUserFailed:
                setDescription("ReturnFundsToUserFailed.")
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
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
            action,
            setCrosschainInvestHash,
            setInputBalance
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
                    setTransactionCompleted, activeChain, setInputBalance);
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
