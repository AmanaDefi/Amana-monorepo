# Bitcoin Integration Using Official ZetaChain Toolkit

This document provides the **official ZetaChain approach** for integrating Bitcoin deposits into your Amana vault system, using ZetaChain's toolkit and CLI patterns.

## 🎯 **Official ZetaChain Bitcoin Integration**

### **Option 1: Using ZetaChain Toolkit (Recommended)**

Based on [ZetaChain's official toolkit](https://github.com/zeta-chain/toolkit), here's how to implement Bitcoin deposits using their provided functions:

#### **1. Install ZetaChain Toolkit**

```bash
# Install the official ZetaChain toolkit
yarn add @zetachain/toolkit

# For Bitcoin-specific functionality
npm install -g @zetachain/toolkit@next
```

#### **2. Bitcoin Deposit Implementation (Official Toolkit)**

```typescript
// frontend/src/actions/bitcoinActionsOfficial.ts
import { ZetaChainClient } from "@zetachain/toolkit";
import { ethers } from 'ethers';
import { VaultData, Token } from '../types/types';

// Initialize ZetaChain client
const initializeZetaClient = () => {
  return new ZetaChainClient({
    network: "mainnet", // or "testnet"
    endpoint: process.env.NEXT_PUBLIC_ZETACHAIN_RPC || "https://zetachain-evm.blockpi.network/v1/rpc/public"
  });
};

interface OfficialBitcoinDepositParams {
  vaultData: VaultData;
  bitcoinWallet: any; // Bitcoin wallet instance
  transactionAmount: bigint;
  inputToken: Token;
}

export const executeOfficialBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken
}: OfficialBitcoinDepositParams) => {
  try {
    console.log("🟠 Executing Official ZetaChain Bitcoin Deposit");
    
    const client = initializeZetaClient();
    
    // 1. Calculate minimum shares out (reuse your existing logic)
    const { minSharesOut } = await getPathDataAndMinSharesOut(
      vaultData,
      inputToken,
      transactionAmount,
      { id: 'bitcoin' } as Chain
    );

    // 2. Generate transaction ID
    const transactionId = generateTransactionId(bitcoinWallet.address, 'bitcoin');
    
    // 3. Prepare slippage
    const slippage = getCurrentSlippage();
    const slippageValue = (slippage * 100).toFixed(0);

    // 4. Prepare vault payload (same as your existing structure)
    const vaultPayload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ethers.ZeroAddress,           // withdrawZRC20
        inputToken.address,           // inputToken address (ZRC-20 BTC)
        0,                           // withdrawAssetAmount
        minSharesOut,                // minimumOut
        slippageValue,               // slippage
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), // nonEvmAddress
        "0x",                        // swapData
        ethers.keccak256(ethers.toUtf8Bytes("TX_DEPOSIT_INITIATED")) // txStatus
      ]
    );

    // 5. Use ZetaChain's official Bitcoin deposit function
    const depositResult = await client.bitcoinDepositAndCall({
      amount: Number(transactionAmount), // Convert to number (satoshis)
      recipient: vaultData.id,          // Your vault contract address
      message: vaultPayload,            // ABI-encoded payload
      bitcoinWallet: bitcoinWallet,     // Bitcoin wallet instance
      revertAddress: bitcoinWallet.address // Fallback address
    });

    console.log("🟠 Official Bitcoin Deposit Result:", depositResult);
    
    return {
      transactionHash: depositResult.hash,
      transactionId,
      crossChainTxId: transactionId,
      commitTxId: depositResult.commitTxId,
      revealTxId: depositResult.revealTxId
    };

  } catch (error) {
    console.error("❌ Official Bitcoin deposit failed:", error);
    throw error;
  }
};

// Alternative: Direct CLI-style approach
export const executeCLIStyleBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken
}: OfficialBitcoinDepositParams) => {
  try {
    // Use ZetaChain CLI commands programmatically
    const { execSync } = require('child_process');
    
    const vaultPayload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ethers.ZeroAddress,
        inputToken.address,
        0,
        await calculateMinSharesOut(vaultData, inputToken, transactionAmount),
        getCurrentSlippage() * 100,
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)),
        "0x",
        ethers.keccak256(ethers.toUtf8Bytes("TX_DEPOSIT_INITIATED"))
      ]
    );

    // Execute ZetaChain CLI command
    const cliCommand = `npx zetachain@next bitcoin deposit-and-call \\
      --amount ${transactionAmount} \\
      --recipient ${vaultData.id} \\
      --message ${vaultPayload} \\
      --network mainnet \\
      --wallet-type unisat`;

    const result = execSync(cliCommand, { encoding: 'utf8' });
    const parsedResult = JSON.parse(result);

    return {
      transactionHash: parsedResult.hash,
      transactionId: generateTransactionId(bitcoinWallet.address, 'bitcoin'),
      crossChainTxId: parsedResult.cctxHash
    };

  } catch (error) {
    console.error("❌ CLI Bitcoin deposit failed:", error);
    throw error;
  }
};
```

#### **3. Bitcoin Wallet Integration (Official Pattern)**

```typescript
// frontend/src/hooks/useBitcoinWalletOfficial.ts
import { useState, useEffect } from 'react';

interface OfficialBitcoinWallet {
  address: string;
  network: 'mainnet' | 'testnet';
  signTransaction: (tx: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<number>;
  getPublicKey: () => string;
}

export const useOfficialBitcoinWallet = () => {
  const [wallet, setWallet] = useState<OfficialBitcoinWallet | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = async (walletType: 'unisat' | 'xverse' | 'leather' = 'unisat') => {
    setIsConnecting(true);
    try {
      let walletInstance: OfficialBitcoinWallet;

      switch (walletType) {
        case 'unisat':
          walletInstance = await connectUnisat();
          break;
        case 'xverse':
          walletInstance = await connectXverse();
          break;
        case 'leather':
          walletInstance = await connectLeather();
          break;
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      setWallet(walletInstance);
      setIsConnected(true);
      
      // Store wallet preference
      localStorage.setItem('preferred_bitcoin_wallet', walletType);
      
    } catch (error) {
      console.error('Failed to connect Bitcoin wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectUnisat = async (): Promise<OfficialBitcoinWallet> => {
    if (typeof window !== 'undefined' && (window as any).unisat) {
      const accounts = await (window as any).unisat.requestAccounts();
      const publicKey = await (window as any).unisat.getPublicKey();
      const network = await (window as any).unisat.getNetwork();
      
      return {
        address: accounts[0],
        network: network === 'livenet' ? 'mainnet' : 'testnet',
        signTransaction: (window as any).unisat.signTx,
        signMessage: (window as any).unisat.signMessage,
        getBalance: (window as any).unisat.getBalance,
        getPublicKey: () => publicKey
      };
    }
    throw new Error('Unisat wallet not found');
  };

  const connectXverse = async (): Promise<OfficialBitcoinWallet> => {
    if (typeof window !== 'undefined' && (window as any).XverseProviders?.BitcoinProvider) {
      const provider = (window as any).XverseProviders.BitcoinProvider;
      const response = await provider.connect();
      
      return {
        address: response.addresses[0].address,
        network: 'mainnet', // Xverse typically uses mainnet
        signTransaction: provider.signTransaction,
        signMessage: provider.signMessage,
        getBalance: async () => {
          const balance = await provider.getBalance();
          return balance.total;
        },
        getPublicKey: () => response.addresses[0].publicKey
      };
    }
    throw new Error('Xverse wallet not found');
  };

  const connectLeather = async (): Promise<OfficialBitcoinWallet> => {
    if (typeof window !== 'undefined' && (window as any).LeatherProvider) {
      const provider = (window as any).LeatherProvider;
      const response = await provider.request('getAddresses');
      
      return {
        address: response.addresses.bitcoin.p2wpkh, // Use native segwit
        network: 'mainnet',
        signTransaction: (tx: any) => provider.request('signTx', { tx }),
        signMessage: (message: string) => provider.request('signMessage', { message }),
        getBalance: async () => {
          const balance = await provider.request('getBalance');
          return balance.total;
        },
        getPublicKey: () => response.addresses.bitcoin.publicKey
      };
    }
    throw new Error('Leather wallet not found');
  };

  const disconnect = () => {
    setWallet(null);
    setIsConnected(false);
    localStorage.removeItem('preferred_bitcoin_wallet');
  };

  // Auto-reconnect on page load
  useEffect(() => {
    const preferredWallet = localStorage.getItem('preferred_bitcoin_wallet') as 'unisat' | 'xverse' | 'leather';
    if (preferredWallet) {
      connectWallet(preferredWallet).catch(console.error);
    }
  }, []);

  return {
    wallet,
    isConnected,
    isConnecting,
    connectWallet,
    disconnect
  };
};
```





This official approach ensures your Bitcoin integration stays aligned with ZetaChain's roadmap and receives ongoing support from their development team. 