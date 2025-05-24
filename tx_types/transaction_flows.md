# Transaction Flows and BlockPI Integration

## Transaction Types

### Type 1: Direct Deposit (Zetachain to Zetachain Vault)
1. User enters deposit amount
2. Approval flow:
   - User clicks approve
   - Transaction approval required
   - Approval in progress
   - Approval completed
3. Deposit flow:
   - User clicks deposit
   - Deposit in progress
   - Deposit completed (emits `Deposit` event)
4. UI updates:
   - Wallet balance updates
   - Vault balance updates
   - Deposit amount resets

### Type 2: Direct Deposit (Zetachain to Non-Zetachain Vault)
1. User enters deposit amount
2. Approval flow (same as Type 1)
3. Deposit flow:
   - Initial deposit on Zetachain
   - `CrossChainInvestSent` event emitted
   - Cross chain transfer in progress
   - `FundsInvested` event emitted by strategy
   - Final confirmation in progress
   - `Deposited` event emitted by vault
4. Error handling:
   - If `CrossChainInvestFailed`: Return funds to user
   - If `InvestConfirmFailed`: Final confirmation failed

### Type 3 & 4: Cross Chain Deposits
Similar to Type 2 but with additional cross-chain steps

## BlockPI Integration - Correct Hash Chaining Flow

### **Critical Understanding: Hash Chaining Logic**
Each step's `cctx_index` becomes the `inbound_hash` parameter for the next step's API call.

### **Step-by-Step Transaction Flow:**

#### **Deposit Flow (5 steps):**
1. **Step 1 - Local Transaction**: Get initial hash from local chain transaction
   - Input: Local transaction hash (e.g., `0xa786c5b510113c400dca53eda1d471d7711f38229c67bf83f30b7226de9b3459`)
   - Output: Transaction confirmation

2. **Step 2 - Cross Chain Call to Vault**: 
   - API: `/inboundHashToCctx/{local_tx_hash}`
   - Input: Local transaction hash from Step 1
   - Output: `cctx_index[0]` (e.g., `0xb0184142ae8d8363cc2d755692a2aec5ec0da24db63b1db4232a65f8eb570e14`)
   - Status Check: `/cctx/{cctx_index}` → Must be "OutboundMined"

3. **Step 3 - Cross Chain Call from Vault to Strategy**:
   - API: `/inboundHashToCctx/{step2_cctx_index}`
   - Input: **Step 2's cctx_index** as inbound hash
   - Output: NEW `cctx_index[0]` (e.g., `0x1b5d83092e4c03a58c624f04056b128292cc99f16d4d58ef4ab287f63dbdbca6`)
   - Status Check: `/cctx/{new_cctx_index}` → Must be "OutboundMined"

4. **Step 4 - Strategy Chain Transaction** (Extraction Step):
   - Extract: `outbound_params[0].hash` from Step 3's cctx data
   - No API call - just data extraction
   - Output: Strategy chain transaction hash (e.g., `0xe0697bffd721fc54581d5b492a49041bc818d8e77fb403171899af372345db26`)

5. **Step 5 - Cross Chain Call from Strategy Back to Vault**:
   - API: `/inboundHashToCctx/{step4_extracted_hash}`
   - Input: Hash extracted in Step 4
   - Output: `cctx_index[0]` (e.g., `0x03f322f2524bccac8021bf642082a1cbe0bb708aa382078897c0a1dff23bbf82`)
   - Status Check: `/cctx/{cctx_index}` → Must be "OutboundMined"

#### **Withdrawal Flow (6 steps):**
Same as deposit flow plus:

6. **Step 6 - Cross Chain Withdraw from Vault to User**:
   - API: `/inboundHashToCctx/{step5_cctx_index}`
   - Input: **Step 5's cctx_index** as inbound hash
   - Output: Final `cctx_index[0]`
   - Status Check: `/cctx/{cctx_index}` → Must be "OutboundMined"

### Current Implementation
1. BlockPI Service (`blockpi.ts`):
   - Base URL from environment config
   - Corrected `TRANSACTION_SEQUENCES` with proper hash chaining
   - `trackTransactionSequence` method for comprehensive tracking
   - Exponential backoff polling (3s → 30s delays)
   - Extended timeout (10 minutes)

2. Transaction Tracking:
   - Uses comprehensive sequence tracking
   - Automatic transaction type detection (deposit/withdrawal)
   - Real-time UI updates with step progress
   - LocalStorage persistence across page refreshes
   - Proper error handling for reverts/failures

3. Hash Chaining Implementation:
   ```typescript
   // Step 2: Use local hash
   getHash: (localHash: string) => localHash

   // Step 3: Use Step 2's cctx_index
   getHash: (localHash: string, prevStepData: any) => {
     return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
   }

   // Step 4: Extract outbound hash from Step 3
   getHash: (localHash: string, prevStepData: any) => {
     return prevStepData?.CrossChainTx?.outbound_params?.[0]?.hash;
   }

   // Step 5: Use extracted hash from Step 4
   getHash: (localHash: string, prevStepData: any) => {
     return prevStepData?.hash;
   }

   // Step 6 (withdrawal): Use Step 5's cctx_index
   getHash: (localHash: string, prevStepData: any) => {
     return prevStepData?.cctxIndex || prevStepData?.CrossChainTx?.index;
   }
   ```

### BlockPI API Response Structure
```typescript
{
  // inboundHashToCctx response
  inboundHashToCctx: {
    inbound_hash: string;
    cctx_index: string[];
  }

  // cctx response
  CrossChainTx: {
    creator: string;
    index: string;
    cctx_status: {
      status: string; // "OutboundMined" | "Reverted" | etc.
      status_message: string;
      error_message: string;
      lastUpdate_timestamp: string;
      isAbortRefunded: boolean;
      created_timestamp: string;
    };
    inbound_params: {
      sender: string;
      sender_chain_id: string;
      tx_origin: string;
      coin_type: string;
      asset: string;
      amount: string;
      observed_hash: string;
      status: string;
      confirmation_mode: string;
    };
    outbound_params: Array<{
      hash: string; // Important for hash chaining
      receiver: string;
      receiver_chainId: string;
      // ... other fields
    }>;
  }
}
```

### Integration Points
1. Transaction Confirmation:
   - Tracks complete cross-chain transaction sequences
   - Monitors each step's success/failure states
   - Updates UI based on sequence progress
   - Handles step-to-step hash chaining

2. Error Handling:
   - Detects transaction failures at each step
   - Handles revert scenarios with proper error messages
   - Manages fund returns and error states
   - Falls back to RPC monitoring when BlockPI fails

3. UI Feedback:
   - Shows transaction progress through all steps
   - Updates status messages for each step
   - Provides transaction links for each step
   - Displays comprehensive error information

## Simulation Implementation

### Simulation Components
1. CrossChainTransactionSimulator:
   - Implements correct hash chaining logic
   - Handles different transaction types (deposit, withdrawal, revert)
   - Simulates step-by-step transaction flow with proper hash progression
   - Provides visual feedback for each step
   - Supports error scenarios

2. Corrected Simulation Logic:
   - Step 2: Uses local hash
   - Step 3: Uses Step 2's cctx_index as inbound hash
   - Step 4: Extracts strategy chain tx hash from Step 3's outbound_params
   - Step 5+: Uses extracted hash from Step 4

### Simulation Types
1. Type 4 Deposit Success:
   - Follows 5-step hash chaining sequence
   - Each step uses correct previous step data
   - Validates "OutboundMined" status at each step

2. Type 4 Withdrawal Success:
   - Follows 6-step hash chaining sequence
   - Includes final withdraw step back to user
   - Complete end-to-end validation

3. Type 4 Deposit Revert:
   - Simulates failed cross chain transaction
   - Handles revert scenarios with second outbound detection
   - Shows error states with proper hash information

4. Type 2 Deposit Revert:
   - Simulates failed direct deposit
   - Handles revert scenarios
   - Shows error states

### Simulation Flow
1. Step Execution:
   - Each step executed sequentially with correct hash chaining
   - Status updates in real-time
   - Visual feedback for progress
   - Error handling for failed steps

2. Status Tracking:
   - Pending: Waiting to start
   - Processing: Step in progress
   - Completed: Step successful with "OutboundMined"
   - Error: Step failed
   - Reverted: Transaction reverted with revert hash detection

3. UI Updates:
   - Progress indicators for each step
   - Status messages with step descriptions
   - Transaction links for each cctx
   - Error messages with specific failure information
   - Success confirmation for complete sequences 