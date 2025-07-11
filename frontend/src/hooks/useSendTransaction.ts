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

  const sendTransactionFunc = useCallback(
    async (recipientAddress: string, amount: string) => {
      if (!walletAddress || !activeChain) {
        setError("Wallet not connected or active chain not set.");
        setLoading(false);
        return;
      }
      if (!selectedToken) {
        setError("No token selected for transaction.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const amountFloat = parseFloat(amount);
      // Solana
      try {
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
                setError(
                  `Recipient does not have a token account for ${selectedToken.symbol}. Please ask them to create one or ensure it exists.`,
                );
              } else {
                setError(
                  `Failed to find recipient token account: ${e.message}`,
                );
              }
              setLoading(false);
              return;
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

          try {
            const txSignature: string = await sendTransaction(
              transaction,
              connection,
            );
            console.log("Solana Transaction Signature:", txSignature);
            await connection.confirmTransaction(txSignature, "confirmed");
            console.log("Solana Transaction Confirmed!");
            onSuccess();
          } catch (solanaError: any) {
            console.error("Solana Transaction Error:", solanaError);
            setError(
              solanaError.message || "Failed to send Solana transaction.",
            );
          }
        } else if (
          privyEVMWallet?.address &&
          activeChain.id !== CHAIN_ID.solana
        ) {
          // Privy EVM Wallet
          console.log("Initiating EVM transaction via Privy...");

          const walletClient = await getWalletClient(privyEVMWallet);
          if (!walletClient) {
            setError("Failed to get EVM wallet client.");
            setLoading(false);
            return;
          }

          const publicClient = getPublicClient(activeChain.id);
          if (!publicClient) {
            setError("Failed to get EVM public client.");
            setLoading(false);
            return;
          }

          const senderAddress = walletAddress as Address;
          const recipient = recipientAddress as Address;

          if (selectedToken.isNative) {
            console.log("Sending native EVM token...");
            try {
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
              onSuccess();
            } catch (evmError: any) {
              console.error("EVM Native Token Send Error:", evmError);
              setError(
                evmError.details ||
                  evmError.message ||
                  "Failed to send native token.",
              );
            }
          } else {
            console.log(`Sending ERC-20 token: ${selectedToken.symbol}...`);
            try {
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
              onSuccess();
            } catch (evmError: any) {
              console.error("EVM ERC-20 Token Send Error:", evmError);
              setError(
                evmError.details ||
                  evmError.message ||
                  "Failed to send ERC-20 token.",
              );
            }
          }
        } else {
          setError(
            "No active wallet connection detected for sending. Please connect an EVM or Solana wallet.",
          );
          console.warn(
            "No active wallet or unsupported chain type for sending.",
            {
              solanaConnected,
              publicKey,
              privyEVMWallet,
              activeChain,
            },
          );
        }
      } catch (err) {
        setError(
          "An unexpected error occurred during transaction preparation.",
        );
        console.error("General transaction error:", err);
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
