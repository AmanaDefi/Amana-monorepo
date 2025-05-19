import React from 'react';
import CrossChainTransactionSimulator from './CrossChainTransactionSimulator';

export default function TransactionFlow() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-8 text-center">Cross-Chain Transaction Flow</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CrossChainTransactionSimulator type="deposit" />
        <CrossChainTransactionSimulator type="withdrawal" />
      </div>
    </div>
  );
} 