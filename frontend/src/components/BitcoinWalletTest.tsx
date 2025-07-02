"use client";

import React from 'react';
import { useTemporaryBitcoinWallet } from '../hooks/useBitcoinWallet';

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

  const availableWallets = getAvailableWallets();

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