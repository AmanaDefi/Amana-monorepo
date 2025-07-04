"use client";

import React, { useState, useEffect } from 'react';
import { useMultiChain } from '@/providers/MultiChainProvider';
import { useTemporaryBitcoinWallet } from '@/hooks/useBitcoinWallet';
import { CHAIN_ID } from '@/constants/chainConfig';

const BitcoinConnectionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});
  
  // MultiChain Provider state
  const { 
    selectedChain, 
    activeChain, 
    walletAddress, 
    bitcoinWallet: providerBitcoinWallet, 
    bitcoinBalance,
    connectBitcoin,
    switchToChain
  } = useMultiChain();
  
  // Direct Bitcoin wallet hook
  const { 
    wallet: directBitcoinWallet, 
    isConnected: directIsConnected, 
    connectWallet: directConnectWallet 
  } = useTemporaryBitcoinWallet();

  useEffect(() => {
    setTestResults({
      // Provider state
      providerSelectedChain: selectedChain,
      providerActiveChainId: activeChain?.id,
      providerWalletAddress: walletAddress,
      providerBitcoinWallet: !!providerBitcoinWallet,
      providerBitcoinWalletAddress: providerBitcoinWallet?.address,
      providerBitcoinBalance: bitcoinBalance?.formatted,
      
      // Direct hook state
      directBitcoinWallet: !!directBitcoinWallet,
      directBitcoinWalletAddress: directBitcoinWallet?.address,
      directIsConnected,
      
      // Bitcoin chain ID
      bitcoinChainId: CHAIN_ID.bitcoin,
      
      // Window wallet detection
      hasUnisat: typeof window !== 'undefined' && !!(window as any).unisat,
      hasXverse: typeof window !== 'undefined' && !!((window as any).XverseProviders?.BitcoinProvider || (window as any).BitcoinProvider),
      hasLeather: typeof window !== 'undefined' && !!(window as any).LeatherProvider,
    });
  }, [
    selectedChain, 
    activeChain, 
    walletAddress, 
    providerBitcoinWallet, 
    bitcoinBalance,
    directBitcoinWallet,
    directIsConnected
  ]);

  const testDirectConnection = async () => {
    try {
      console.log("🧪 Testing direct Bitcoin wallet connection...");
      await directConnectWallet('unisat');
      console.log("🧪 Direct connection successful");
    } catch (error) {
      console.error("🧪 Direct connection failed:", error);
    }
  };

  const testProviderConnection = async () => {
    try {
      console.log("🧪 Testing provider Bitcoin wallet connection...");
      await connectBitcoin('unisat');
      console.log("🧪 Provider connection successful");
    } catch (error) {
      console.error("🧪 Provider connection failed:", error);
    }
  };

  const testChainSwitch = async () => {
    try {
      console.log("🧪 Testing chain switch to Bitcoin...");
      await switchToChain({ id: CHAIN_ID.bitcoin } as any);
      console.log("🧪 Chain switch successful");
    } catch (error) {
      console.error("🧪 Chain switch failed:", error);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Bitcoin Connection Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Provider State</h3>
          <div className="space-y-1 text-sm">
            <div>Selected Chain: <span className="text-blue-300">{testResults.providerSelectedChain}</span></div>
            <div>Active Chain ID: <span className="text-blue-300">{testResults.providerActiveChainId}</span></div>
            <div>Wallet Address: <span className="text-blue-300">{testResults.providerWalletAddress || 'None'}</span></div>
            <div>Bitcoin Wallet: <span className="text-blue-300">{testResults.providerBitcoinWallet ? 'Connected' : 'Not Connected'}</span></div>
            <div>Bitcoin Address: <span className="text-blue-300">{testResults.providerBitcoinWalletAddress || 'None'}</span></div>
            <div>Bitcoin Balance: <span className="text-blue-300">{testResults.providerBitcoinBalance || '0'} BTC</span></div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Direct Hook State</h3>
          <div className="space-y-1 text-sm">
            <div>Direct Wallet: <span className="text-green-300">{testResults.directBitcoinWallet ? 'Connected' : 'Not Connected'}</span></div>
            <div>Direct Address: <span className="text-green-300">{testResults.directBitcoinWalletAddress || 'None'}</span></div>
            <div>Direct IsConnected: <span className="text-green-300">{testResults.directIsConnected ? 'True' : 'False'}</span></div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Configuration</h3>
          <div className="space-y-1 text-sm">
            <div>Bitcoin Chain ID: <span className="text-yellow-300">{testResults.bitcoinChainId}</span></div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Wallet Detection</h3>
          <div className="space-y-1 text-sm">
            <div>Unisat: <span className="text-yellow-300">{testResults.hasUnisat ? 'Available' : 'Not Available'}</span></div>
            <div>Xverse: <span className="text-yellow-300">{testResults.hasXverse ? 'Available' : 'Not Available'}</span></div>
            <div>Leather: <span className="text-yellow-300">{testResults.hasLeather ? 'Available' : 'Not Available'}</span></div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 space-x-4">
        <button 
          onClick={testDirectConnection}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Test Direct Connection
        </button>
        <button 
          onClick={testProviderConnection}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Test Provider Connection
        </button>
        <button 
          onClick={testChainSwitch}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
        >
          Test Chain Switch
        </button>
      </div>
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">State JSON</h3>
        <pre className="text-xs bg-gray-800 p-2 rounded overflow-auto max-h-40">
          {JSON.stringify(testResults, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default BitcoinConnectionTest; 