"use client";

import React, { useState, useEffect } from 'react';
import { useTemporaryBitcoinWallet } from '../hooks/useBitcoinWallet';
import { debugBitcoinIntegration } from '@/actions/bitcoinActions';

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
      

  {/* Available Wallets */}
        <div className="mb-4">
          <h5 className="font-medium text-blue-800 mb-2">Available Wallets:</h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {availableWallets.map((walletType) => (
              <div key={walletType} className="flex items-center space-x-2">
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
   
  );
};

export default BitcoinWalletTest;
