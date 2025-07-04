import React, { useState } from 'react';
import { 
  executeBitcoinDeposit, 
  getBitcoinPathDataAndMinSharesOut, 
  estimateBitcoinDepositOutput,
  validateBitcoinDeposit,
  debugBitcoinIntegration
} from '@/actions/bitcoinActions';
import { VaultData, Token } from '@/types/types';
import { CHAIN_ID, APPROVED_TOKENS } from '@/constants/chainConfig';
import { ZC_BTC_BTC_ADDRESS } from '@/constants';

const BitcoinIntegrationTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mockVaultData: VaultData = {
    id: '0x1234567890abcdef',
    inputToken: {
      address: '0x9615152e180085f057c7708e8f05e5a7770a4561', // Example USDC address
      symbol: 'USDC',
      decimals: 6,
      imgURL: '/usdc-logo.png',
      price: 1,
      balance: { value: BigInt(0), formatted: '0' },
      isNative: false
    },
    // Add other required VaultData fields
    name: 'Test Vault',
    symbol: 'TEST',
    decimals: 18,
    totalSupply: BigInt(0),
    pricePerShare: BigInt(0),
    totalAssets: BigInt(0),
    apy: 0,
    chain: 'bitcoin',
    strategy: 'test',
    riskLevel: 'medium',
    tvl: BigInt(0),
    fees: { deposit: 0, withdrawal: 0, performance: 0 },
    isActive: true,
    description: 'Test vault for Bitcoin integration'
  } as unknown as VaultData;

  const mockBitcoinWallet = {
    address: 'bc1qtest123456789abcdef',
    publicKey: 'test-public-key',
    network: 'mainnet' as const,
    signTransaction: async (tx: any) => 'mock-signature',
    signMessage: async (msg: string) => 'mock-signature',
    getBalance: async () => 100000000, // 1 BTC in satoshis
    provider: null
  };

  // Get existing ZRC-20 BTC token from chainConfig
  const bitcoinTokens = APPROVED_TOKENS[CHAIN_ID.bitcoin];
  const bitcoinToken = bitcoinTokens?.[0]; // Native Bitcoin token
  const mockBtcToken: Token = bitcoinToken?.ZRC20equivalent!;

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(true);
    console.log(`🧪 Running test: ${testName}`);
    
    try {
      const result = await testFn();
      const testResult = {
        name: testName,
        status: 'PASS',
        result,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [...prev, testResult]);
      console.log(`✅ Test passed: ${testName}`, result);
      return result;
    } catch (error: any) {
      const testResult = {
        name: testName,
        status: 'FAIL',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      setTestResults(prev => [...prev, testResult]);
      console.error(`❌ Test failed: ${testName}`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    
    try {
      // Test 1: Bitcoin configuration validation
      await runTest('Bitcoin Configuration Check', async () => {
        const debugResult = await debugBitcoinIntegration();
        return {
          canProceed: debugResult.canProceed,
          btcAddress: ZC_BTC_BTC_ADDRESS,
          hasValidAddress: ZC_BTC_BTC_ADDRESS.startsWith('0x')
        };
      });

      // Test 2: Bitcoin deposit validation
      await runTest('Bitcoin Deposit Validation', async () => {
        const validation = validateBitcoinDeposit(
          mockBitcoinWallet,
          BigInt(1000000), // 0.01 BTC
          mockVaultData
        );
        return validation;
      });

      // Test 3: Bitcoin path calculation (NEW SIMPLIFIED APPROACH)
      await runTest('Bitcoin Path Calculation (EVM-like)', async () => {
        const pathResult = await getBitcoinPathDataAndMinSharesOut(
          mockVaultData,
          mockBtcToken,
          BigInt(1000000), // 0.01 BTC
          mockBitcoinWallet
        );
        
        return {
          swapPath: pathResult.swapPath,
          minSharesOut: pathResult.minSharesOut.toString(),
          estimatedOutput: pathResult.estimatedOutput.toString(),
          approach: 'Uses ZRC-20 BTC.BTC address with existing swap function'
        };
      });

      // Test 4: Bitcoin output estimation
      await runTest('Bitcoin Output Estimation', async () => {
        const estimation = await estimateBitcoinDepositOutput(
          mockVaultData,
          mockBtcToken,
          BigInt(1000000), // 0.01 BTC
          mockBitcoinWallet
        );
        
        return {
          estimatedVaultTokens: estimation.estimatedVaultTokens.toString(),
          estimatedShares: estimation.estimatedShares.toString(),
          conversionSteps: estimation.conversionSteps,
          fees: estimation.fees
        };
      });

      // Test 5: Swap function compatibility test
      await runTest('Swap Function Compatibility', async () => {
        try {
          const { getPathDataAndAmountOut } = await import('@/actions/actions');
          
          // Test with ZRC-20 BTC address (should work now)
          const result = await getPathDataAndAmountOut(
            BigInt(1000000), // 0.01 BTC
            mockBtcToken,    // ZRC-20 BTC token
            mockVaultData.inputToken, // USDC
            mockVaultData.id,
            500 // 5% slippage
          );
          
          return {
            success: true,
            hasPath: !!result.encodedPath,
            amountOut: result.amountOut.toString(),
            approach: 'ZRC-20 BTC.BTC address works with existing swap function'
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            note: 'This is the issue we are trying to fix'
          };
        }
      });

      console.log('🎉 All Bitcoin integration tests completed!');
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          🧪 Bitcoin Integration Test Suite
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Overview</h2>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>New Approach:</strong> Use ZRC-20 BTC.BTC address ({ZC_BTC_BTC_ADDRESS}) 
              with existing swap functions, treating it as 1:1 with native BTC.
            </p>
          </div>
          
          <button
            onClick={runAllTests}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? '🔄 Running Tests...' : '🚀 Run All Tests'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          
                     {testResults.length === 0 ? (
             <p className="text-gray-500">No tests run yet. Click &quot;Run All Tests&quot; to start.</p>
           ) : (
            <div className="space-y-4">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    test.status === 'PASS' 
                      ? 'bg-green-50 border-green-500' 
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">
                      {test.status === 'PASS' ? '✅' : '❌'} {test.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {new Date(test.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {test.status === 'PASS' ? (
                    <pre className="text-sm bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(test.result, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-red-700 text-sm">
                      <strong>Error:</strong> {test.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Expected Flow</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
              <span>User enters Bitcoin amount in UI</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
              <span>Frontend uses ZRC-20 BTC.BTC address with existing swap function</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
              <span>Beam API calculates route: ZRC-20 BTC → Vault Token</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
                             <span>UI shows expected output amount (no more &quot;swap route not found&quot;)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">5</span>
              <span>User confirms deposit → TSS Gateway handles native BTC → ZRC-20 BTC conversion</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitcoinIntegrationTest; 