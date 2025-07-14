"use client";

import React, { useState, useEffect } from 'react';
import { useMultiChain } from '@/providers/MultiChainProvider';
import { useTemporaryBitcoinWallet } from '@/hooks/useBitcoinWallet';
import { CHAIN_ID, chainConfigs } from '@/constants/chainConfig';
import dynamic from 'next/dynamic';
import BitcoinWalletTest from './BitcoinWalletTest';

const BitcoinIntegrationTest: React.FC = () => {
  // ... existing code ...
  return <div>
    <BitcoinWalletTest />
  </div>; // Replace with actual JSX if needed
};

export default BitcoinIntegrationTest; 