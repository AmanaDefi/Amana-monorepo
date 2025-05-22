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

## BlockPI Integration

### Current Implementation
1. BlockPI Service (`blockpi.ts`):
   - Base URL from environment config
   - `getInboundHashToCctxData` method to fetch transaction data

2. Hook Usage (`useInboundToCctxData.ts`):
   - Uses React Query for data fetching
   - Refetches every 5 seconds
   - Enabled during crosschain invest action
   - Supports mock service for testing

3. Simulation Support:
   - MockBlockpi class for testing
   - Simulates different transaction scenarios
   - Supports step-by-step simulation

### BlockPI API Response Structure
```typescript
{
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
  }
}
```

### Integration Points
1. Transaction Confirmation:
   - Used to track cross-chain transaction status
   - Monitors for success/failure states
   - Updates UI based on transaction progress

2. Error Handling:
   - Detects transaction failures
   - Handles revert scenarios
   - Manages fund returns

3. UI Feedback:
   - Shows transaction progress
   - Updates status messages
   - Provides transaction links

## Simulation Implementation

### Simulation Components
1. CrossChainTransactionSimulator:
   - Handles different transaction types (deposit, withdrawal, revert)
   - Simulates step-by-step transaction flow
   - Provides visual feedback for each step
   - Supports error scenarios

2. MockBlockpi:
   - Simulates BlockPI API responses
   - Supports different scenarios (success, pending, revert)
   - Provides test data for development

### Simulation Types
1. Type 4 Deposit Success:
   - Initial local transaction
   - Cross chain call to vault
   - Cross chain call to strategy
   - Strategy chain transaction
   - Cross chain confirmation

2. Type 4 Withdrawal Success:
   - Initial local transaction
   - Cross chain call to vault
   - Cross chain call to strategy
   - Strategy chain transaction
   - Cross chain confirmation
   - Cross chain withdraw

3. Type 4 Deposit Revert:
   - Simulates failed cross chain transaction
   - Handles revert scenarios
   - Shows error states

4. Type 2 Deposit Revert:
   - Simulates failed direct deposit
   - Handles revert scenarios
   - Shows error states

### Simulation Flow
1. Step Execution:
   - Each step is executed sequentially
   - Status updates in real-time
   - Visual feedback for progress
   - Error handling for failed steps

2. Status Tracking:
   - Pending: Waiting to start
   - Processing: Step in progress
   - Completed: Step successful
   - Error: Step failed
   - Reverted: Transaction reverted

3. UI Updates:
   - Progress indicators
   - Status messages
   - Transaction links
   - Error messages
   - Success confirmation 