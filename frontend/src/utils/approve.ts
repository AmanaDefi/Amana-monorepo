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

    let allow = await allowance({
        contract,
        owner: activeAccount,
        spender: spender,
    });
    if (Number(allow) >= Number(amount)) {
        return true;
    }
    else {
        return false;
    }
}
