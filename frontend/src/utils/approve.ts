import { Chain, getContract, erc20Abi } from "viem";
import { EVM_GATEWAY_ADDRESSES } from "@/constants/chainConfig"; // adjust path if needed
import { getPublicClient} from "./getPublicClient";
import { ConnectedWallet } from "@privy-io/react-auth";

interface HandleAllowanceProps {
  token: string;
  activeChain: Chain;
  activeAccount: string;
  spender: string;
  amount: Number;
  activeWallet: ConnectedWallet
}

export async function isApproved({
  token,
  activeChain,
  activeAccount,
  spender,
  amount,
  activeWallet
}: HandleAllowanceProps): Promise<boolean> {
  const publicClient = getPublicClient(activeChain.id);
  if (!publicClient) return false;

  const contract = getContract({
    client: { public: publicClient},
    address: token,
    abi: erc20Abi,
  });
  let allow: bigint;

  const EVMGatewayAddress = EVM_GATEWAY_ADDRESSES[activeChain.id];

  try {
    if (activeChain.id === 7000 || activeChain.id === 7001) {
      allow = await contract.read.allowance([activeAccount, spender]);
    } else {
      allow = await contract.read.allowance([activeAccount, EVMGatewayAddress]);
    }

    if (Number(allow) >= Number(amount)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}
