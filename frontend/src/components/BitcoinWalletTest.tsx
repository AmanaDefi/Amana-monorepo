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

  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const availableWallets = getAvailableWallets();

  // Auto-run debug utility when component mounts
  useEffect(() => {
    runBitcoinDebugUtility();
  }, []);

  const runBitcoinDebugUtility = async () => {
    setIsDebugging(true);
    try {
      console.log("🔧 Running Bitcoin Debug Utility...");
      const result = await debugBitcoinIntegration();
      setDebugResult(result);
      
      // Show results in UI alert as well
      if (!result.isConfiguredInBeam) {
        alert("❌ BITCOIN ROUTING ISSUE FOUND!\n\nBitcoin token is not configured in the Beam swap router.\n\nCheck the browser console for detailed logs and fix recommendations.");
      }
    } catch (error: any) {
      console.error("Debug utility failed:", error);
      setDebugResult({
        bitcoinTokenId: null,
        isConfiguredInBeam: false,
        needsSwap: null,
        canProceed: false,
        error: error.message
      });
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #f0ad4e', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#1a1f2e'
    }}>
      <h3 style={{ color: '#8b4513', marginBottom: '15px' }}>
        🧪 Bitcoin Wallet Test (Temporary)
      </h3>

      {/* Debug Results Section */}
      <div style={{ 
        marginBottom: '15px', 
        padding: '10px', 
        backgroundColor: debugResult?.isConfiguredInBeam ? '#d4edda' : '#f8d7da',
        border: `1px solid ${debugResult?.isConfiguredInBeam ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '4px'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>🔍 Bitcoin Integration Status</h4>
        {isDebugging ? (
          <p>⏳ Running diagnostics...</p>
        ) : debugResult ? (
          <div>
            <p><strong>Bitcoin Token ID:</strong> {debugResult.bitcoinTokenId || 'NOT FOUND'}</p>
            <p><strong>Configured in Beam:</strong> {debugResult.isConfiguredInBeam ? '✅ YES' : '❌ NO'}</p>
            <p><strong>Can Proceed:</strong> {debugResult.canProceed ? '✅ YES' : '❌ NO'}</p>
            {debugResult.error && (
              <p style={{ color: 'red' }}><strong>Error:</strong> {debugResult.error}</p>
            )}
            
            {!debugResult.isConfiguredInBeam && (
              <div style={{ marginTop: '10px', padding: '8px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                <strong>🚨 SWAP ROUTE ISSUE IDENTIFIED:</strong>
                <p>Bitcoin token is not configured in the Beam swap router.</p>
                <strong>📋 FIXES:</strong>
                <ol style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  <li>Contact Beam team to add Bitcoin ZRC-20 token</li>
                  <li>Create Bitcoin-only vaults (no swap needed)</li>
                  <li>Use ZetaChain native swaps instead</li>
                </ol>
              </div>
            )}
          </div>
        ) : (
                          <p>Click &quot;Re-run Debug&quot; to diagnose Bitcoin integration issues</p>
        )}
        
        <button 
          onClick={runBitcoinDebugUtility}
          disabled={isDebugging}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isDebugging ? '⏳ Running...' : '🔧 Re-run Debug'}
        </button>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>Available Bitcoin Wallets:</strong> {availableWallets.length > 0 ? availableWallets.join(', ') : 'None detected'}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={debugWalletDetection}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🔍 Debug Wallet Detection (Check Console)
        </button>
      </div>

      {!isConnected ? (
        <div>
          <p style={{ marginBottom: '10px' }}>Test Bitcoin wallet connection:</p>
          
          {availableWallets.map((walletType) => (
            <button
              key={walletType}
              onClick={() => connectWallet(walletType as any)}
              disabled={isConnecting}
              style={{
                margin: '5px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.6 : 1
              }}
            >
              {isConnecting ? 'Connecting...' : `Connect ${walletType.charAt(0).toUpperCase() + walletType.slice(1)}`}
            </button>
          ))}

          {availableWallets.length === 0 && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#1a1f2e', borderRadius: '4px' }}>
              <strong>No Bitcoin wallets detected!</strong>
              <p style={{ margin: '5px 0' }}>Please install one of these Bitcoin wallets:</p>
              <ul style={{ margin: '5px 0' }}>
                <li><a href="https://unisat.io" target="_blank" rel="noopener noreferrer">Unisat Wallet</a></li>
                <li><a href="https://www.xverse.app" target="_blank" rel="noopener noreferrer">Xverse Wallet</a></li>
                <li><a href="https://leather.io" target="_blank" rel="noopener noreferrer">Leather Wallet</a></li>
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div style={{ backgroundColor: '#14171f', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            <strong>✅ Bitcoin Wallet Connected!</strong>
            <div><strong>Type:</strong> {wallet?.walletType}</div>
            <div><strong>Address:</strong> {wallet?.address}</div>
            <div><strong>Network:</strong> {wallet?.network}</div>
          </div>
          
          <button
            onClick={disconnect}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: '#1a1f2e',
          color: '#721c24',
          borderRadius: '4px' 
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ 
        marginTop: '15px', 
        fontSize: '12px', 
        color: '#6c757d',
        borderTop: '1px solid #dee2e6',
        paddingTop: '10px'
      }}>
        <strong>Note:</strong> This is a temporary test component. It will be removed once Bitcoin integration is complete.
      </div>
    </div>
  );
}; 