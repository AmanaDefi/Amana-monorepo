import React, { useState } from 'react';
import CrossChainTransactionSimulator from './CrossChainTransactionSimulator';

export default function TransactionFlow() {
  // State to track if transaction is started
  const [isTransactionStarted, setIsTransactionStarted] = useState(false);
  
  // Example initial transaction hash from the reference JSON
  const initialTxHash = '0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8';

  // Handler for transaction completion
  const handleTransactionComplete = () => {
    console.log('Transaction completed successfully!');
    // You can add additional logic here, such as:
    // - Updating user's balance
    // - Showing a success notification
    // - Redirecting to a success page
  };

  // Handler for starting the transaction
  const handleStartTransaction = () => {
    setIsTransactionStarted(true);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Cross-Chain Withdrawal</h1>
        <p className="text-gray-400">
          Monitor your cross-chain withdrawal transaction progress in real-time.
        </p>
      </div>

      {/* Transaction Simulator */}
      {isTransactionStarted ? (
        <CrossChainTransactionSimulator
          initialTxHash={initialTxHash}
          onComplete={handleTransactionComplete}
        />
      ) : (
        <div className="bg-gray-900 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-4">
            Click the button below to start the withdrawal process.
          </p>
          <button
            onClick={handleStartTransaction}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Start Withdrawal
          </button>
        </div>
      )}

      {/* Additional Information
      <div className="mt-8 bg-gray-900 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Transaction Details</h2>
        <div className="space-y-3">
          <div>
            <p className="text-gray-400 text-sm">Initial Transaction Hash:</p>
            <p className="text-white font-mono text-sm break-all">{initialTxHash}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Status:</p>
            <p className="text-white">
              {isTransactionStarted ? 'In Progress' : 'Not Started'}
            </p>
          </div>
        </div>
      </div> */}
    </div>
  );
} 