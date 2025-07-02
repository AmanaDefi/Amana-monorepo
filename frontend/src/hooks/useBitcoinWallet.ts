"use client";

import { useState, useEffect, useCallback } from 'react';

// ========================================
// TEMPORARY BITCOIN WALLET HOOK
// ========================================
// This is an isolated, temporary solution for Bitcoin wallet connection
// that won't conflict with the existing MultiChainProvider or wallet infrastructure.
// Can be easily replaced when the production wallet connector is ready.

// Bitcoin wallet interface
export interface TemporaryBitcoinWallet {
  address: string;
  publicKey: string;
  network: 'mainnet' | 'testnet';
  walletType: 'unisat' | 'xverse' | 'leather';
  signTransaction: (tx: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<number>;
  provider: any;
}

// Window interface extensions for Bitcoin wallets
declare global {
  interface Window {
    unisat?: {
      requestAccounts: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      getNetwork: () => Promise<string>;
      getBalance: () => Promise<{ total: number; confirmed: number; unconfirmed: number }>;
      getPublicKey: () => Promise<string>;
      signMessage: (message: string) => Promise<string>;
      signTx: (tx: any) => Promise<string>;
    };
    xverse?: {
      BitcoinProvider?: {
        connect: () => Promise<{
          addresses: Array<{ address: string; publicKey: string }>;
        }>;
        getBalance: () => Promise<{ total: number }>;
        signTransaction: (tx: any) => Promise<string>;
        signMessage: (message: string) => Promise<string>;
      };
    };
    BitcoinProvider?: {
      connect: () => Promise<{
        addresses: Array<{ address: string; publicKey: string }>;
      }>;
      getBalance: () => Promise<{ total: number }>;
      signTransaction: (tx: any) => Promise<string>;
      signMessage: (message: string) => Promise<string>;
    };
    XverseProviders?: {
      BitcoinProvider: {
        connect: () => Promise<{
          addresses: Array<{ address: string; publicKey: string }>;
        }>;
        getBalance: () => Promise<{ total: number }>;
        signTransaction: (tx: any) => Promise<string>;
        signMessage: (message: string) => Promise<string>;
      };
    };
    LeatherProvider?: {
      request: (method: string, params?: any) => Promise<any>;
    };
  }
}

export const useTemporaryBitcoinWallet = () => {
  const [wallet, setWallet] = useState<TemporaryBitcoinWallet | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug function to check what's available in window
  const debugWalletDetection = useCallback(() => {
    if (typeof window !== 'undefined') {
      console.log('🔍 Bitcoin Wallet Detection Debug:');
      console.log('- window.unisat:', !!window.unisat);
      console.log('- window.xverse:', !!window.xverse);
      console.log('- window.xverse?.BitcoinProvider:', !!(window.xverse?.BitcoinProvider));
      console.log('- window.BitcoinProvider:', !!((window as any).BitcoinProvider));
      console.log('- window.XverseProviders:', !!((window as any).XverseProviders));
      console.log('- window.XverseProviders?.BitcoinProvider:', !!((window as any).XverseProviders?.BitcoinProvider));
      console.log('- window.LeatherProvider:', !!(window.LeatherProvider));
    }
  }, []);

  // Check if Bitcoin wallets are available
  const getAvailableWallets = useCallback(() => {
    const available = [];
    if (typeof window !== 'undefined') {
      // Debug log
      debugWalletDetection();
      
      // Check Unisat
      if (window.unisat) available.push('unisat');
      
      // Check Xverse - Multiple possible injection patterns
      if (window.xverse?.BitcoinProvider || 
          (window as any).BitcoinProvider || 
          (window as any).XverseProviders?.BitcoinProvider) {
        available.push('xverse');
      }
      
      // Check Leather/Hiro
      if (window.LeatherProvider) available.push('leather');
    }
    return available;
  }, [debugWalletDetection]);

  // Connect to specific Bitcoin wallet
  const connectWallet = useCallback(async (walletType: 'unisat' | 'xverse' | 'leather') => {
    setIsConnecting(true);
    setError(null);

    try {
      let walletInstance: TemporaryBitcoinWallet;

      switch (walletType) {
        case 'unisat':
          walletInstance = await connectUnisat();
          break;
        case 'xverse':
          walletInstance = await connectXverse();
          break;
        case 'leather':
          walletInstance = await connectLeather();
          break;
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }

      setWallet(walletInstance);
      setIsConnected(true);
      
      // Store preference for auto-reconnect
      if (typeof window !== 'undefined') {
        localStorage.setItem('temp_bitcoin_wallet_preference', walletType);
      }
      
      console.log(`🟠 Bitcoin wallet connected: ${walletType}`, walletInstance.address);
      
    } catch (error: any) {
      console.error('❌ Failed to connect Bitcoin wallet:', error);
      setError(error.message || 'Failed to connect Bitcoin wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Unisat wallet connection
  const connectUnisat = async (): Promise<TemporaryBitcoinWallet> => {
    if (!window.unisat) {
      throw new Error('Unisat wallet not found. Please install Unisat extension.');
    }

    const accounts = await window.unisat.requestAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No Unisat accounts found');
    }

    const network = await window.unisat.getNetwork();
    const publicKey = await window.unisat.getPublicKey();
    
    return {
      address: accounts[0],
      publicKey: publicKey,
      network: network === 'livenet' ? 'mainnet' : 'testnet',
      walletType: 'unisat',
      signTransaction: window.unisat.signTx,
      signMessage: window.unisat.signMessage,
      getBalance: async () => {
        const balance = await window.unisat?.getBalance();
        return balance?.total || 0;
      },
      provider: window.unisat
    };
  };

  // Xverse wallet connection
  const connectXverse = async (): Promise<TemporaryBitcoinWallet> => {
    // Try different Xverse injection patterns
    let provider;
    
    if (window.xverse?.BitcoinProvider) {
      provider = window.xverse.BitcoinProvider;
    } else if ((window as any).BitcoinProvider) {
      provider = (window as any).BitcoinProvider;
    } else if ((window as any).XverseProviders?.BitcoinProvider) {
      provider = (window as any).XverseProviders.BitcoinProvider;
    } else {
      throw new Error('Xverse wallet not found. Please install Xverse extension.');
    }

    const response = await provider.connect();
    
    if (!response.addresses || response.addresses.length === 0) {
      throw new Error('No Xverse addresses found');
    }

    return {
      address: response.addresses[0].address,
      publicKey: response.addresses[0].publicKey,
      network: 'mainnet', // Xverse typically uses mainnet
      walletType: 'xverse',
      signTransaction: provider.signTransaction,
      signMessage: provider.signMessage,
      getBalance: async () => {
        const balance = await provider.getBalance();
        return balance.total;
      },
      provider: provider
    };
  };

  // Leather wallet connection
  const connectLeather = async (): Promise<TemporaryBitcoinWallet> => {
    if (!window.LeatherProvider) {
      throw new Error('Leather wallet not found. Please install Leather extension.');
    }

    const provider = window.LeatherProvider;
    const response = await provider.request('getAddresses');
    
    if (!response.addresses?.bitcoin) {
      throw new Error('No Leather Bitcoin addresses found');
    }

    return {
      address: response.addresses.bitcoin.p2wpkh, // Use native segwit
      publicKey: response.addresses.bitcoin.publicKey,
      network: 'mainnet',
      walletType: 'leather',
      signTransaction: (tx: any) => provider.request('signTx', { tx }),
      signMessage: (message: string) => provider.request('signMessage', { message }),
      getBalance: async () => {
        const balance = await provider.request('getBalance');
        return balance.total;
      },
      provider: provider
    };
  };

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWallet(null);
    setIsConnected(false);
    setError(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('temp_bitcoin_wallet_preference');
    }
    
    console.log('🟠 Bitcoin wallet disconnected');
  }, []);

  // Auto-reconnect on page load (if previously connected)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const preferredWallet = localStorage.getItem('temp_bitcoin_wallet_preference') as 'unisat' | 'xverse' | 'leather';
      
      if (preferredWallet && getAvailableWallets().includes(preferredWallet)) {
        // Auto-reconnect after a short delay to avoid hydration issues
        const timer = setTimeout(() => {
          connectWallet(preferredWallet).catch((error) => {
            console.warn('Auto-reconnect failed:', error);
            // Clear preference if auto-reconnect fails
            localStorage.removeItem('temp_bitcoin_wallet_preference');
          });
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [connectWallet, getAvailableWallets]);

  return {
    // State
    wallet,
    isConnected,
    isConnecting,
    error,
    
    // Actions
    connectWallet,
    disconnect,
    getAvailableWallets,
    
    // Utilities
    isWalletAvailable: (walletType: 'unisat' | 'xverse' | 'leather') => {
      return getAvailableWallets().includes(walletType);
    },
    debugWalletDetection // For troubleshooting
  };
};

// Export for easy identification as temporary solution
export const BITCOIN_WALLET_HOOK_STATUS = 'TEMPORARY_ISOLATED_SOLUTION'; 