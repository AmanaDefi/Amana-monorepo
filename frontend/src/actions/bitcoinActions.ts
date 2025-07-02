import { ethers, AbiCoder, keccak256, toUtf8Bytes, ZeroAddress } from "ethers";
import { VaultData, Token } from "@/types/types";
import { getCurrentSlippage } from "@/utils/utils";
import { CHAIN_ID } from "@/constants/chainConfig";
import { ZC_BTC_BTC_ADDRESS } from "@/constants";
import { updateLocalStorageObject } from "@/utils/localStorageUtils";
import { trackEvent } from "@/utils/trackEvent";
import { showErrorToast } from "@/toasts";
import { crossChainTxUrl } from "@/constants/chainConfig";
import axios from "axios";

// Bitcoin wallet interface (from useBitcoinWallet.ts)
interface BitcoinWallet {
  address: string;
  publicKey: string;
  network: 'mainnet' | 'testnet';
  signTransaction: (tx: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<number>;
  provider: any;
}

// Bitcoin deposit parameters interface
interface BitcoinDepositParams {
  vaultData: VaultData;
  bitcoinWallet: BitcoinWallet;
  transactionAmount: bigint; // in satoshis
  inputToken: Token; // Bitcoin token info
  setcrossChainTxId: Function;
}

// Bitcoin deposit result interface
export interface BitcoinDepositResult {
  transactionHash: string;
  transactionId: `0x${string}`;
  crossChainTxId: `0x${string}`;
  bitcoinTxId?: string;
}

const abiCoder = new AbiCoder();

// Export Bitcoin chain ID for convenience
export const BITCOIN_CHAIN_ID = CHAIN_ID.bitcoin;

/**
 * Debug utility to diagnose Bitcoin integration issues
 * Call this function to get detailed information about Bitcoin configuration
 */
export const debugBitcoinIntegration = async (vaultData?: VaultData) => {
  console.log("🔧 === BITCOIN INTEGRATION DEBUG UTILITY ===");
  
  try {
    // 1. Check Bitcoin token configuration
    console.log("🔧 1. Bitcoin Token Configuration:");
    console.log({
      ZC_BTC_BTC_ADDRESS,
      addressLength: ZC_BTC_BTC_ADDRESS.length,
      isValidAddress: ZC_BTC_BTC_ADDRESS.startsWith('0x') && ZC_BTC_BTC_ADDRESS.length === 42
    });

    // 2. Check if token is configured in Beam
    console.log("🔧 2. Checking Bitcoin in Beam router...");
    const { getBeamTokenId } = await import('./actions');
    const bitcoinTokenId = await getBeamTokenId(ZC_BTC_BTC_ADDRESS);
    
    console.log("🔧 Bitcoin Beam Configuration:", {
      bitcoinTokenId,
      isConfigured: !!bitcoinTokenId,
      recommendation: bitcoinTokenId ? 
        "✅ Bitcoin is properly configured in Beam" : 
        "❌ Bitcoin is NOT configured in Beam - this is the issue!"
    });

    // 3. Check vault configuration if provided
    if (vaultData) {
      console.log("🔧 3. Vault Configuration:");
      console.log({
        vaultId: vaultData.id,
        vaultInputToken: {
          address: vaultData.inputToken.address,
          symbol: vaultData.inputToken.symbol,
          decimals: vaultData.inputToken.decimals
        },
        needsSwap: ZC_BTC_BTC_ADDRESS !== vaultData.inputToken.address,
        swapDirection: `BTC (${ZC_BTC_BTC_ADDRESS}) -> ${vaultData.inputToken.symbol} (${vaultData.inputToken.address})`
      });

      // Check if vault's input token is in Beam
      const vaultTokenId = await getBeamTokenId(vaultData.inputToken.address);
      console.log("🔧 Vault Token in Beam:", {
        vaultTokenId,
        isConfigured: !!vaultTokenId,
        vaultTokenAddress: vaultData.inputToken.address,
        vaultTokenSymbol: vaultData.inputToken.symbol
      });
    }

    // 4. Provide fix recommendations
    console.log("🔧 4. Fix Recommendations:");
    
    if (!bitcoinTokenId) {
      console.error("❌ PRIMARY ISSUE: Bitcoin token not in Beam router");
      console.error("📋 IMMEDIATE FIXES:");
      console.error("   1. Contact Beam team to add Bitcoin ZRC-20 token");
      console.error("   2. Or implement direct ZetaChain swap without Beam");
      console.error("   3. Or create Bitcoin-only vaults that don't need swapping");
    } else {
      console.log("✅ Bitcoin is configured in Beam");
      if (vaultData && !vaultData.inputToken) {
        console.error("❌ Vault input token missing - check vault configuration");
      }
    }

    // 5. Alternative solutions
    console.log("🔧 5. Alternative Solutions:");
    console.log("   Option A: Create Bitcoin-specific vaults (no swap needed)");
    console.log("   Option B: Use ZetaChain native swaps instead of Beam");
    console.log("   Option C: Implement fallback swap routing");
    console.log("   Option D: Use 1:1 Bitcoin vaults temporarily");

    return {
      bitcoinTokenId,
      isConfiguredInBeam: !!bitcoinTokenId,
      needsSwap: vaultData ? ZC_BTC_BTC_ADDRESS !== vaultData.inputToken.address : null,
      canProceed: !!bitcoinTokenId
    };

  } catch (error: any) {
    console.error("❌ Debug utility failed:", error);
    return {
      bitcoinTokenId: null,
      isConfiguredInBeam: false,
      needsSwap: null,
      canProceed: false,
      error: error.message
    };
  }
};

/**
 * Temporary fix: Create a Bitcoin vault that doesn't need swapping
 * This bypasses the swap routing issue entirely
 */
export const createBitcoinDirectDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  setcrossChainTxId
}: Omit<BitcoinDepositParams, 'inputToken'>): Promise<BitcoinDepositResult> => {
  console.log("🚀 === BITCOIN DIRECT DEPOSIT (BYPASS SWAP) ===");
  
  try {
    // Generate transaction ID
    const transactionId = generateBitcoinTransactionId(bitcoinWallet.address);
    
    // Create direct deposit payload (no swap needed)
    const vaultPayload = abiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ZeroAddress,                    // withdrawZRC20 (not used)
        ZC_BTC_BTC_ADDRESS,            // inputToken (Bitcoin ZRC-20)
        0,                             // withdrawAssetAmount (not used)
        transactionAmount,             // minimumOut (1:1 ratio, no swap)
        0,                             // slippage (0% for direct deposit)
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), // nonEvmAddress
        "0x",                          // swapData (empty - no swap)
        keccak256(toUtf8Bytes("TX_DEPOSIT_INITIATED")) as `0x${string}`
      ]
    );

    console.log("🚀 Direct Bitcoin deposit payload created (no swap required)");
    
    // Execute deposit
    const result = await executeBitcoinDepositAndCall({
      vaultAddress: vaultData.id,
      payload: vaultPayload as `0x${string}`,
      revertMessage: "0x" as `0x${string}`,
      bitcoinWallet,
      amount: transactionAmount,
      transactionId
    });

    setcrossChainTxId(transactionId);

  return {
      transactionHash: result.transactionHash,
      transactionId,
      crossChainTxId: transactionId,
      bitcoinTxId: result.bitcoinTxId
    };

  } catch (error: any) {
    console.error("❌ Direct Bitcoin deposit failed:", error);
    throw error;
  }
};

/**
 * Main Bitcoin deposit function using ZetaChain's official approach
 * This follows the same pattern as our existing cross-chain deposits
 */
export const executeBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken,
  setcrossChainTxId
}: BitcoinDepositParams): Promise<BitcoinDepositResult> => {
  try {
    console.log("🟠 Executing Bitcoin Deposit to Amana Vault");
    
    // Track Bitcoin deposit initiation
    trackEvent('bitcoin_deposit_initiated', {
      vaultId: vaultData.id,
      amount: transactionAmount.toString(),
      bitcoinAddress: bitcoinWallet.address
    });

    // 1. Calculate minimum shares out using existing logic pattern
    const { minSharesOut, swapPath } = await getBitcoinPathDataAndMinSharesOut(
      vaultData,
      inputToken,
      transactionAmount
    );

    // 2. Generate transaction ID (following your existing pattern)
    const transactionId = generateBitcoinTransactionId(bitcoinWallet.address);
    
    // 3. Prepare slippage (using your existing utility)
    const slippage = getCurrentSlippage();
    const slippageValue = (slippage * 100).toFixed(0);

    // 4. Prepare vault payload (matching your existing structure)
    const vaultPayload = abiCoder.encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ZeroAddress,                    // withdrawZRC20 (not used for deposits)
        ZC_BTC_BTC_ADDRESS,            // inputToken address (ZRC-20 BTC)
        0,                             // withdrawAssetAmount (not used for deposits)
        minSharesOut,                  // minimumOut
        slippageValue,                 // slippage
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), // nonEvmAddress (Bitcoin address)
        swapPath,                      // swapData
        keccak256(toUtf8Bytes("TX_DEPOSIT_INITIATED")) as `0x${string}` // txStatus
      ]
    );

    // 5. Prepare revert message (following your existing pattern)
    const revertMessage = abiCoder.encode(
      ["string", "bytes", "address"],
      [
        "_crossChainDepositFailed", 
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), 
        bitcoinWallet.address
      ]
    );

    // 6. Store transaction ID in localStorage (following your pattern)
    updateLocalStorageObject(vaultData.id, { crossChainTxId: transactionId });

    // 7. Execute Bitcoin deposit using ZetaChain's approach
    const bitcoinDepositResult = await executeBitcoinDepositAndCall({
      vaultAddress: vaultData.id,
      payload: vaultPayload as `0x${string}`,
      revertMessage: revertMessage as `0x${string}`,
      bitcoinWallet,
      amount: transactionAmount,
      transactionId
    });

    console.log("🟠 Bitcoin Deposit Result:", bitcoinDepositResult);

    // 8. Set cross-chain transaction ID for UI tracking
    setcrossChainTxId(transactionId);

    // Track successful Bitcoin deposit
    trackEvent('bitcoin_deposit_success', {
      vaultId: vaultData.id,
      transactionId,
      bitcoinTxId: bitcoinDepositResult.bitcoinTxId
    });

    return {
      transactionHash: bitcoinDepositResult.transactionHash,
      transactionId,
      crossChainTxId: transactionId,
      bitcoinTxId: bitcoinDepositResult.bitcoinTxId
    };

  } catch (error: any) {
    console.error("❌ Bitcoin deposit failed:", error);
    
    // Track Bitcoin deposit failure
    trackEvent('bitcoin_deposit_failed', {
      vaultId: vaultData.id,
      error: error.message,
      bitcoinAddress: bitcoinWallet.address
    });

    // Show user-friendly error message
    showErrorToast(`Bitcoin deposit failed: ${error.message}`);
    
    throw error;
  }
};

/**
 * Calculate minimum shares out and swap path for Bitcoin deposits
 * This mirrors your existing getPathDataAndMinSharesOut function
 */
const getBitcoinPathDataAndMinSharesOut = async (
  vaultData: VaultData,
  inputToken: Token,
  transactionAmount: bigint
): Promise<{ swapPath: `0x${string}`; minSharesOut: bigint }> => {
  try {
    console.log("🟠 === BITCOIN PATH DATA CALCULATION START ===");
    console.log("🟠 Input Parameters:", {
      vaultId: vaultData.id,
      vaultInputToken: {
        address: vaultData.inputToken.address,
        symbol: vaultData.inputToken.symbol
      },
      inputToken: {
        address: inputToken.address,
        symbol: inputToken.symbol
      },
      ZC_BTC_BTC_ADDRESS,
      transactionAmount: transactionAmount.toString(),
      transactionAmountFormatted: ethers.formatUnits(transactionAmount, 8) // Bitcoin has 8 decimals
    });

    // For Bitcoin, we use the ZRC-20 equivalent for calculations
    const bitcoinZRC20Token = {
      ...inputToken,
      address: ZC_BTC_BTC_ADDRESS
    };

    console.log("🟠 Bitcoin ZRC-20 Token Configuration:", bitcoinZRC20Token);

    let assetsConversionAmount: bigint = transactionAmount;
    let swapPath: `0x${string}` = "0x";

    console.log("🟠 Checking if swap is needed...");
    console.log("🟠 Bitcoin ZRC-20 Address:", ZC_BTC_BTC_ADDRESS);
    console.log("🟠 Vault Input Token Address:", vaultData.inputToken.address);
    console.log("🟠 Addresses match:", ZC_BTC_BTC_ADDRESS === vaultData.inputToken.address);

    // If Bitcoin ZRC-20 is different from vault's input token, we need to swap
    if (ZC_BTC_BTC_ADDRESS !== vaultData.inputToken.address) {
      console.log("🟠 Swap required! Fetching swap path...");
      
      try {
        // Import the existing swap function
        const { getPathDataAndAmountOut } = await import('./actions');
        
        console.log("🟠 Calling getPathDataAndAmountOut with:");
        console.log("  - Amount:", transactionAmount.toString());
        console.log("  - Input Token:", bitcoinZRC20Token);
        console.log("  - Output Token:", vaultData.inputToken);
        console.log("  - User Address:", vaultData.id);
        console.log("  - Slippage:", getCurrentSlippage() * 100);

        const swapResult = await getPathDataAndAmountOut(
        transactionAmount,
          bitcoinZRC20Token,
          vaultData.inputToken,
          vaultData.id,
          getCurrentSlippage() * 100,
        );
        
        console.log("🟠 Swap Result:", {
          encodedPath: swapResult.encodedPath,
          encodedPathLength: swapResult.encodedPath?.length || 0,
          amountOut: swapResult.amountOut.toString(),
          amountOutFormatted: ethers.formatUnits(swapResult.amountOut, vaultData.inputToken.decimals)
        });

        if (swapResult.encodedPath === null || swapResult.amountOut === BigInt(0)) {
          console.error("❌ SWAP ROUTE NOT FOUND!");
          console.error("❌ This is the root cause of the issue");
          console.error("❌ Possible causes:");
          console.error("  1. Bitcoin token not configured in Beam router");
          console.error("  2. No liquidity pool exists for BTC -> " + vaultData.inputToken.symbol);
          console.error("  3. Beam API is down or returning invalid data");
          
          throw new Error(`No swap route found from Bitcoin to ${vaultData.inputToken.symbol}. This means either:
            1. Bitcoin (${ZC_BTC_BTC_ADDRESS}) is not configured in the swap router
            2. No liquidity pool exists for BTC -> ${vaultData.inputToken.symbol}
            3. The Beam swap service is unavailable`);
        }
        
        swapPath = swapResult.encodedPath ?? "0x";
        assetsConversionAmount = swapResult.amountOut;

        console.log("🟠 Swap path found successfully!");
        
      } catch (swapError: any) {
        console.error("❌ Swap path calculation failed:", swapError);
        console.error("❌ Swap error details:", {
          message: swapError.message,
          stack: swapError.stack
        });
        throw new Error(`Failed to calculate swap path: ${swapError.message}`);
      }
    } else {
      console.log("🟠 No swap needed - Bitcoin ZRC-20 matches vault input token");
    }

    console.log("🟠 Calculating minimum shares out...");
    console.log("🟠 Assets conversion amount:", assetsConversionAmount.toString());
    console.log("🟠 Current slippage:", getCurrentSlippage());

    // Calculate minimum shares out with slippage protection
    // This assumes vault has a convertToShares function (ERC4626 standard)
    const slippageBps = getCurrentSlippage() * 100;
    const minSharesOut = (assetsConversionAmount * BigInt(10000 - slippageBps)) / BigInt(10000);

    console.log("🟠 === BITCOIN PATH DATA CALCULATION COMPLETE ===");
    console.log("🟠 Final Results:", {
      originalAmount: transactionAmount.toString(),
      originalAmountFormatted: ethers.formatUnits(transactionAmount, 8),
      assetsConversionAmount: assetsConversionAmount.toString(),
      assetsConversionAmountFormatted: ethers.formatUnits(assetsConversionAmount, vaultData.inputToken.decimals),
      minSharesOut: minSharesOut.toString(),
      swapPathLength: swapPath.length,
      swapPathPreview: swapPath.substring(0, 20) + "...",
      needsSwap: swapPath !== "0x",
      slippageBps: slippageBps
    });

    return {
      swapPath,
      minSharesOut,
    };

  } catch (error: any) {
    console.error("❌ === BITCOIN PATH DATA CALCULATION FAILED ===");
    console.error("❌ Error details:", {
      message: error.message,
      stack: error.stack,
      vaultData: {
        id: vaultData.id,
        inputTokenAddress: vaultData.inputToken.address,
        inputTokenSymbol: vaultData.inputToken.symbol
      },
      inputToken: {
        address: inputToken.address,
        symbol: inputToken.symbol
      },
      ZC_BTC_BTC_ADDRESS,
      transactionAmount: transactionAmount.toString()
    });
    throw new Error(`Failed to calculate Bitcoin deposit parameters: ${error.message}`);
  }
};

/**
 * Execute Bitcoin deposit and call using ZetaChain's depositAndCall pattern
 * This is where the actual Bitcoin transaction happens
 */
const executeBitcoinDepositAndCall = async ({
  vaultAddress,
  payload,
  revertMessage,
  bitcoinWallet,
  amount,
  transactionId
}: {
  vaultAddress: string;
  payload: `0x${string}`;
  revertMessage: `0x${string}`;
  bitcoinWallet: BitcoinWallet;
  amount: bigint;
  transactionId: `0x${string}`;
}): Promise<{ transactionHash: string; bitcoinTxId: string }> => {
  try {
    console.log("🟠 Executing Bitcoin DepositAndCall");

    // Check if ZetaChain toolkit is available
    if (typeof window === 'undefined' || !(window as any).zetaToolkit) {
      throw new Error("ZetaChain toolkit not loaded. Please install @zetachain/toolkit");
    }

    const zetaToolkit = (window as any).zetaToolkit;

    // Prepare Bitcoin deposit parameters
    const depositParams = {
      recipient: vaultAddress,           // Your vault contract address
      amount: Number(amount),            // Amount in satoshis
      message: payload,                  // ABI-encoded payload
      bitcoinWallet: bitcoinWallet,      // Bitcoin wallet instance
      revertAddress: bitcoinWallet.address // Fallback address if transaction fails
    };

    console.log("🟠 Bitcoin Deposit Parameters:", {
      recipient: depositParams.recipient,
      amount: depositParams.amount,
      messageLength: depositParams.message.length,
      revertAddress: depositParams.revertAddress
    });

    // Execute Bitcoin deposit using ZetaChain toolkit
    const result = await zetaToolkit.bitcoinDepositAndCall(depositParams);

    console.log("🟠 ZetaChain Bitcoin Deposit Result:", result);
    
    return {
      transactionHash: result.hash || result.transactionHash,
      bitcoinTxId: result.bitcoinTxId || result.hash
    };

  } catch (error: any) {
    console.error("❌ Bitcoin depositAndCall execution failed:", error);
    
    // Handle specific Bitcoin wallet errors
    if (error.message?.includes('insufficient funds')) {
      throw new Error("Insufficient Bitcoin balance for this transaction");
    } else if (error.message?.includes('user rejected')) {
      throw new Error("Transaction was rejected by user");
    } else if (error.message?.includes('network')) {
      throw new Error("Bitcoin network error. Please try again");
    }
    
    throw new Error(`Bitcoin transaction failed: ${error.message}`);
  }
};

/**
 * Generate Bitcoin transaction ID following your existing pattern
 */
const generateBitcoinTransactionId = (bitcoinAddress: string): `0x${string}` => {
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 1000000);
  const combined = `${bitcoinAddress}-${timestamp}-${randomValue}`;
  return keccak256(toUtf8Bytes(combined)) as `0x${string}`;
};

/**
 * Track Bitcoin transaction status
 * This follows your existing waitForReceiptSol pattern
 */
export const waitForBitcoinReceipt = async (transactionId: string): Promise<any> => {
  const promise = new Promise<any>((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // Bitcoin transactions can take longer
    
    const fetchBitcoinTx = async () => {
      try {
        attempts++;
        const res = await axios.get(`${crossChainTxUrl}/${transactionId}`);
        
        if (res.data.CrossChainTxs) {
          console.log("🟠 Bitcoin Cross-Chain Transaction Found:", res.data);
          resolve(res.data);
        } else if (attempts >= maxAttempts) {
          reject(new Error(`Failed to get Bitcoin CrossChainTxs after ${maxAttempts} attempts`));
        } else {
          // Bitcoin transactions typically take longer, so wait 30 seconds between checks
          setTimeout(fetchBitcoinTx, 30000);
        }
  } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(fetchBitcoinTx, 30000);
        }
      }
    };
    
    fetchBitcoinTx();
  });
  
  return promise;
};

/**
 * Get Bitcoin balance in satoshis
 */
export const getBitcoinBalance = async (bitcoinWallet: BitcoinWallet): Promise<bigint> => {
  try {
    const balanceInSatoshis = await bitcoinWallet.getBalance();
    return BigInt(balanceInSatoshis);
  } catch (error) {
    console.error("❌ Failed to get Bitcoin balance:", error);
    return BigInt(0);
  }
};

/**
 * Validate Bitcoin deposit parameters
 */
export const validateBitcoinDeposit = (
  bitcoinWallet: BitcoinWallet,
  transactionAmount: bigint,
  vaultData: VaultData
): { isValid: boolean; error?: string } => {
  // Check if Bitcoin wallet is connected
  if (!bitcoinWallet?.address) {
    return { isValid: false, error: "Bitcoin wallet not connected" };
  }

  // Check minimum deposit amount (1000 satoshis = 0.00001 BTC)
  const minDepositSatoshis = BigInt(1000);
  if (transactionAmount < minDepositSatoshis) {
    return { isValid: false, error: "Minimum deposit is 0.00001 BTC" };
  }

  // Check vault configuration
  if (!vaultData?.id) {
    return { isValid: false, error: "Invalid vault configuration" };
  }

  return { isValid: true };
}; 