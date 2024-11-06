import { ThirdwebClient } from "thirdweb";
import { ChainOptions } from "thirdweb/chains";

export interface NewUserModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onAddUser: (username: string, walletAddress: string) => void;
  username?: string;
  isLoading?: boolean;
  onChangeUsername?: (username: string) => void;
  onCreateAccount?: () => void;
}

export interface Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}
export interface Rate {
  id: string;
  type: string;
  rate: string;
}

export interface VaultData {
  id: string;
  name: string;
  symbol: string;
  inputToken: {
    symbol: string;
    decimals: number;
    address: string;
    imgURL: string;
  };
  protocol: {
    name: string;
    network: string;
    imgURL: string;
  }
}

export interface UserVaultBalance {
  vaultId: string;
  balance: string | number | "Error"; // Adjust the type as needed
}

export interface VaultTotalAssets {
  vaultId: string;
  totalAssets: string | number | "Error"; // Adjust the type as needed
}

export interface VaultTotalAssetsinToken {
  vaultId: string;
  totalAssetsinToken: string | number | "Error"; // Adjust the type as needed
}

export interface VaultAPY {
  vaultId: string;
  APY7d: string | number | "Error"; // Adjust the type as needed
}

export interface User {
  walletAddress: string;
  managerAddress: string;
}

export type UserMap = { [username: string]: User };

export interface TransactionResult {
  readonly transactionHash: `0x${string}`;
  client: ThirdwebClient;
  chain: Readonly<ChainOptions & { rpc: string }>;
  maxBlocksWaitTime?: number;
}