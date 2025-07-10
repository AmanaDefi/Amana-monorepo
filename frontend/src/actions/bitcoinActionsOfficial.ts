// import { bitcoinDepositAndCall } from "@zetachain/toolkit";
// import { ZetaChainClient } from "@zetachain/toolkit";
import { bitcoinDepositAndCall } from "@zetachain/toolkit";
import { ethers } from "ethers";
import { VaultData, Token } from "@/types/types";

interface OfficialBitcoinDepositParams {
  vaultData: VaultData;
  bitcoinWallet: any; // Bitcoin wallet instance
  transactionAmount: bigint;
  inputToken: Token;
  setcrossChainTxId: Function;
}

export const executeOfficialBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken,
  setcrossChainTxId,
}: OfficialBitcoinDepositParams) => {
  try {
    console.log("🟠 Executing Official ZetaChain Bitcoin Deposit (Toolkit)");

    // 1. Calculate minimum shares out (reuse your existing logic if available)
    // For now, set to 0 for direct deposit (update as needed)
    const minSharesOut = 0n;

    // 2. Generate transaction ID
    const transactionId = ethers.keccak256(
      ethers.toUtf8Bytes(
        `bitcoin-${bitcoinWallet.address}-${Date.now()}-${Math.random()}`
      )
    );

    // 3. Prepare slippage
    const slippage = 0.5; // Default to 0.5% if not available
    const slippageValue = (slippage * 100).toFixed(0);

    // 4. Prepare vault payload (same as your existing structure)
    const vaultPayload = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "address",
        "uint256",
        "uint256",
        "uint16",
        "bytes",
        "bytes",
        "bytes32",
      ],
      [
        ethers.ZeroAddress, // withdrawZRC20
        inputToken.address, // inputToken address (ZRC-20 BTC)
        0, // withdrawAssetAmount
        minSharesOut, // minimumOut
        slippageValue, // slippage
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), // nonEvmAddress
        "0x", // swapData
        ethers.keccak256(ethers.toUtf8Bytes("TX_DEPOSIT_INITIATED")), // txStatus
      ]
    );

    // 5. Use ZetaChain's official Bitcoin deposit function
    const depositResult = await bitcoinDepositAndCall({
      amount: Number(transactionAmount), // Convert to number (satoshis)
      recipient: vaultData.id, // Your vault contract address
      message: vaultPayload, // ABI-encoded payload
      bitcoinWallet: bitcoinWallet, // Bitcoin wallet instance
      revertAddress: bitcoinWallet.address, // Fallback address
    });

    console.log("🟠 Official Bitcoin Deposit Result:", depositResult);

    setcrossChainTxId(transactionId);

    return {
      transactionHash: depositResult.hash,
      transactionId,
      crossChainTxId: transactionId,
      commitTxId: depositResult.commitTxId,
      revealTxId: depositResult.revealTxId,
    };
  } catch (error) {
    console.error("❌ Official Bitcoin deposit failed:", error);
    throw error;
  }
}; 