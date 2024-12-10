import { allowance } from "thirdweb/extensions/erc20";
import { Address, getContract, Chain } from "thirdweb";
import { client } from "../utils/client";

interface HandleAllowanceProps {
    token: Address;
    activeChain: Chain;
    activeAccount: Address;
    spender: Address;
    amount: Number
}

export async function handleAllowance({
    token,
    activeChain,
    activeAccount,
    spender,
    amount
}: HandleAllowanceProps): Promise<boolean> {

    let contract = getContract({
        client,
        chain: activeChain, // this will always be Zetachain
        address: token
    });
    let allow: bigint;
    const deployEnv = process.env.NEXT_PUBLIC_DEPLOY_ENV;
    const EVMGatewayAddress = deployEnv === "testnet"
        ? process.env.NEXT_PUBLIC_EVM_GATEWAY_ADDRESS_TESTNET
        : process.env.NEXT_PUBLIC_EVM_GATEWAY_ADDRESS;

    if (activeChain.id === 7000 || activeChain.id === 7001) {
        allow = await allowance({
            contract,
            owner: activeAccount,
            spender: spender,
        });
    }
    else {
        allow = await allowance({
            contract,
            owner: activeAccount,
            spender: EVMGatewayAddress as Address,
        });
    }

    if (Number(allow) >= Number(amount)) {
        return true;
    }
    else {
        return false;
    }
}
