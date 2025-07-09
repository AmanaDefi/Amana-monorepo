I'll analyze your existing wallet system and create a comprehensive outline for adding Bitcoin wallet support. Let me first examine your current wallet architecture to understand how EVM and Solana are integrated.

Search files...
Search files...
Read file: frontend/src/constants/chainConfig.ts
Read file: frontend/src/constants/chainConfig.ts
Search files...
Based on my analysis of your existing wallet system, I can now provide you with a comprehensive outline for adding Bitcoin wallet support. Your current architecture is well-structured with EVM and Solana support, and we can extend it seamlessly to include Bitcoin.

# 🟠 Bitcoin Wallet Integration Outline

## **PHASE 1: Core Architecture & Infrastructure**

### **1.1 Bitcoin Wallet Provider Setup**
- **Create `BitcoinWalletProvider.tsx`** - Similar to `SolanaWalletProvider.tsx`
- **Support multiple Bitcoin wallets**: Unisat, Xverse, Leather, OKX
- **Auto-connect functionality** with localStorage persistence
- **Cross-tab synchronization** for wallet state changes

### **1.2 Bitcoin Wallet Hook**
- **Create `useBitcoinWallet.ts`** - Unified Bitcoin wallet interface
- **Standardized methods**: `connect()`, `disconnect()`, `signTransaction()`, `getBalance()`
- **Multi-wallet support** with fallback logic
- **Error handling** and connection state management

### **1.3 Bitcoin Chain Configuration**
- **Extend `chainConfig.ts`** - Bitcoin is already partially configured
- **Add Bitcoin RPC endpoints** for mainnet/testnet
- **Bitcoin token definitions** (BTC, tBTC)
- **Explorer URLs** and chain metadata

## **PHASE 2: MultiChainProvider Integration**

### **2.1 Bitcoin State Management**
- **Extend `MultiChainProvider.tsx`** to handle Bitcoin as a first-class citizen
- **Bitcoin wallet connection logic** similar to EVM/Solana
- **Bitcoin balance tracking** and real-time updates
- **Chain switching** between EVM/Solana/Bitcoin

### **2.2 Bitcoin Wallet Connection Flow**
```typescript
// In MultiChainProvider.tsx
const connectBitcoin = async (walletType: 'unisat' | 'xverse' | 'leather' = 'unisat') => {
  // Disconnect other wallets first
  if (selectedChain === "evm") await evmDisconnect();
  if (selectedChain === "solana" && connected) await disconnect();
  
  // Connect Bitcoin wallet
  const bitcoinWallet = await connectBitcoinWallet(walletType);
  setSelectedChain("bitcoin");
  setWalletAddress(bitcoinWallet.address);
  setActiveChain(chainConfigs[CHAIN_ID.bitcoin]);
};
```

### **2.3 Bitcoin Balance Integration**
- **Real-time balance updates** using Bitcoin APIs
- **Balance formatting** (8 decimal places for BTC)
- **Caching** and optimization for performance

## **PHASE 3: UI/UX Integration**

### **3.1 Wallet Selection Modals**
- **Update `AllWallets.tsx`** to include Bitcoin wallet options
- **Bitcoin wallet icons** and connection states
- **Wallet detection** and installation prompts
- **Mobile wallet support** for Bitcoin

### **3.2 Chain Selector Updates**
- **Add Bitcoin to chain selector** in vault interfaces
- **Bitcoin-specific styling** and icons
- **Chain switching logic** for Bitcoin

### **3.3 Transaction Flow UI**
- **Bitcoin-specific transaction steps** in deposit/withdraw flows
- **Commit-reveal flow visualization** for Bitcoin transactions
- **Bitcoin transaction status** tracking and display

## **PHASE 4: Transaction Flow Integration**

### **4.1 Bitcoin Transaction Actions**
- **Extend `actions.ts`** with Bitcoin-specific functions
- **Bitcoin deposit flow** using ZetaChain's inscription method
- **Bitcoin withdrawal flow** with proper revert handling
- **Transaction validation** for Bitcoin-specific requirements

### **4.2 Commit-Reveal Flow Implementation**
```typescript
// Bitcoin deposit flow (2-step process)
const executeBitcoinDeposit = async ({
  vaultData,
  bitcoinWallet,
  transactionAmount,
  inputToken
}) => {
  // Step 1: Create inscription (commit)
  const inscriptionData = await createBitcoinInscription({
    recipient: vaultData.id,
    payload: depositPayload,
    amount: transactionAmount
  });
  
  // Step 2: Execute commit transaction
  const commitResult = await bitcoinWallet.signTransaction(inscriptionData.commitTx);
  
  // Step 3: Wait for confirmation
  await waitForConfirmation(commitResult.txid);
  
  // Step 4: Execute reveal transaction
  const revealResult = await bitcoinWallet.signTransaction(inscriptionData.revealTx);
  
  return { commitTxId: commitResult.txid, revealTxId: revealResult.txid };
};
```

### **4.3 Transaction Step Integration**
- **Update `interactAPI.tsx`** to handle Bitcoin transactions
- **Bitcoin-specific step mapping** in transaction flows
- **Error handling** for Bitcoin transaction failures
- **Progress tracking** for commit-reveal process

## **PHASE 5: Advanced Features**

### **5.1 Bitcoin-Specific Validation**
- **UTXO validation** for sufficient Bitcoin balance
- **Fee estimation** for Bitcoin transactions
- **Network fee optimization** and user warnings
- **Transaction size limits** and validation

### **5.2 Bitcoin Transaction Monitoring**
- **Real-time transaction tracking** using Bitcoin APIs
- **Confirmation counting** and status updates
- **Block explorer integration** for transaction links
- **Error recovery** and retry mechanisms

### **5.3 Cross-Chain Bitcoin Support**
- **Bitcoin to EVM/Solana** cross-chain deposits
- **EVM/Solana to Bitcoin** cross-chain withdrawals
- **Bitcoin as input token** in vault strategies
- **Bitcoin yield farming** integration

## **PHASE 6: Testing & Optimization**

### **6.1 Bitcoin Wallet Testing**
- **Unit tests** for Bitcoin wallet connections
- **Integration tests** for Bitcoin transaction flows
- **E2E tests** for complete Bitcoin deposit/withdraw cycles
- **Error scenario testing** and edge cases

### **6.2 Performance Optimization**
- **Bitcoin API rate limiting** and caching
- **Transaction fee optimization** algorithms
- **Balance update optimization** and batching
- **Memory usage optimization** for Bitcoin data

## **Implementation Priority**

### **High Priority (Phase 1-2)**
1. Bitcoin wallet provider and hook
2. MultiChainProvider Bitcoin integration
3. Basic Bitcoin connection flow
4. Bitcoin balance display

### **Medium Priority (Phase 3-4)**
1. UI integration and wallet selection
2. Bitcoin transaction actions
3. Commit-reveal flow implementation
4. Transaction step integration

### **Low Priority (Phase 5-6)**
1. Advanced validation and monitoring
2. Cross-chain Bitcoin features
3. Performance optimization
4. Comprehensive testing

## **Key Benefits of This Approach**

1. **Seamless Integration**: Bitcoin becomes a first-class citizen alongside EVM and Solana
2. **Consistent UX**: Same wallet connection and transaction flow patterns
3. **Extensible Architecture**: Easy to add more Bitcoin wallets or features
4. **Robust Error Handling**: Comprehensive error management for Bitcoin-specific issues
5. **Performance Optimized**: Efficient balance updates and transaction monitoring
6. **Future-Proof**: Ready for advanced Bitcoin features and cross-chain operations

This outline ensures that Bitcoin wallet support is integrated smoothly without breaking your existing EVM and Solana functionality, while providing a consistent and smooth user experience across all supported chains.