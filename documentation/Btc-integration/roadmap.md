Absolutely! Here’s a **step-by-step roadmap** that combines both key aspects we discussed:

1. **Fixing your Bitcoin wallet integration and EVM-vs-Bitcoin logic separation**
2. **Mapping the Bitcoin commit-reveal flow to your UI/UX and transaction stepper (commit = approve, reveal = deposit)**

---

# 🛠️ Bitcoin Commit-Reveal Integration Roadmap

---

## **PHASE 1: Core Wallet & Logic Fixes**

### **Step 1.1: Ensure Bitcoin Wallet Has `signTransaction`**

- In your Bitcoin wallet connection logic (e.g., Unisat/Xverse/Leather in `useBitcoinWallet`), make sure the returned wallet object always has a valid `signTransaction` method.
- For Unisat, use `signPsbt` or `signTransaction` as available.

**Example:**
```typescript
signTransaction: (window as any).unisat.signPsbt || (window as any).unisat.signTransaction,
```

---

### **Step 1.2: Provider State Must Switch to Bitcoin**

- When the user selects Bitcoin in the UI, ensure your provider/context sets `selectedChain` to `"bitcoin"` (or the correct chain ID).
- This ensures all logic and UI use the Bitcoin wallet, not the EVM wallet.

---

### **Step 1.3: Guard EVM-Specific Logic**

- In your deposit/approve logic, add a check:
  - If `selectedChain?.id === CHAIN_ID.bitcoin`, **skip** EVM-specific steps like `approve` or ERC-20 logic.
- Only run EVM logic for EVM chains.

---

### **Step 1.4: Add Bitcoin-Specific Validation**

- Prevent deposits that exceed the available BTC balance.
- Show a clear error if the user tries to deposit more than they have.

---

## **PHASE 2: Commit-Reveal Flow Integration**

### **Step 2.1: Map Commit-Reveal to UI Steps**

- In your transaction stepper/modal:
  - **Step 1:** Commit (in place of "approve" for BTC)
  - **Step 2:** Reveal (in place of "deposit" for BTC)
- Only show these steps for Bitcoin deposits.

---

### **Step 2.2: Implement Commit Step**

- When user initiates a BTC deposit:
  - If not committed yet, prompt/sign/broadcast the commit transaction.
  - Wait for at least 1 confirmation (or poll for it).
  - Update UI to show progress/status.

---

### **Step 2.3: Implement Reveal Step**

- After commit is confirmed:
  - Prompt/sign/broadcast the reveal transaction.
  - Update UI to show progress/status.
  - Only after both are done, show "Deposit Complete".

---

### **Step 2.4: Error Handling and UX**

- If the user cancels or an error occurs at any step, show a clear error and allow retry.
- If the user leaves after commit but before reveal, allow them to resume from the reveal step.

---

### **Step 2.5: Code Structure**

- In your transaction step logic, for Bitcoin:
  - Replace "approve" with "commit"
  - Replace "deposit" with "reveal"
- Make sure to handle errors and confirmations between steps.

---

## **PHASE 3: Testing & Polish**

### **Step 3.1: Test All Flows**

- Test EVM deposit (approve + deposit) to ensure it still works.
- Test Bitcoin deposit (commit + reveal) for all supported wallets.
- Test error scenarios (insufficient balance, user rejects, network errors).

---

### **Step 3.2: User Experience**

- Ensure the UI clearly shows which step is being performed (commit or reveal).
- Show progress, confirmations, and clear instructions for signing both transactions.

---

## **References**

- [ZetaChain Docs: Bitcoin Integration](https://www.zetachain.com/docs/developers/chains/bitcoin/)
- [Commit-Reveal Scheme on Ethereum (conceptual background)](https://www.gitcoin.co/blog/commit-reveal-scheme-on-ethereum)

---

# ✅ **Summary Table**

| EVM Step   | Bitcoin Step | UI/UX Label      | Action Required         |
|------------|--------------|------------------|------------------------|
| Approve    | Commit       | "Commit"         | Sign & broadcast commit|
| Deposit    | Reveal       | "Reveal/Deposit" | Sign & broadcast reveal|

---

**Start with Phase 1, Step 1.1, and work your way down. This will ensure your Bitcoin integration is robust, user-friendly, and consistent with EVM flows!**

Let me know if you want code snippets for any specific step!