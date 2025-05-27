import { JsonRpcProvider } from 'ethers';
import { zetaRpcUrl, CHAIN_ID } from '@/constants/chainConfig';

const baseProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_BASE!);
const ethereumProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ETH!);
const arbitrumProvider = new JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL_ARBITRUM_ONE!);
const zetaProvider = new JsonRpcProvider(zetaRpcUrl, CHAIN_ID.zetachain);

export { baseProvider, ethereumProvider, arbitrumProvider, zetaProvider };