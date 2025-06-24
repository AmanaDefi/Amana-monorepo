import { allowance } from "thirdweb/extensions/erc20";
import { Address, getContract, Chain } from "thirdweb";
import { client } from "../utils/client";
import { EVM_GATEWAY_ADDRESSES } from "@/constants/chainConfig"; // adjust path if needed

interface HandleAllowanceProps {
    token: Address;
    activeChain: Chain;
    activeAccount: Address;
    spender: Address;
    amount: Number
}

export async function isApproved({
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

    const EVMGatewayAddress = EVM_GATEWAY_ADDRESSES[activeChain.id];

    try {
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
    } catch (error) {
        return false;
    }

}
