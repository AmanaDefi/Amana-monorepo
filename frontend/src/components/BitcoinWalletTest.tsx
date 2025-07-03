"use client";

import React, { useState, useEffect } from 'react';
import { useTemporaryBitcoinWallet } from '../hooks/useBitcoinWallet';
import { debugBitcoinIntegration } from '@/actions/bitcoinActions';
import BitcoinIntegrationTest from './BitcoinIntegrationTest';

interface DebugResult {
  bitcoinTokenId: number | null;
  isConfiguredInBeam: boolean;
  needsSwap: boolean | null;
  canProceed: boolean;
  error?: string;
}

interface AddressTestResult {
  address: string;
  tokenId: number | null;
  isConfigured: boolean;
  addressType: 'ZRC-20' | 'Native Bitcoin';
}

// ========================================
// TEMPORARY BITCOIN WALLET TEST COMPONENT
// ========================================
// This is a test component to verify Bitcoin wallet connection
// Remove this component once Bitcoin integration is complete

export const BitcoinWalletTest: React.FC = () => {
  const {
    wallet,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnect,
    getAvailableWallets,
    isWalletAvailable,
    debugWalletDetection
  } = useTemporaryBitcoinWallet();

  const [debugResult, setDebugResult] = useState<DebugResult>({
    bitcoinTokenId: null,
    isConfiguredInBeam: false,
    needsSwap: null,
    canProceed: false
  });
  
  const [addressTests, setAddressTests] = useState<AddressTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wallet' | 'comprehensive'>('wallet');

  const availableWallets = getAvailableWallets();

  // Auto-run debug utility when component mounts
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log("🔧 === RUNNING BITCOIN INTEGRATION DIAGNOSTICS ===");
      
      // Run the main debug function
      const result = await debugBitcoinIntegration();
      setDebugResult(result);
      
      // Test both addresses individually
      const { getBeamTokenId } = await import('@/actions/actions');
      
      const testAddresses = [
        {
          address: "0x13A0c5930C028511Dc02665E7285134B6d11A5f4",
          addressType: 'ZRC-20' as const
        },
        {
          address: "bc1qm24wp577nk8aacckv8np465z3dvmu7ry45el6y",
          addressType: 'Native Bitcoin' as const
        }
      ];
      
      const addressTestResults: AddressTestResult[] = [];
      
      for (const test of testAddresses) {
        console.log(`🔧 Testing ${test.addressType} address: ${test.address}`);
        const tokenId = await getBeamTokenId(test.address);
        
        addressTestResults.push({
          address: test.address,
          tokenId,
          isConfigured: !!tokenId,
          addressType: test.addressType
        });
        
        console.log(`🔧 ${test.addressType} Result:`, {
          address: test.address,
          tokenId,
          isConfigured: !!tokenId
        });
      }
      
      setAddressTests(addressTestResults);
      
      // Show fix status
      const zrc20Test = addressTestResults.find(t => t.addressType === 'ZRC-20');
      const nativeTest = addressTestResults.find(t => t.addressType === 'Native Bitcoin');
      
      console.log("🔧 === FIX VERIFICATION ===");
      console.log("✅ ZRC-20 Address Works:", !!zrc20Test?.isConfigured);
      console.log("❌ Native Address Fails (Expected):", !nativeTest?.isConfigured);
      console.log("🎯 Fix Status:", zrc20Test?.isConfigured && !nativeTest?.isConfigured ? "WORKING" : "NEEDS ATTENTION");
      
      if (zrc20Test?.isConfigured && !nativeTest?.isConfigured) {
        console.log("🎉 SUCCESS! The fix is working correctly!");
        console.log("   ✅ ZRC-20 address is found in Beam (for swap routing)");
        console.log("   ✅ Native address correctly fails in Beam (as expected)");
        console.log("   🚀 Bitcoin deposits should now work!");
      }

    } catch (error: any) {
      console.error("❌ Diagnostics failed:", error);
      setDebugResult({
        bitcoinTokenId: null,
        isConfiguredInBeam: false,
        needsSwap: null,
        canProceed: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFixStatus = () => {
    const zrc20Test = addressTests.find(t => t.addressType === 'ZRC-20');
    const nativeTest = addressTests.find(t => t.addressType === 'Native Bitcoin');
    
    if (zrc20Test?.isConfigured && !nativeTest?.isConfigured) {
      return {
        status: 'FIXED',
        color: 'text-green-600',
        message: '🎉 Fix is working! ZRC-20 found, native correctly fails.'
      };
    } else if (zrc20Test?.isConfigured && nativeTest?.isConfigured) {
      return {
        status: 'PARTIAL',
        color: 'text-yellow-600',
        message: '⚠️ Both addresses work (unexpected but not necessarily bad)'
      };
    } else if (!zrc20Test?.isConfigured) {
      return {
        status: 'BROKEN',
        color: 'text-red-600',
        message: '❌ ZRC-20 address not found in Beam - this is the issue!'
      };
    } else {
      return {
        status: 'UNKNOWN',
        color: 'text-gray-600',
        message: '🤔 Unexpected state'
      };
    }
  };

  const fixStatus = getFixStatus();

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'wallet'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔧 Bitcoin Wallet Test
          </button>
          <button
            onClick={() => setActiveTab('comprehensive')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comprehensive'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🧪 Comprehensive Test Suite
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'comprehensive' ? (
        <BitcoinIntegrationTest />
      ) : (
        <div>
          {isLoading ? (
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">🔧 Running Bitcoin Integration Diagnostics...</h3>
              <div className="animate-pulse">
                <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-blue-200 rounded w-2/3"></div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">🔧 Bitcoin Integration Diagnostics & Fix Verification</h3>
      
      {/* Fix Status */}
      <div className={`p-4 rounded-lg mb-6 ${fixStatus.status === 'FIXED' ? 'bg-green-50 border border-green-200' : 
        fixStatus.status === 'BROKEN' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        <h4 className="font-semibold mb-2">🎯 Fix Status</h4>
        <p className={`font-medium ${fixStatus.color}`}>{fixStatus.message}</p>
      </div>

      {/* Address Test Results */}
      <div className="mb-6">
        <h4 className="font-semibold mb-3">🧪 Address Test Results</h4>
        <div className="space-y-3">
          {addressTests.map((test, index) => (
            <div key={index} className={`p-3 rounded-lg border ${test.isConfigured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">{test.addressType}</span>
                <span className={`px-2 py-1 rounded text-sm ${test.isConfigured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {test.isConfigured ? '✅ Found' : '❌ Not Found'}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {test.address}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Token ID: {test.tokenId ?? 'null'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Debug Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <p><strong>Bitcoin Token ID:</strong> {debugResult.bitcoinTokenId || 'NOT FOUND'}</p>
          <p><strong>Configured in Beam:</strong> 
            <span className={debugResult.isConfiguredInBeam ? 'text-green-600' : 'text-red-600'}>
              {debugResult.isConfiguredInBeam ? ' ✅ Yes' : ' ❌ No'}
            </span>
          </p>
        </div>
        <div className="space-y-2">
          <p><strong>Can Proceed:</strong> 
            <span className={debugResult.canProceed ? 'text-green-600' : 'text-red-600'}>
              {debugResult.canProceed ? ' ✅ Yes' : ' ❌ No'}
            </span>
          </p>
          <p><strong>Needs Swap:</strong> {debugResult.needsSwap === null ? 'Unknown' : debugResult.needsSwap ? 'Yes' : 'No'}</p>
        </div>
      </div>

      {/* Error Display */}
      {debugResult.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
          <h4 className="font-semibold text-red-800 mb-2">❌ Error</h4>
          <p className="text-red-700">{debugResult.error}</p>
        </div>
      )}

      {/* Bitcoin Wallet Connection Section */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-3">🔗 Bitcoin Wallet Connection</h4>
        
        {/* Wallet Status */}
        <div className="mb-4">
          <p className="text-sm text-blue-700">
            <strong>Status:</strong> 
            <span className={isConnected ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
              {isConnected ? '✅ Connected' : '❌ Not Connected'}
            </span>
          </p>
          {wallet && (
            <p className="text-sm text-blue-700 mt-1">
              <strong>Address:</strong> <code className="bg-blue-100 px-1 rounded">{wallet.address}</code>
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-1">
              <strong>Error:</strong> {error}
            </p>
          )}
        </div>

        {/* Available Wallets */}
        <div className="mb-4">
          <h5 className="font-medium text-blue-800 mb-2">Available Wallets:</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {availableWallets.map((walletType) => (
              <div key={walletType} className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${isWalletAvailable(walletType) ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-sm text-blue-700 capitalize">{walletType}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isConnected ? (
            <>
              {isWalletAvailable('unisat') && (
                <button
                  // @ts-ignore
                  onClick={() => connectWallet('unisat')}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded transition-colors bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isConnecting ? '🔄 Connecting...' : '🟠 Connect Unisat'}
                </button>
              )}
              
              {isWalletAvailable('xverse') && (
                <button
                  // @ts-ignore
                  onClick={() => connectWallet('xverse')}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded transition-colors bg-purple-600 text-white hover:bg-purple-700"
                >
                  {isConnecting ? '🔄 Connecting...' : '🟣 Connect Xverse'}
                </button>
              )}
              
              {isWalletAvailable('leather') && (
                <button
                  // @ts-ignore
                  onClick={() => connectWallet('leather')}
                  disabled={isConnecting}
                  className="px-4 py-2 rounded transition-colors bg-amber-600 text-white hover:bg-amber-700"
                >
                  {isConnecting ? '🔄 Connecting...' : '🤎 Connect Leather'}
                </button>
              )}

              <button
                onClick={debugWalletDetection}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                🔍 Debug Wallets
              </button>

              {availableWallets.length === 0 && (
                <div className="text-sm text-red-600 p-2">
                  No Bitcoin wallets detected. Please install Unisat, Xverse, or Leather.
                </div>
              )}
            </>
          ) : (
            <button
              onClick={disconnect}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              🔌 Disconnect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button 
          onClick={runDiagnostics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          🔄 Re-run Diagnostics
        </button>
        
        <button 
          onClick={() => console.clear()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          🧹 Clear Console
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="font-semibold mb-2">📋 What This Test Shows</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>ZRC-20 Address:</strong> Should be found in Beam (Token ID should be a number)</li>
          <li>• <strong>Native Bitcoin Address:</strong> Should NOT be found in Beam (Token ID should be null)</li>
          <li>• <strong>Fix Working:</strong> When ZRC-20 works and Native fails, the fix is successful</li>
          <li>• Check browser console for detailed logs and debugging information</li>
        </ul>
      </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 