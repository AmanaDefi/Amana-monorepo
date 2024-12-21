import { useState, useEffect, CSSProperties, act } from "react"
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
            step={step}
        />
    </div>
}


function Interaction({ inputToken, inputBalance, action, vaultData, EOAaccount, setTransactionCompleted, activeChain, interactionPostHook, setShowModal, actions, setCrosschainInvestHash, setInputBalance, step }:
    { inputToken: Token, inputBalance: Balance, action: Action, vaultData: VaultData, EOAaccount: Account, setTransactionCompleted: (value: boolean) => void, activeChain: Chain, interactionPostHook: (e?: any) => Promise<any>, setShowModal: Function, actions: Action[], setCrosschainInvestHash: Function, setInputBalance: Function, step: number }): JSX.Element {

    const [description1, setDescription1] = useState<string[]>([])
    const [description2, setDescription2] = useState<string[]>([])
    const [label, setlabel] = useState('')
    const [status, setStatus] = useState(false)
    const [disabled, setDisabled] = useState(true)





    useEffect(() => {
        const val = NumberFormatter.format(Number(inputBalance.formatted))
        console.log("24432424243", action)
        switch (action) {
            case Action.depositApprove:
                setDisabled(status);
                setDescription1(["Transaction approval required."]);
                setDescription2([`Approving for Deposit ${val} ${inputToken.symbol} into the Vault.`]);
                setlabel("Approve")
                break;
            case Action.depositApproveConfirmed:
                setDescription1([...description1, "Approval Confirmed."]);
                setlabel("Deposit")
                setTimeout(() => {
                    setDisabled(false);
                }, 3000);
                break;
            case Action.deposit:
                setlabel("Deposit")
                setDisabled(status);
                if (actions.includes(Action.depositApprove)) {
                    setDescription1([...description1, `Please Deposit.`]);
                    setDescription2([...description2, `Depositing ${val} ${inputToken.symbol} into the Vault.`]);
                }
                else {
                    setDescription1([`Please Deposit.`]);
                    setDescription2([`Depositing ${val} ${inputToken.symbol} into the Vault.`]);
                }
                break;
            case Action.depositConfirmed:
                setDescription1([...description1, "Deposit confirmed."]);
                setDescription2([...description2, "Waiting CrossChainInvest."]);
                break;
            case Action.crosschainInvest:
                setDescription1([...description1, "CrossChainInvestSent."]);
                setDescription2([...description2, "Waiting FundsInvest."]);
                break;
            case Action.FundsInvest:
                setDescription1([...description1, "FundsInvested."]);
                setDescription2([...description2, "Waiting Deposit."]);
                break;
            case Action.deposited:
                setDescription1([...description1, "Deposited."]);
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
                    setDescription1([...description1, `Withdrawing ${val} ${inputToken.symbol}.`]);
                }
                else {
                    setDisabled(false);
                    setDescription1([...description1, "Withdraw confirmation required."]);
                }
                break;
            case Action.withdrawconfirmed:
                setDescription1([...description1, "Withdraw confirmed."]);
                break;
            case Action.DivestSent:
                setDescription1([...description1, "DivestSent."]);
                break;
            case Action.FundsDivested:
                setDescription1([...description1, "FundsDivested."]);
                break;
            case Action.ReturnFundsToUserSent:
                setDescription1([...description1, "ReturnFundsToUserSent."]);
                break;
            case Action.Withdrawn:
                setDescription1([...description1, "Withdrawn."]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.CrossChainInvestFailed:
                setDescription1([...description1, "CrossChainInvestFailed."]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.DivestFailed:
                setDescription1([...description1, "DivestFailed."]);
                setTimeout(() => {
                    setTransactionCompleted(true);
                    setInputBalance({
                        ...inputBalance,
                        formatted: "0",
                    })
                }, 2000);
                break;
            case Action.ReturnFundsToUserFailed:
                setDescription1([...description1, "ReturnFundsToUserFailed."]);
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
        setStatus(false)
        await interactionPostHook(success)
    } const val = NumberFormatter.format(Number(inputBalance.formatted))

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
                                    ((item != Action.deposit && item != Action.depositApprove) || (item == Action.depositApprove && !status && action == Action.depositApprove) || (item == Action.deposit && !status && action == Action.deposit)) &&
                                    <div className="flex items-center">
                                        {
                                            (item == Action.deposit || item == Action.depositApprove) ?
                                                <AiOutlineExclamation color="Green" size={20} />
                                                :
                                                <AiOutlineCheck color="Green" size={20} />
                                        }
                                        <p className="text-white text-start mb-2">{description1[item == Action.deposit || item == Action.depositApprove || item == Action.depositApproveConfirmed || !actions.includes(Action.depositApprove) ? index : index + 1]}</p>
                                    </div>
                                }
                                {
                                    index == step &&
                                    ((item !== Action.deposit && item !== Action.depositApprove && item != Action.depositApproveConfirmed) || (item === Action.depositApprove && status) || (item === Action.deposit && status)) &&
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
