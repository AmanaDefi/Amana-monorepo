import { PreparedTransaction, ThirdwebClient } from "thirdweb";
import { ChainOptions } from "thirdweb/chains";
import { Address } from "viem";

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
  type: string;
  symbol: string;
  des?: string;
  imgURL?: string;
  depositFeePaidFromGasTank: boolean;
  minDeposit?: number; // Minimum deposit amount in USD
  maxWithdraw?: number; // Maximum instant withdrawal amount in USD
  inputToken: Token;
  strategyNetwork?: string;
  protocol: {
    name: string;
    strategyAddress: string;
    rewardsContractAddress?: string;
    network: string;
    chainId: number;
    netdes?: string;
    imgURL: string;
    des?: string;
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
  apy30d?: number;
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

export type Balance = {
  value: bigint;
  formatted: string;
  formattedUSD?: string;
}

export interface Token {
  address: Address | string;
  symbol: string;
  decimals: number;
  imgURL: string;
  price: number;
  balance: Balance;
  isNative: boolean;
  ZRC20equivalent?: Token;
}

export interface TokenByAddress {
  [key: Address]: Token;
}

export enum SmartVaultActionType {
  Deposit,
  Withdrawal
}

export enum StepStatus {
  upcoming,
  undergo,
  completed
}

export type Step = {
  description: string,
  status: StepStatus
}

export type Milestone = {
  title: string,
  steps: Step[],
}

export enum Action {
  depositApprove,
  depositApproveConfirmed,
  deposit,
  depositConfirmed,
  CrossChainDepositFailed,
  crosschainInvest,
  CrossChainInvestFailed,
  FundsInvest,
  InvestConfirmFailed,
  deposited,
  withdraw,
  withdrawconfirmed,
  CrossChainWithdrawFailed,
  DivestSent,
  FundsWithdrawn,
  DivestFailed,
  FundsDivested,
  ReturnFundsToUserSent,
  ReturnFundsFromStrategyFailed,
  Withdrawn,
  ReturnFundsToUserFailed,
  FundsReturnedError,
  FundsReturned,
  withdrew,
  failed
}

export enum TransactionStepStatus {
  pending = 'PENDING',
  processing = 'PROCESSING',
  completed = 'COMPLETED',
  error = 'ERROR'
}

export type TransactionStepFeedback = {
  label: string
  description: string
  status: TransactionStepStatus,
  txHash?: string,
  isWaitingTooLong?: boolean,
  waitTime?: number,
  isRecovery?: boolean,
  recoveryAttempted?: boolean,
  outboundHash?: string
}

export type TransactionStepMessages = {
  [K in Action]?: TransactionStepFeedback | null
}

export interface UserSettings {
  slippage: {
    isAuto: boolean;
    value: number;
  };
}

export const DEFAULT_SETTINGS: UserSettings = {
  slippage: { isAuto: true, value: 5 }
};

export type LeaderboardUserData = {
  user_address: Address,
  points: number,
  position: number
}

export type SearchParams = {
  userAddress: string,
  page: number,
  perPage: number,
}

export type Icon = {
  url: string;
  width: number;
  height: number;
  format: string;
}

export enum Tabs {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export interface ITxLocalStorage {
  tab: Tabs;

  action: Action;
  step: number;
  steps: Action[];

  selectedToken: string; //JSON.stringify fo save BigInt
  inputBal: string; //JSON.stringify fo save BigInt
  displayValue: string;

  crosschainInvestHash: string;
  lastEventTxHash: string;
  crossChainTxId: string;
  depositTx: PreparedTransaction;

  isTransactionStarted: boolean;
  isTransactionProcessing: boolean;
  finishedTransaction: boolean;
  transactionCompleted: boolean;
  selectedChain?: string;

  slippage?: {
    value: number;
    isAuto: boolean;
  };

  transactionStepFeedback: TransactionStepMessages;
  lastTransactionStepFeedback: TransactionStepMessages;
}