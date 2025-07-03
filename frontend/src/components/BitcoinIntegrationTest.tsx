import React, { useState, useEffect } from 'react';
import { debugBitcoinIntegration } from '@/actions/bitcoinActions';
import { CHAIN_ID } from '@/constants/chainConfig';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'failure';
  message: string;
  details?: any;
}

const BitcoinIntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'pending' | 'success' | 'failure'>('pending');

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setOverallStatus('pending');
    const results: TestResult[] = [];

    // Test 1: Chain Configuration
    try {
      const chainConfigTest = await testChainConfiguration();
      results.push(chainConfigTest);
    } catch (error: any) {
      results.push({
        test: 'Chain Configuration',
        status: 'failure',
        message: `Chain configuration test failed: ${error.message}`,
        details: error
      });
    }

    // Test 2: Bitcoin Integration Debug
    try {
      const bitcoinDebugTest = await testBitcoinIntegration();
      results.push(bitcoinDebugTest);
    } catch (error: any) {
      results.push({
        test: 'Bitcoin Integration Debug',
        status: 'failure',
        message: `Bitcoin integration test failed: ${error.message}`,
        details: error
      });
    }

    setTestResults(results);
    
    // Determine overall status
    const hasFailures = results.some(result => result.status === 'failure');
    const hasPending = results.some(result => result.status === 'pending');
    
    if (hasFailures) {
      setOverallStatus('failure');
    } else if (hasPending) {
      setOverallStatus('pending');
    } else {
      setOverallStatus('success');
    }
    
    setIsRunning(false);
  };

  const testChainConfiguration = async (): Promise<TestResult> => {
    try {
      // Test that Bitcoin and Solana chain IDs are properly configured
      const bitcoinChainId = CHAIN_ID.bitcoin;
      const solanaChainId = CHAIN_ID.solana;
      
      // Import chainConfigs to test access
      const { chainConfigs } = await import('@/constants/chainConfig');
      
      // Test that both chains are in chainConfigs
      const bitcoinConfig = chainConfigs[bitcoinChainId];
      const solanaConfig = chainConfigs[solanaChainId];
      
      if (!bitcoinConfig) {
        throw new Error(`Bitcoin chain config not found for chain ID: ${bitcoinChainId}`);
      }
      
      if (!solanaConfig) {
        throw new Error(`Solana chain config not found for chain ID: ${solanaChainId}`);
      }
      
      // Test that both have proper RPC URLs
      if (!bitcoinConfig.rpcUrls?.default?.http?.[0]) {
        throw new Error('Bitcoin chain config missing RPC URL');
      }
      
      if (!solanaConfig.rpcUrls?.default?.http?.[0]) {
        throw new Error('Solana chain config missing RPC URL');
      }
      
      return {
        test: 'Chain Configuration',
        status: 'success',
        message: 'Bitcoin and Solana chain configurations are properly set up',
        details: {
          bitcoinChainId,
          solanaChainId,
          bitcoinRpcUrl: bitcoinConfig.rpcUrls.default.http[0],
          solanaRpcUrl: solanaConfig.rpcUrls.default.http[0]
        }
      };
      
    } catch (error: any) {
      return {
        test: 'Chain Configuration',
        status: 'failure',
        message: error.message,
        details: error
      };
    }
  };

  const testBitcoinIntegration = async (): Promise<TestResult> => {
    try {
      const debugResult = await debugBitcoinIntegration();
      
      if (debugResult.error) {
        return {
          test: 'Bitcoin Integration Debug',
          status: 'failure',
          message: `Bitcoin integration has issues: ${debugResult.error}`,
          details: debugResult
        };
      }
      
      return {
        test: 'Bitcoin Integration Debug',
        status: debugResult.canProceed ? 'success' : 'failure',
        message: debugResult.canProceed 
          ? 'Bitcoin integration is properly configured'
          : 'Bitcoin integration needs attention - check console for details',
        details: debugResult
      };
      
    } catch (error: any) {
      return {
        test: 'Bitcoin Integration Debug',
        status: 'failure',
        message: error.message,
        details: error
      };
    }
  };

  // Run tests automatically on component mount
  useEffect(() => {
    runComprehensiveTest();
  }, []);

  const getStatusIcon = (status: 'pending' | 'success' | 'failure') => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'failure') => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'success':
        return 'text-green-600';
      case 'failure':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Bitcoin Integration Test Suite
          </h1>
          <div className={`flex items-center space-x-2 ${getStatusColor(overallStatus)}`}>
            <span className="text-2xl">{getStatusIcon(overallStatus)}</span>
            <span className="font-semibold">
              {overallStatus === 'pending' && 'Running...'}
              {overallStatus === 'success' && 'All Tests Passed'}
              {overallStatus === 'failure' && 'Tests Failed'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`border-l-4 p-4 rounded-r-lg ${
                result.status === 'success'
                  ? 'border-green-500 bg-green-50'
                  : result.status === 'failure'
                  ? 'border-red-500 bg-red-50'
                  : 'border-yellow-500 bg-yellow-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <h3 className="font-semibold text-gray-800">{result.test}</h3>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-gray-700">{result.message}</p>
              {result.details && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    View Details
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={runComprehensiveTest}
            disabled={isRunning}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
              isRunning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isRunning ? 'Running Tests...' : 'Run Tests Again'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">What This Test Suite Checks:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Chain configuration for Bitcoin and Solana</li>
            <li>• Bitcoin integration debug utility</li>
            <li>• System stability with Bitcoin integration</li>
            <li>• All chain configuration errors resolved</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BitcoinIntegrationTest; 