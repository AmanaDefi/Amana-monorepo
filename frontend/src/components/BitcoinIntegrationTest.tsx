"use client";

import React, { useState, useEffect } from 'react';
import { useMultiChain } from '@/providers/MultiChainProvider';
import { useTemporaryBitcoinWallet } from '@/hooks/useBitcoinWallet';
import { CHAIN_ID, chainConfigs } from '@/constants/chainConfig';

const BitcoinIntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  
  // MultiChain Provider state
  const { 
    selectedChain, 
    activeChain, 
    walletAddress, 
    bitcoinWallet: providerBitcoinWallet, 
    bitcoinBalance,
    connectBitcoin,
    switchToChain,
    disconnectWallet
  } = useMultiChain();
  
  // Direct Bitcoin wallet hook
  const { 
    wallet: directBitcoinWallet, 
    isConnected: directIsConnected, 
    connectWallet: directConnectWallet,
    disconnect: directDisconnect,
    getAvailableWallets
  } = useTemporaryBitcoinWallet();

  const runIntegrationTest = async () => {
    setIsRunning(true);
    const results: any = {};

    try {
      console.log("🧪 Starting Bitcoin Integration Test...");

      // Test 1: Check wallet availability
      const availableWallets = getAvailableWallets();
      results.walletAvailability = {
        available: availableWallets,
        hasUnisat: availableWallets.includes('unisat'),
        hasXverse: availableWallets.includes('xverse'),
        hasLeather: availableWallets.includes('leather')
      };

      // Test 2: Check provider state before connection
      results.providerStateBefore = {
        selectedChain,
        activeChainId: activeChain?.id,
        walletAddress,
        hasBitcoinWallet: !!providerBitcoinWallet,
        bitcoinWalletAddress: providerBitcoinWallet?.address,
        bitcoinBalance: bitcoinBalance?.formatted
      };

      // Test 3: Check direct hook state before connection
      results.directStateBefore = {
        hasWallet: !!directBitcoinWallet,
        walletAddress: directBitcoinWallet?.address,
        isConnected: directIsConnected
      };

      // Test 4: Try connecting Bitcoin wallet if available
      if (availableWallets.length > 0) {
        console.log("🔗 Testing Bitcoin wallet connection...");
        
                 try {
           await directConnectWallet(availableWallets[0] as 'unisat' | 'xverse' | 'leather');
          
          // Wait a bit for state to sync
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          results.connectionTest = {
            success: true,
            walletType: availableWallets[0],
            connectedAddress: directBitcoinWallet?.address
          };
        } catch (error: any) {
          results.connectionTest = {
            success: false,
            error: error.message
          };
        }
      } else {
        results.connectionTest = {
          skipped: true,
          reason: "No Bitcoin wallets available"
        };
      }

      // Test 5: Check provider state after connection
      results.providerStateAfter = {
        selectedChain,
        activeChainId: activeChain?.id,
        walletAddress,
        hasBitcoinWallet: !!providerBitcoinWallet,
        bitcoinWalletAddress: providerBitcoinWallet?.address,
        bitcoinBalance: bitcoinBalance?.formatted
      };

      // Test 6: Check direct hook state after connection
      results.directStateAfter = {
        hasWallet: !!directBitcoinWallet,
        walletAddress: directBitcoinWallet?.address,
        isConnected: directIsConnected
      };

      // Test 7: Test chain switching
      if (directIsConnected) {
        console.log("🔄 Testing chain switching...");
        try {
          await switchToChain(chainConfigs[CHAIN_ID.bitcoin]);
          
          // Wait for state update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          results.chainSwitchTest = {
            success: true,
            finalSelectedChain: selectedChain,
            finalActiveChainId: activeChain?.id
          };
        } catch (error: any) {
          results.chainSwitchTest = {
            success: false,
            error: error.message
          };
        }
      }

      // Test 8: Test disconnect
      if (directIsConnected) {
        console.log("🔌 Testing wallet disconnect...");
        try {
          directDisconnect();
          
          // Wait for state update
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          results.disconnectTest = {
            success: true,
            finalSelectedChain: selectedChain,
            finalWalletAddress: walletAddress
          };
        } catch (error: any) {
          results.disconnectTest = {
            success: false,
            error: error.message
          };
        }
      }

      console.log("✅ Bitcoin Integration Test Complete");
      results.testCompleted = true;

    } catch (error: any) {
      console.error("❌ Bitcoin Integration Test Failed:", error);
      results.testError = error.message;
    } finally {
      setIsRunning(false);
    }

    setTestResults(results);
  };

  useEffect(() => {
    setTestResults({
      // Real-time state monitoring
      providerState: {
        selectedChain,
        activeChainId: activeChain?.id,
        walletAddress,
        hasBitcoinWallet: !!providerBitcoinWallet,
        bitcoinWalletAddress: providerBitcoinWallet?.address,
        bitcoinBalance: bitcoinBalance?.formatted
      },
      directState: {
        hasWallet: !!directBitcoinWallet,
        walletAddress: directBitcoinWallet?.address,
        isConnected: directIsConnected
      },
      availableWallets: getAvailableWallets(),
      bitcoinChainId: CHAIN_ID.bitcoin
    });
  }, [
    selectedChain, 
    activeChain, 
    walletAddress, 
    providerBitcoinWallet, 
    bitcoinBalance,
    directBitcoinWallet,
    directIsConnected,
    getAvailableWallets
  ]);

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🧪 Bitcoin Integration Test</h2>
      
      <div className="mb-6">
          <button
          onClick={runIntegrationTest}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
        >
          {isRunning ? "Running Test..." : "Run Integration Test"}
          </button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real-time State */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3">🔄 Real-time State</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>

        {/* Test Results */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3">📊 Test Results</h3>
          <div className="space-y-2 text-sm">
            {testResults.walletAvailability && (
              <div>
                <strong>Wallet Availability:</strong>
                <div className="ml-4">
                  {testResults.walletAvailability.available.length > 0 ? (
                    testResults.walletAvailability.available.map((wallet: string) => (
                      <div key={wallet} className="text-green-400">✅ {wallet}</div>
                    ))
                  ) : (
                    <div className="text-red-400">❌ No wallets available</div>
                  )}
                </div>
                  </div>
            )}

            {testResults.connectionTest && (
              <div>
                <strong>Connection Test:</strong>
                <div className="ml-4">
                  {testResults.connectionTest.success ? (
                    <div className="text-green-400">
                      ✅ Connected to {testResults.connectionTest.walletType}
                    </div>
                  ) : testResults.connectionTest.skipped ? (
                    <div className="text-yellow-400">
                      ⏭️ Skipped: {testResults.connectionTest.reason}
                    </div>
                  ) : (
                    <div className="text-red-400">
                      ❌ Failed: {testResults.connectionTest.error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {testResults.chainSwitchTest && (
              <div>
                <strong>Chain Switch Test:</strong>
                <div className="ml-4">
                  {testResults.chainSwitchTest.success ? (
                    <div className="text-green-400">
                      ✅ Switched to Bitcoin chain
                    </div>
                  ) : (
                    <div className="text-red-400">
                      ❌ Failed: {testResults.chainSwitchTest.error}
            </div>
          )}
        </div>
            </div>
            )}

            {testResults.disconnectTest && (
              <div>
                <strong>Disconnect Test:</strong>
                <div className="ml-4">
                  {testResults.disconnectTest.success ? (
                    <div className="text-green-400">
                      ✅ Disconnected successfully
            </div>
                  ) : (
                    <div className="text-red-400">
                      ❌ Failed: {testResults.disconnectTest.error}
            </div>
                  )}
            </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="mt-6 bg-gray-800 p-4 rounded">
        <h3 className="text-lg font-semibold mb-3">🎮 Manual Controls</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => connectBitcoin('unisat')}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            Connect Bitcoin (Unisat)
          </button>
          <button 
            onClick={() => switchToChain(chainConfigs[CHAIN_ID.bitcoin])}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Switch to Bitcoin Chain
          </button>
          <button 
            onClick={disconnectWallet}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Disconnect All
          </button>
        </div>
      </div>
    </div>
  );
};

export default BitcoinIntegrationTest; 