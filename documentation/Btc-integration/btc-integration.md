# Bitcoin Integration Implementation Example

## Frontend Implementation

### 1. Bitcoin Wallet Integration (frontend/src/components/ConnectButton.tsx)

```typescript
// Add Bitcoin wallet support
import { useEffect, useState } from 'react';

interface BitcoinWallet {
  address: string;
  signTransaction: (tx: any) => Promise<string>;
  getBalance: () => Promise<number>;
}

export const useBitcoinWallet = () => {
  const [bitcoinWallet, setBitcoinWallet] = useState<BitcoinWallet | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectBitcoinWallet = async () => {
    try {
      // Connect to Bitcoin wallet (Unisat, Xverse, etc.)
      if (typeof window !== 'undefined' && (window as any).unisat) {
        const accounts = await (window as any).unisat.requestAccounts();
        const address = accounts[0];
        
        setBitcoinWallet({
          address,
          signTransaction: (window as any).unisat.signTransaction,
          getBalance: (window as any).unisat.getBalance
        });
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect Bitcoin wallet:', error);
    }
  };

  return { bitcoinWallet, isConnected, connectBitcoinWallet };
};
```

### 2. Bitcoin Deposit Action (frontend/src/actions/bitcoinActions.ts)

```typescript
import { ethers } from 'ethers';
import { VaultData, Token } from '../types/types';

// Bitcoin Gateway TSS address (mainnet)
const BITCOIN_GATEWAY_ADDRESS = "bc1qm24wp577nk8aacckv8np465z3dvmu7ry45el6y";

interface BitcoinDepositParams {
  vaultData: VaultData;
  bitcoinWallet: BitcoinWallet;
  transactionAmount: bigint; // in satoshis
  inputToken: Token; // BTC token info
}

export const executeBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken
}: BitcoinDepositParams) => {
  try {
    console.log("🟠 Executing Bitcoin Deposit to Amana Vault");
    
    // 1. Calculate minimum shares out (same logic as your existing deposits)
    const { minSharesOut } = await getPathDataAndMinSharesOut(
      vaultData,
      inputToken,
      transactionAmount,
      { id: 'bitcoin' } as Chain // Bitcoin chain identifier
    );

    // 2. Generate transaction ID
    const transactionId = generateTransactionId(bitcoinWallet.address, 'bitcoin');
    
    // 3. Prepare slippage
    const slippage = getCurrentSlippage();
    const slippageValue = (slippage * 100).toFixed(0);

    // 4. Encode the payload for your vault (matching your existing structure)
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint256", "uint256", "uint16", "bytes", "bytes", "bytes32"],
      [
        ethers.ZeroAddress,           // withdrawZRC20 (not used for deposits)
        inputToken.address,           // inputToken address (ZRC-20 BTC)
        0,                           // withdrawAssetAmount (not used for deposits)
        minSharesOut,                // minimumOut
        slippageValue,               // slippage
        ethers.hexlify(ethers.toUtf8Bytes(bitcoinWallet.address)), // nonEvmAddress (Bitcoin address)
        "0x",                        // swapData (empty for BTC)
        ethers.keccak256(ethers.toUtf8Bytes("TX_DEPOSIT_INITIATED")) // txStatus
      ]
    );

    // 5. Prepare revert options
    const revertMessage = ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "bytes32", "address"],
      ["_crossChainDepositFailed", transactionId, bitcoinWallet.address]
    );

    // 6. Create Bitcoin inscription for depositAndCall
    const inscriptionData = await createBitcoinInscription({
      receiver: vaultData.id,        // Your vault contract address
      payload: payload,
      revertAddress: bitcoinWallet.address,
      amount: transactionAmount
    });

    // 7. Execute Bitcoin transactions (commit + reveal)
    const commitTxId = await executeBitcoinCommitTransaction(
      bitcoinWallet,
      inscriptionData.commitTx
    );
    
    console.log("🟠 Bitcoin Commit Transaction:", commitTxId);
    
    // Wait for commit confirmation
    await waitForBitcoinConfirmation(commitTxId);
    
    // Execute reveal transaction
    const revealTxId = await executeBitcoinRevealTransaction(
      bitcoinWallet,
      inscriptionData.revealTx,
      transactionAmount
    );
    
    console.log("🟠 Bitcoin Reveal Transaction (Deposit):", revealTxId);
    
    return {
      commitTxId,
      revealTxId,
      transactionId,
      crossChainTxId: transactionId
    };

  } catch (error) {
    console.error("❌ Bitcoin deposit failed:", error);
    throw error;
  }
};

// Helper function to create Bitcoin inscription following ZetaChain format
const createBitcoinInscription = async ({
  receiver,
  payload,
  revertAddress,
  amount
}: {
  receiver: string;
  payload: string;
  revertAddress: string;
  amount: bigint;
}) => {
  // ZetaChain inscription format
  const header = new Uint8Array(4);
  header[0] = 0x5a; // 'Z' for ZetaChain
  header[1] = 0x00; // ABI encoding format
  header[2] = 0x00; // DepositAndCall operation (0x00 << 4)
  header[3] = 0x07; // Flags: receiver + payload + revert (0x07)

  // ABI encode the inscription data
  const inscriptionData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes", "address"],
    [receiver, payload, revertAddress]
  );

  // Combine header + data
  const fullInscriptionData = ethers.concat([
    header,
    ethers.getBytes(inscriptionData)
  ]);

  // Create Bitcoin transactions (this would use a Bitcoin library)
  const commitTx = await createBitcoinCommitTransaction(fullInscriptionData);
  const revealTx = await createBitcoinRevealTransaction(
    fullInscriptionData,
    amount,
    BITCOIN_GATEWAY_ADDRESS
  );

  return { commitTx, revealTx };
};

// Bitcoin transaction creation helpers (implement with Bitcoin JS libraries)
const createBitcoinCommitTransaction = async (inscriptionData: Uint8Array) => {
  // Implementation using bitcoinjs-lib or similar
  // This creates the commit transaction with Taproot inscription
  // Return transaction object ready for signing
};

const createBitcoinRevealTransaction = async (
  inscriptionData: Uint8Array,
  amount: bigint,
  gatewayAddress: string
) => {
  // Implementation using bitcoinjs-lib or similar
  // This creates the reveal transaction that:
  // 1. Reveals the inscription data
  // 2. Sends BTC to ZetaChain Gateway address
  // Return transaction object ready for signing
};

const executeBitcoinCommitTransaction = async (
  wallet: BitcoinWallet,
  commitTx: any
): Promise<string> => {
  // Sign and broadcast commit transaction
  const signedTx = await wallet.signTransaction(commitTx);
  // Broadcast to Bitcoin network
  // Return transaction ID
};

const executeBitcoinRevealTransaction = async (
  wallet: BitcoinWallet,
  revealTx: any,
  amount: bigint
): Promise<string> => {
  // Sign and broadcast reveal transaction with BTC amount
  const signedTx = await wallet.signTransaction(revealTx);
  // Broadcast to Bitcoin network
  // Return transaction ID
};

const waitForBitcoinConfirmation = async (txId: string): Promise<void> => {
  // Poll Bitcoin network for transaction confirmation
  // Wait for at least 1 confirmation before proceeding
};
```

### 3. Update Main Deposit Function (frontend/src/actions/actions.ts)

```typescript
// Add to your existing executeDeposit function
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

  // Add Bitcoin support
  if (activeChain.id === 'bitcoin') {
    // Use Bitcoin wallet context instead of EVM wallet
    const bitcoinWallet = (walletContext as any).bitcoinWallet;
    return await executeBitcoinDeposit({
      vaultData,
      bitcoinWallet,
      transactionAmount,
      inputToken
    });
  }

  // ... rest of existing EVM/Solana logic ...
};
```

## Configuration Updates

### 4. Chain Configuration (frontend/src/constants/chainConfig.ts)

```typescript
// Add Bitcoin to your supported chains
export const SUPPORTED_CHAINS = {
  // ... existing chains ...
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
    },
    rpcUrls: {
      default: { http: ['https://bitcoin-rpc-url'] },
    },
    blockExplorers: {
      default: { name: 'Blockchain.info', url: 'https://blockchain.info' },
    },
    icon: '/bitcoin-icon.svg'
  }
};

// Add Bitcoin token configuration
export const BITCOIN_TOKENS = {
  BTC: {
    address: 'native',
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    isNative: true,
    icon: '/bitcoin-icon.svg'
  }
};
```

## Usage Example

### 5. Component Integration (frontend/src/components/VaultDepositForm.tsx)

```typescript
const VaultDepositForm = ({ vaultData }: { vaultData: VaultData }) => {
  const { bitcoinWallet, connectBitcoinWallet } = useBitcoinWallet();
  const [selectedChain, setSelectedChain] = useState('ethereum');
  
  const handleDeposit = async () => {
    if (selectedChain === 'bitcoin') {
      if (!bitcoinWallet) {
        await connectBitcoinWallet();
        return;
      }
      
      // Execute Bitcoin deposit
      const result = await executeBitcoinDeposit({
        vaultData,
        bitcoinWallet,
        transactionAmount: parseUnits(amount, 8), // Bitcoin has 8 decimals
        inputToken: BITCOIN_TOKENS.BTC
      });
      
      console.log('Bitcoin deposit initiated:', result);
    } else {
      // Handle EVM/Solana deposits as usual
    }
  };

  return (
    <div>
      {/* Chain selector including Bitcoin */}
      <ChainSelector 
        chains={['ethereum', 'arbitrum', 'base', 'bitcoin']}
        selected={selectedChain}
        onChange={setSelectedChain}
      />
      
      {/* Show Bitcoin wallet connection if Bitcoin is selected */}
      {selectedChain === 'bitcoin' && !bitcoinWallet && (
        <button onClick={connectBitcoinWallet}>
          Connect Bitcoin Wallet
        </button>
      )}
      
      {/* Deposit form */}
      <button onClick={handleDeposit}>
        Deposit {selectedChain === 'bitcoin' ? 'BTC' : 'Tokens'}
      </button>
    </div>
  );
};
```

This implementation provides:

1. **Frontend Bitcoin wallet integration** with popular wallets like Unisat
2. **Bitcoin inscription creation** following ZetaChain's format
3. **Two-transaction flow** (commit + reveal) handling
4. **Seamless vault integration** using your existing payload structure
5. **Error handling and revert options** for failed transactions
6. **Configuration updates** to support Bitcoin across your app

The key insight is that **your existing vault contracts don't need major changes** - they already handle cross-chain deposits through the `onCall` function. Bitcoin deposits just become another source of ZRC-20 BTC tokens flowing into your vaults! 🎯

https://www.zetachain.com/docs/developers/chains/bitcoin/