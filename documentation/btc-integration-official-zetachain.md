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

### **Option 2: Following ZetaChain CLI Patterns**

Based on [ZetaChain's CLI implementation](https://github.com/zeta-chain/toolkit/tree/main/packages/commands/src/bitcoin), here's how to follow their official patterns:

#### **1. Bitcoin Transaction Builder (Following CLI Pattern)**

```typescript
// frontend/src/lib/bitcoin/zetachainBitcoinClient.ts
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';

export class ZetaChainBitcoinClient {
  private network: bitcoin.Network;
  private gatewayAddress: string;

  constructor(isMainnet: boolean = true) {
    this.network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    // Official ZetaChain Gateway addresses
    this.gatewayAddress = isMainnet 
      ? "bc1qm24wp577nk8aacckv8np465z3dvmu7ry45el6y" // Mainnet
      : "tb1qy9pqmk2pd9sv63g27jt8r657wy0d9aw7xz7n9x"; // Testnet
  }

  // Follow ZetaChain's inscription format exactly
  createInscriptionData(receiver: string, payload: string, revertAddress?: string) {
    // ZetaChain's official 4-byte header format
    const header = new Uint8Array(4);
    header[0] = 0x5a; // 'Z' for ZetaChain (official identifier)
    header[1] = 0x00; // ABI encoding format
    header[2] = 0x00; // DepositAndCall operation (0x00 << 4)
    header[3] = revertAddress ? 0x07 : 0x03; // Flags: receiver + payload + optional revert

    // ABI encode following ZetaChain's exact specification
    const fields = revertAddress 
      ? [receiver, payload, revertAddress]
      : [receiver, payload];
    
    const types = revertAddress 
      ? ["address", "bytes", "address"]
      : ["address", "bytes"];

    const inscriptionData = ethers.AbiCoder.defaultAbiCoder().encode(types, fields);

    return ethers.concat([header, ethers.getBytes(inscriptionData)]);
  }

  // Create commit transaction following ZetaChain's CLI pattern
  async createCommitTransaction(
    userKeyPair: any,
    inscriptionData: Uint8Array,
    utxos: any[]
  ) {
    // Create inscription script following ZetaChain's exact format
    const inscriptionScript = [
      userKeyPair.publicKey.slice(1, 33), // x-only pubkey
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_0,
      bitcoin.opcodes.OP_IF,
      Buffer.from('ord'), // Ordinals protocol identifier
      1, // Content type flag
      1, // Content flag
      Buffer.from('application/json'), // Content type for ZetaChain data
      bitcoin.opcodes.OP_0,
      inscriptionData, // ZetaChain payload
      bitcoin.opcodes.OP_ENDIF,
    ];

    const outputScript = bitcoin.script.compile(inscriptionScript);
    
    // Create Taproot script tree
    const scriptTree = {
      output: outputScript,
      redeemVersion: 192, // 0xc0
    };

    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: userKeyPair.publicKey.slice(1, 33),
      scriptTree,
      network: this.network,
    });

    // Build commit transaction
    const psbt = new bitcoin.Psbt({ network: this.network });
    
    let totalInput = 0;
    utxos.forEach(utxo => {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: utxo.value,
        },
      });
      totalInput += utxo.value;
    });

    const commitAmount = 600; // Minimum amount for inscription
    const fee = 1000; // Fee estimation
    
    // Add commit output
    psbt.addOutput({
      address: p2tr.address!,
      value: commitAmount,
    });

    // Add change output if needed
    if (totalInput > commitAmount + fee) {
      psbt.addOutput({
        address: userKeyPair.address, // User's change address
        value: totalInput - commitAmount - fee,
      });
    }

    return {
      psbt,
      tapLeafScript: {
        leafVersion: 192,
        script: outputScript,
        controlBlock: p2tr.witness![p2tr.witness!.length - 1]
      },
      scriptTaproot: p2tr
    };
  }

  // Create reveal transaction following ZetaChain's CLI pattern
  async createRevealTransaction(
    commitTxData: any,
    commitTxResult: any,
    amount: number
  ) {
    const { scriptTaproot, tapLeafScript } = commitTxData;

    const psbt = new bitcoin.Psbt({ network: this.network });

    // Add input from commit transaction
    psbt.addInput({
      hash: commitTxResult.txId,
      index: 0, // First output is always the inscription output
      witnessUtxo: {
        value: 600, // Commit amount
        script: scriptTaproot.output!,
      },
      tapLeafScript: [tapLeafScript],
    });

    // Add output to ZetaChain Gateway (this triggers the cross-chain call)
    psbt.addOutput({
      address: this.gatewayAddress,
      value: amount,
    });

    return psbt;
  }

  // Execute the full inscription flow
  async executeInscriptionFlow(
    wallet: any,
    receiver: string,
    payload: string,
    amount: number,
    revertAddress?: string
  ) {
    try {
      // 1. Create inscription data
      const inscriptionData = this.createInscriptionData(receiver, payload, revertAddress);
      
      // 2. Get UTXOs
      const utxos = await this.getUTXOs(wallet.address);
      
      // 3. Create and sign commit transaction
      const commitTxData = await this.createCommitTransaction(
        wallet.keyPair,
        inscriptionData,
        utxos
      );
      
      const signedCommitPsbt = await wallet.signTransaction(commitTxData.psbt);
      const commitTx = signedCommitPsbt.extractTransaction();
      const commitTxId = await this.broadcastTransaction(commitTx.toHex());
      
      console.log("🟠 Commit Transaction:", commitTxId);
      
      // 4. Wait for commit confirmation
      await this.waitForConfirmation(commitTxId);
      
      // 5. Create and sign reveal transaction
      const revealPsbt = await this.createRevealTransaction(
        commitTxData,
        { txId: commitTxId },
        amount
      );
      
      const signedRevealPsbt = await wallet.signTransaction(revealPsbt);
      const revealTx = signedRevealPsbt.extractTransaction();
      const revealTxId = await this.broadcastTransaction(revealTx.toHex());
      
      console.log("🟠 Reveal Transaction (triggers ZetaChain):", revealTxId);
      
      return {
        commitTxId,
        revealTxId,
        success: true
      };
      
    } catch (error) {
      console.error("❌ Inscription flow failed:", error);
      throw error;
    }
  }

  private async getUTXOs(address: string) {
    // Implement UTXO fetching from Bitcoin node or API
    // This would typically use blockstream API or your preferred Bitcoin API
    const response = await fetch(`https://blockstream.info/api/address/${address}/utxo`);
    return await response.json();
  }

  private async broadcastTransaction(txHex: string) {
    // Broadcast transaction to Bitcoin network
    const response = await fetch('https://blockstream.info/api/tx', {
      method: 'POST',
      body: txHex
    });
    return await response.text();
  }

  private async waitForConfirmation(txId: string, confirmations: number = 1) {
    // Poll for transaction confirmation
    while (true) {
      const response = await fetch(`https://blockstream.info/api/tx/${txId}`);
      const tx = await response.json();
      
      if (tx.status && tx.status.confirmed && tx.status.block_height) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    }
  }
}
```

#### **2. Integration with Your Existing Deposit Flow**

```typescript
// frontend/src/actions/actions.ts - Update your main deposit function
export const executeDeposit = async (
  vaultData: VaultData,
  inputToken: Token,
  walletContext: WalletContextState | undefined,
  activeAccount: Account,
  activeChain: Chain,
  transactionAmount: bigint,
  setcrossChainTxId: Function
) => {
  // ... existing code ...

  // Add official Bitcoin support
  if (activeChain.id === 'bitcoin') {
    // Option 1: Use official ZetaChain toolkit
    if (process.env.NEXT_PUBLIC_USE_OFFICIAL_TOOLKIT === 'true') {
      return await executeOfficialBitcoinDeposit({
        vaultData,
        bitcoinWallet: (walletContext as any).bitcoinWallet,
        transactionAmount,
        inputToken
      });
    }
    
    // Option 2: Use CLI-style implementation
    const bitcoinClient = new ZetaChainBitcoinClient(true); // mainnet
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ethers.ZeroAddress,
        inputToken.address,
        0,
        await calculateMinSharesOut(vaultData, inputToken, transactionAmount),
        getCurrentSlippage() * 100,
        ethers.hexlify(ethers.toUtf8Bytes(activeAccount.address)),
        "0x",
        ethers.keccak256(ethers.toUtf8Bytes("TX_DEPOSIT_INITIATED"))
      ]
    );

    const result = await bitcoinClient.executeInscriptionFlow(
      (walletContext as any).bitcoinWallet,
      vaultData.id,
      payload,
      Number(transactionAmount),
      (walletContext as any).bitcoinWallet.address
    );

    setcrossChainTxId(generateTransactionId(activeAccount.address, activeChain));
    return result;
  }

  // ... rest of existing EVM/Solana logic ...
};
```

#### **3. Environment Configuration**

```typescript
// .env.local
NEXT_PUBLIC_USE_OFFICIAL_TOOLKIT=true
NEXT_PUBLIC_ZETACHAIN_RPC=https://zetachain-evm.blockpi.network/v1/rpc/public
NEXT_PUBLIC_BITCOIN_NETWORK=mainnet
```

## 🎯 **Key Advantages of Official Approach**

### **Option 1 Benefits (Official Toolkit):**
- ✅ **Officially supported** by ZetaChain team
- ✅ **Automatic updates** when ZetaChain updates protocols
- ✅ **Built-in error handling** and retry logic
- ✅ **Comprehensive wallet support**
- ✅ **Maintained compatibility** with ZetaChain upgrades

### **Option 2 Benefits (CLI Patterns):**
- ✅ **Full control** over transaction creation
- ✅ **Custom fee management** and UTXO selection
- ✅ **Follows official specifications** exactly
- ✅ **Easier debugging** and customization
- ✅ **No dependency** on toolkit updates

## 🚀 **Migration Strategy**

1. **Start with Option 1** for quick implementation
2. **Monitor ZetaChain updates** for new toolkit features
3. **Consider Option 2** if you need custom Bitcoin transaction logic
4. **Maintain compatibility** with both approaches for flexibility

This official approach ensures your Bitcoin integration stays aligned with ZetaChain's roadmap and receives ongoing support from their development team. 