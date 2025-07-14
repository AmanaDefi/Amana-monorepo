"use client";

import React from 'react';
import { useMultiChain } from '@/providers/MultiChainProvider';

const BitcoinWalletTest = () => {
  const { bitcoinWallet, bitcoinBalance, selectedChain, connectBitcoin, disconnectWallet, isHydrated } = useMultiChain();

  return (
    <div>
      <h2>Bitcoin Wallet Debug</h2>
      <p>Is Hydrated: {isHydrated ? 'Yes' : 'No'}</p>
      <p>Selected Chain: {selectedChain}</p>
      <p>Bitcoin Wallet Connected: {bitcoinWallet ? 'Yes' : 'No'}</p>
      <p>Bitcoin Wallet Address: {bitcoinWallet?.address || 'Not connected'}</p>
      <p>Bitcoin Balance: {bitcoinBalance?.formatted || '0'}</p>
      <button onClick={() => connectBitcoin('unisat')} disabled={!!bitcoinWallet} style={{ marginRight: 8, backgroundColor: 'blue', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
        Connect Bitcoin (Unisat)
      </button>
      <button onClick={disconnectWallet} disabled={!bitcoinWallet} style={{ marginRight: 8, backgroundColor: 'red', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
        Disconnect Bitcoin Wallet
      </button>
    </div>
  );
};

export default BitcoinWalletTest;
