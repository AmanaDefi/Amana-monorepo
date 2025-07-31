import { useCallback } from "react";
import {
  createPublicClient,
  http,
  custom,
  getContract,
  parseEther,
  parseUnits,
  erc20Abi,
} from "viem";
import { getPublicClient, getWalletClient } from "@/utils/getPublicClient";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Address, Chain } from "viem";
import { ConnectedWallet } from "@privy-io/react-auth";
import { CHAIN_ID } from "@/constants/chainConfig";
import { Token } from "@/types/types";
import { useWallet } from "@solana/wallet-adapter-react";
import { showErrorToast, showSuccessToast, showWarningToast } from "@/toasts";

interface UseSendTransactionProps {
  walletAddress: string | null;
  activeChain: Chain | null;
  selectedToken: Token | null;
  privyEVMWallet: ConnectedWallet | undefined;
  solanaConnected: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  onSuccess: () => void;
}

export const useSendTransaction = ({
  walletAddress,
  activeChain,
  selectedToken,
  privyEVMWallet,
  solanaConnected,
  setLoading,
  setError,
  onSuccess,
}: UseSendTransactionProps) => {
  const { publicKey, sendTransaction } = useWallet();

  const handleTransactionError = (error: any) => {
    console.error("Transaction error:", error);

    const errorMessage =
      error.message?.toLowerCase() || error.details?.toLowerCase() || "";

    if (
      errorMessage.includes("user rejected") ||
      errorMessage.includes("user denied") ||
      errorMessage.includes("user cancelled") ||
      errorMessage.includes("user canceled") ||
      errorMessage.includes("transaction was cancelled") ||
      errorMessage.includes("transaction cancelled") ||
      errorMessage.includes("rejected by user") ||
      error.code === 4001 ||
      error.code === "ACTION_REJECTED"
    ) {
      showWarningToast("Transaction was cancelled");
      setError("");
    } else {
      const errorMsg =
        error.message ||
        error.details ||
        "Transaction failed. Please try again.";
      showErrorToast(errorMsg);
      setError(errorMsg);
    }
  };

  const sendTransactionFunc = useCallback(
    async (recipientAddress: string, amount: string) => {
      if (!walletAddress || !activeChain) {
        setError("Wallet not connected or active chain not set.");
        return;
      }
      if (!selectedToken) {
        setError("No token selected for transaction.");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const amountFloat = parseFloat(amount);

        if (
          solanaConnected &&
          publicKey &&
          activeChain.id === CHAIN_ID.solana
        ) {
          console.log("Initiating Solana transaction...");

          const connection = new Connection(
            activeChain.rpcUrls.default.http[0],
          );
          const recipientPubkey = new PublicKey(recipientAddress);

          let transaction = new Transaction();

          if (selectedToken.isNative) {
            console.log("Sending native SOL...");
            transaction.add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: recipientPubkey,
                lamports: Math.round(amountFloat * LAMPORTS_PER_SOL),
              }),
            );
          } else {
            console.log(`Sending SPL token: ${selectedToken.symbol}...`);
            const tokenMintAddress = new PublicKey(selectedToken.address);

            const fromTokenAccount = await getAssociatedTokenAddress(
              tokenMintAddress,
              publicKey,
              false,
              TOKEN_PROGRAM_ID,
            );

            let toTokenAccount: PublicKey;
            try {
              toTokenAccount = await getAssociatedTokenAddress(
                tokenMintAddress,
                recipientPubkey,
                false,
                TOKEN_PROGRAM_ID,
              );
            } catch (e: any) {
              if (e.message.includes("could not find account")) {
                throw new Error(
                  `Recipient does not have a token account for ${selectedToken.symbol}. Please ask them to create one or ensure it exists.`,
                );
              } else {
                throw new Error(
                  `Failed to find recipient token account: ${e.message}`,
                );
              }
            }

            transaction.add(
              createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                publicKey,
                BigInt(Math.round(amountFloat * 10 ** selectedToken.decimals)),
                [],
                TOKEN_PROGRAM_ID,
              ),
            );
          }

          const txSignature: string = await sendTransaction(
            transaction,
            connection,
          );
          console.log("Solana Transaction Signature:", txSignature);
          await connection.confirmTransaction(txSignature, "confirmed");
          console.log("Solana Transaction Confirmed!");
          showSuccessToast("Transaction sent successfully!");
          onSuccess();
        } else if (
          privyEVMWallet?.address &&
          activeChain.id !== CHAIN_ID.solana
        ) {
          // Privy EVM Wallet
          console.log("Initiating EVM transaction via Privy...");

          const walletClient = await getWalletClient(privyEVMWallet);
          if (!walletClient) {
            throw new Error("Failed to get EVM wallet client.");
          }

          const publicClient = getPublicClient(activeChain.id);
          if (!publicClient) {
            throw new Error("Failed to get EVM public client.");
          }

          const senderAddress = walletAddress as Address;
          const recipient = recipientAddress as Address;

          if (selectedToken.isNative) {
            console.log("Sending native EVM token...");
            const amountWei = parseEther(amount);
            const hash = await walletClient.sendTransaction({
              account: senderAddress,
              to: recipient,
              value: amountWei,
              chain: activeChain,
            });
            console.log("EVM Native Token Transaction Hash:", hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("EVM Native Token Transaction Confirmed!");
            showSuccessToast("Transaction sent successfully!");
            onSuccess();
          } else {
            console.log(`Sending ERC-20 token: ${selectedToken.symbol}...`);
            const tokenContractAddress = selectedToken.address as Address;

            const tokenContract = getContract({
              address: tokenContractAddress,
              abi: erc20Abi,
              client: publicClient,
            });
            const decimals = await tokenContract.read.decimals();

            const amountParsedWithDecimals = parseUnits(
              amount,
              Number(decimals),
            );

            const hash = await walletClient.writeContract({
              address: tokenContractAddress,
              abi: erc20Abi,
              functionName: "transfer",
              args: [recipient, amountParsedWithDecimals],
              account: senderAddress,
              chain: activeChain,
            });

            console.log("EVM ERC-20 Token Transaction Hash:", hash);
            await publicClient.waitForTransactionReceipt({ hash });
            console.log("EVM ERC-20 Token Transaction Confirmed!");
            showSuccessToast("Transaction sent successfully!");
            onSuccess();
          }
        } else {
          throw new Error(
            "No active wallet connection detected for sending. Please connect an EVM or Solana wallet.",
          );
        }
      } catch (error: any) {
        handleTransactionError(error);
      } finally {
        setLoading(false);
      }
    },
    [
      walletAddress,
      activeChain,
      selectedToken,
      privyEVMWallet,
      solanaConnected,
      publicKey,
      sendTransaction,
      setLoading,
      setError,
      onSuccess,
    ],
  );

  return { sendTransaction: sendTransactionFunc };
};
