import React, { useState, useEffect } from 'react';
import { 
  debugBitcoinIntegration, 
  getBitcoinPathDataAndMinSharesOut,
  estimateBitcoinDepositOutput,
  validateBitcoinDeposit
} from '@/actions/bitcoinActions';
import { CHAIN_ID } from '@/constants/chainConfig';
import { ZC_BTC_BTC_ADDRESS } from '@/constants';

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
  const [bitcoinLogs, setBitcoinLogs] = useState<any[]>([]);

  const runComprehensiveTest = async () => {
    setIsRunning(true);
    setOverallStatus('pending');
    const results: TestResult[] = [];

    // Test 1: Basic Bitcoin Integration Debug
    try {
      const debugResult = await debugBitcoinIntegration();
      results.push({
        test: 'Bitcoin Integration Debug',
        status: debugResult.canProceed ? 'success' : 'failure',
        message: debugResult.canProceed 
          ? 'Bitcoin integration basic setup is working'
          : `Bitcoin integration issues: ${debugResult.error}`,
        details: debugResult
      });
      
      // Store logs for display
      setBitcoinLogs(debugResult.logs || []);
    } catch (error: any) {
      results.push({
        test: 'Bitcoin Integration Debug',
        status: 'failure',
        message: `Debug test failed: ${error.message}`,
        details: error
      });
    }

    // Test 2: Bitcoin Path Calculation
    try {
      const pathTest = await testBitcoinPathCalculation();
      results.push(pathTest);
    } catch (error: any) {
      results.push({
        test: 'Bitcoin Path Calculation',
        status: 'failure',
        message: `Path calculation test failed: ${error.message}`,
        details: error
      });
    }

    // Test 3: Bitcoin Amount Estimation
    try {
      const estimationTest = await testBitcoinAmountEstimation();
      results.push(estimationTest);
    } catch (error: any) {
      results.push({
        test: 'Bitcoin Amount Estimation',
        status: 'failure',
        message: `Amount estimation test failed: ${error.message}`,
        details: error
      });
    }

    // Test 4: Bitcoin Deposit Validation
    try {
      const validationTest = await testBitcoinDepositValidation();
      results.push(validationTest);
    } catch (error: any) {
      results.push({
        test: 'Bitcoin Deposit Validation',
        status: 'failure',
        message: `Validation test failed: ${error.message}`,
        details: error
      });
    }

    // Test 5: Swap Function Compatibility
    try {
      const swapTest = await testSwapFunctionCompatibility();
      results.push(swapTest);
    } catch (error: any) {
      results.push({
        test: 'Swap Function Compatibility',
        status: 'failure',
        message: `Swap compatibility test failed: ${error.message}`,
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

  const testBitcoinPathCalculation = async (): Promise<TestResult> => {
    try {
      // Mock data for testing
      const mockBitcoinWallet = {
        address: 'bc1qtest123...',
        publicKey: 'test-pubkey',
        network: 'mainnet' as const,
        signTransaction: async () => 'mock-signature',
        signMessage: async () => 'mock-signature',
        getBalance: async () => 100000000,
        provider: null
      };

      const mockVaultData = {
        id: '0x123...',
        inputToken: { 
          address: ZC_BTC_BTC_ADDRESS,
          symbol: 'BTC',
          decimals: 8
        }
      } as any;

      const mockInputToken = {
        address: 'native',
        symbol: 'BTC',
        decimals: 8
      } as any;

      const testAmount = BigInt(1000000); // 0.01 BTC

      const pathResult = await getBitcoinPathDataAndMinSharesOut(
        mockVaultData,
        mockInputToken,
        testAmount,
        mockBitcoinWallet
      );

      return {
        test: 'Bitcoin Path Calculation',
        status: 'success',
        message: 'Bitcoin path calculation working correctly',
        details: {
          swapPath: pathResult.swapPath,
          minSharesOut: pathResult.minSharesOut.toString(),
          estimatedOutput: pathResult.estimatedOutput.toString(),
          hasSwapPath: pathResult.swapPath !== "0x"
        }
      };

    } catch (error: any) {
      return {
        test: 'Bitcoin Path Calculation',
        status: 'failure',
        message: `Path calculation failed: ${error.message}`,
        details: error
      };
    }
  };

  const testBitcoinAmountEstimation = async (): Promise<TestResult> => {
    try {
      // Mock data for testing
      const mockBitcoinWallet = {
        address: 'bc1qtest123...',
        publicKey: 'test-pubkey',
        network: 'mainnet' as const,
        signTransaction: async () => 'mock-signature',
        signMessage: async () => 'mock-signature',
        getBalance: async () => 100000000,
        provider: null
      };

      const mockVaultData = {
        id: '0x123...',
        inputToken: { 
          address: ZC_BTC_BTC_ADDRESS,
          symbol: 'BTC',
          decimals: 8
        }
      } as any;

      const mockInputToken = {
        address: 'native',
        symbol: 'BTC',
        decimals: 8
      } as any;

      const testAmount = BigInt(1000000); // 0.01 BTC

      const estimation = await estimateBitcoinDepositOutput(
        mockVaultData,
        mockInputToken,
        testAmount,
        mockBitcoinWallet
      );

      return {
        test: 'Bitcoin Amount Estimation',
        status: 'success',
        message: 'Bitcoin amount estimation working correctly',
        details: {
          estimatedVaultTokens: estimation.estimatedVaultTokens.toString(),
          estimatedShares: estimation.estimatedShares.toString(),
          conversionSteps: estimation.conversionSteps,
          fees: estimation.fees
        }
      };

    } catch (error: any) {
      return {
        test: 'Bitcoin Amount Estimation',
        status: 'failure',
        message: `Amount estimation failed: ${error.message}`,
        details: error
      };
    }
  };

  const testBitcoinDepositValidation = async (): Promise<TestResult> => {
    try {
      const mockBitcoinWallet = {
        address: 'bc1qtest123...',
        publicKey: 'test-pubkey',
        network: 'mainnet' as const,
        signTransaction: async () => 'mock-signature',
        signMessage: async () => 'mock-signature',
        getBalance: async () => 100000000,
        provider: null
      };

      const mockVaultData = {
        id: '0x123...',
        inputToken: { 
          address: ZC_BTC_BTC_ADDRESS,
          symbol: 'BTC',
          decimals: 8
        }
      } as any;

      // Test valid deposit
      const validDeposit = validateBitcoinDeposit(
        mockBitcoinWallet,
        BigInt(1000000), // 0.01 BTC
        mockVaultData
      );

      // Test invalid deposit (too small)
      const invalidDeposit = validateBitcoinDeposit(
        mockBitcoinWallet,
        BigInt(100), // Too small
        mockVaultData
      );

      return {
        test: 'Bitcoin Deposit Validation',
        status: validDeposit.isValid && !invalidDeposit.isValid ? 'success' : 'failure',
        message: validDeposit.isValid && !invalidDeposit.isValid 
          ? 'Bitcoin deposit validation working correctly'
          : 'Bitcoin deposit validation has issues',
        details: {
          validDeposit,
          invalidDeposit
        }
      };

    } catch (error: any) {
      return {
        test: 'Bitcoin Deposit Validation',
        status: 'failure',
        message: `Validation test failed: ${error.message}`,
        details: error
      };
    }
  };

  const testSwapFunctionCompatibility = async (): Promise<TestResult> => {
    try {
      // Test if swap functions can handle ZRC-20 BTC
      const { getPathDataAndAmountOut } = await import('@/actions/actions');
      
      const mockZRC20BtcToken = {
        address: ZC_BTC_BTC_ADDRESS,
        symbol: 'BTC',
        decimals: 8,
        imgURL: '/bitcoin_logo.png',
        price: 0,
        balance: { value: BigInt(0), formatted: '0' },
        isNative: false
      };

      const mockVaultToken = {
        address: '0x456...',
        symbol: 'USDT',
        decimals: 6,
        imgURL: '/usdt.png',
        price: 0,
        balance: { value: BigInt(0), formatted: '0' },
        isNative: false
      };

      // This should work for ZRC-20 BTC → other tokens
      const swapResult = await getPathDataAndAmountOut(
        BigInt(1000000), // 0.01 BTC
        mockZRC20BtcToken,
        mockVaultToken,
        '0x123...',
        5 // 5% slippage
      );

      return {
        test: 'Swap Function Compatibility',
        status: 'success',
        message: 'Swap functions can handle ZRC-20 BTC conversions',
        details: {
          encodedPath: swapResult.encodedPath,
          amountOut: swapResult.amountOut.toString(),
          hasPath: !!swapResult.encodedPath
        }
      };

    } catch (error: any) {
      return {
        test: 'Swap Function Compatibility',
        status: 'failure',
        message: `Swap function compatibility failed: ${error.message}`,
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
    <div className="p-6 max-w-6xl mx-auto">
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

        {/* Test Results */}
        <div className="space-y-4 mb-8">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${
                result.status === 'success' ? 'border-green-200 bg-green-50' :
                result.status === 'failure' ? 'border-red-200 bg-red-50' :
                'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getStatusIcon(result.status)}</span>
                  <h3 className="font-semibold text-gray-800">{result.test}</h3>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-600 mt-2">{result.message}</p>
              {result.details && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    Show Details
                  </summary>
                  <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {/* Bitcoin Logs */}
        {bitcoinLogs.length > 0 && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold text-gray-800 mb-3">Bitcoin Integration Logs</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {bitcoinLogs.map((log, index) => (
                <div key={index} className="text-sm">
                  <span className="text-gray-500">{log.timestamp}</span>
                  <span className={`ml-2 font-medium ${
                    log.level === 'ERROR' ? 'text-red-600' :
                    log.level === 'WARN' ? 'text-yellow-600' :
                    log.level === 'INFO' ? 'text-blue-600' :
                    'text-purple-600'
                  }`}>
                    [{log.level}]
                  </span>
                  <span className="ml-2 text-gray-700">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={runComprehensiveTest}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunning ? 'Running Tests...' : 'Run Tests Again'}
          </button>
          
          <button
            onClick={() => console.log('Bitcoin Integration Test Results:', testResults)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Export Results to Console
          </button>
        </div>
      </div>
    </div>
  );
};

export default BitcoinIntegrationTest; 