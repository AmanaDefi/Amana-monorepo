import React, { useState, useEffect } from 'react';
import { MoonLoader } from 'react-spinners';
import { AiOutlineCheck, AiOutlineExclamation, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

// Transaction step status enum
enum TransactionStepStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  error = 'error',
  reverted = 'reverted',
}

// Transaction step feedback interface
interface TransactionStepFeedback {
  label: string;
  status: TransactionStepStatus;
  txHash?: string;
  stepDescription: string;
}

// Transaction step messages type
type TransactionStepMessages = {
  [key: string]: TransactionStepFeedback;
};

// Define the steps for the withdrawal simulation
const withdrawalSteps = [
  {
    name: 'Initial local transaction on Base',
    type: 'local',
    hash: '0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8',
    url: 'https://basescan.org/tx/0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8',
  },
  {
    name: 'Cross chain call from Base to vault on ZC',
    type: 'inboundToCctx',
    hash: '0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xff53be485baa2faca5eb760771a60067d6636fb6b5c18078815ded02234f19c8',
  },
  {
    name: 'Cross chain call from vault on ZC to strategy on strategy chain',
    type: 'inboundToCctx',
    hash: '0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7',
  },
  {
    name: 'Transaction on strategy chain',
    type: 'cctx',
    hash: '0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f',
  },
  {
    name: 'Cross chain call from strategy on strategy chain back to vault on ZC',
    type: 'inboundToCctx',
    hash: '0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50',
  },
  {
    name: 'Cross chain withdraw from vault on ZC to Base',
    type: 'inboundToCctx',
    hash: '0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37',
  },
];

// Define the steps for the deposit simulation
const depositSteps = [
  {
    name: 'Initial local transaction on Base',
    type: 'local',
    hash: '0xa786c5b510113c400dca53eda1d471d7711f38229c67bf83f30b7226de9b3459',
    url: 'https://basescan.org/tx/0xa786c5b510113c400dca53eda1d471d7711f38229c67bf83f30b7226de9b3459',
  },
  {
    name: 'Cross chain call from Base to Vault on Zetachain',
    type: 'inboundToCctx',
    hash: '0xb0184142ae8d8363cc2d755692a2aec5ec0da24db63b1db4232a65f8eb570e14',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xa786c5b510113c400dca53eda1d471d7711f38229c67bf83f30b7226de9b3459',
  },
  {
    name: 'Cross chain call from vault on ZC to strategy on strategy chain',
    type: 'inboundToCctx',
    hash: '0x1b5d83092e4c03a58c624f04056b128292cc99f16d4d58ef4ab287f63dbdbca6',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xb0184142ae8d8363cc2d755692a2aec5ec0da24db63b1db4232a65f8eb570e14',
  },
  {
    name: 'Transaction on Strategy chain',
    type: 'cctx',
    hash: '0xe0697bffd721fc54581d5b492a49041bc818d8e77fb403171899af372345db26',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0x1b5d83092e4c03a58c624f04056b128292cc99f16d4d58ef4ab287f63dbdbca6',
  },
  {
    name: 'Cross chain call from strategy back to vault on ZC',
    type: 'inboundToCctx',
    hash: '0x03f322f2524bccac8021bf642082a1cbe0bb708aa382078897c0a1dff23bbf82',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xe0697bffd721fc54581d5b492a49041bc818d8e77fb403171899af372345db26',
  },
];

// type4 RevertSteps
const revertSteps = [
  {
    name: 'Initial local transaction on Base',
    type: 'local',
    hash: '0x4e4e30d0b303d22bf83288a4e5104385247de0c19a0d4ad06abe55e324665549',
    url: 'https://basescan.org/tx/0x4e4e30d0b303d22bf83288a4e5104385247de0c19a0d4ad06abe55e324665549',
  },
  {
    name: 'Cross chain Tx from Base to Vault on Zetachain',
    type: 'inboundToCctx',
    hash: '0x859b5241ccc9fbacb7aadc834eacddc2ecfc14d0927055935b624a6639eaad19',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x4e4e30d0b303d22bf83288a4e5104385247de0c19a0d4ad06abe55e324665549',
  },
  {
    name: 'Cross chain call from vault on ZC to strategy on strategy chain',
    type: 'inboundToCctx',
    hash: '0xf84f7b31546317e169f0671c634389adfc33be1d8a1a1db9eda1a34d39673a2f',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x859b5241ccc9fbacb7aadc834eacddc2ecfc14d0927055935b624a6639eaad19',
  }
];

// type2 cRevertSteps 
const type2RevertSteps = [
  {
    name: 'Initial local transaction on ZC',
    type: 'local',
    hash: '0xd2a9c2ab83a66605e5b12b6abb6b075c96d99959c4d008db99aee1e1792ed607',
    url: 'https://explorer.zetachain.com/evm/tx/0xd2a9c2ab83a66605e5b12b6abb6b075c96d99959c4d008db99aee1e1792ed607',
  },
  {
    name: 'Cross chain Tx from Zetachain to Vault on Non-Zetachain (Result Details)',
    type: 'inboundToCctxWithResult',
    hash: '0xd2a9c2ab83a66605e5b12b6abb6b075c96d99959c4d008db99aee1e1792ed607',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xd2a9c2ab83a66605e5b12b6abb6b075c96d99959c4d008db99aee1e1792ed607',
    cctxUrl: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/0x0a2f76fe2a2d012e634ac67d590812b623e4f7c47f3bbd9ec92f7fba863740b2',
    cctxHash: '0x0a2f76fe2a2d012e634ac67d590812b623e4f7c47f3bbd9ec92f7fba863740b2',
  }
];

// type4WithdrawalRevertSteps
const type4WithdrawalRevertSteps = [
  {
    name: 'Initial local transaction on Base',
    type: 'local',
    hash: '0xabe92fa1589b3cb15fd0eccfb1dd295a4e1c1474490b4dc46499ee37e9cff610',
    url: 'https://basescan.org/tx/0xabe92fa1589b3cb15fd0eccfb1dd295a4e1c1474490b4dc46499ee37e9cff610',
  },
  {
    name: 'Cross chain call from Base to vault on ZC',
    type: 'inboundToCctx',
    hash: '0x205dae7720987d4a32aad8156c4f4e810f9e16f404fb1f5b2b271382f1edfc85',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0xabe92fa1589b3cb15fd0eccfb1dd295a4e1c1474490b4dc46499ee37e9cff610',
  },
  {
    name: 'Cross chain call from vault on ZC to strategy on strategy chain',
    type: 'inboundToCctx',
    hash: '0xfd419e7d3fc5fd5ba35b65c96e594c3186ac3acdbf4732d5441fdefc1b8f9f91',
    url: 'https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctx/0x205dae7720987d4a32aad8156c4f4e810f9e16f404fb1f5b2b271382f1edfc85',
  }
];

interface SimulationResult {
  step: string;
  hash: string;
  cctxUrl?: string;
  status: string;
  data: any;
}

interface CrossChainTransactionSimulatorProps {
  type: 'deposit' | 'withdrawal' | 'revert' | 'type2Revert' | 'type4WithdrawalRevert';
}

export default function CrossChainTransactionSimulator({ type }: CrossChainTransactionSimulatorProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const steps = type === 'deposit' ? depositSteps : 
                type === 'withdrawal' ? withdrawalSteps : 
                type === 'revert' ? revertSteps :
                type === 'type2Revert' ? type2RevertSteps :
                type4WithdrawalRevertSteps;

  const resetSimulation = () => {
    setCurrentStep(0);
    setResults([]);
    setError(null);
    setLoading(false);
    setStarted(false);
    setFinished(false);
  };

  // Helper function to check for revert with second outbound param
  function isRevertWithSecondOutbound(cctxData: any): boolean {
    const status = cctxData?.CrossChainTx?.cctx_status?.status;
    const outboundParams = cctxData?.CrossChainTx?.outbound_params;
    return (
      status === 'Reverted' &&
      Array.isArray(outboundParams) &&
      outboundParams.length > 1 &&
      !!outboundParams[1]?.hash
    );
  }

  const runAllSteps = async () => {
    setStarted(true);
    setLoading(true);
    setError(null);
    setResults([]);
    setCurrentStep(0);
    setFinished(false);
    for (let i = 0; i < steps.length; i++) {
      try {
        let data: any = null;
        let cctxHash = steps[i].hash;
        let cctxData: any = null;
        if (steps[i].type === 'local') {
          data = { status: 'LocalTx' };
          setResults((prev) => [...prev, { step: steps[i].name, hash: steps[i].hash, cctxUrl: steps[i].url, status: TransactionStepStatus.completed, data }]);
        } else if (steps[i].type === 'inboundToCctxWithResult') {
          // Step 2: fetch inboundHashToCctx, then cctx, and show result in the same step
          const inboundRes = await axios.get(steps[i].url);
          const cctxIndex = inboundRes.data?.inboundHashToCctx?.cctx_index?.[0] || ("cctxHash" in steps[i] ? (steps[i] as any).cctxHash : undefined);
          if (!cctxIndex) throw new Error('No cctx_index found for this step');
          const cctxUrl = `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/cctx/${cctxIndex}`;
          const cctxRes = await axios.get(cctxUrl);
          cctxData = cctxRes.data;
          const status = cctxData?.CrossChainTx?.cctx_status?.status;
          if (status === 'OutboundMined') {
            setResults((prev) => [...prev, { step: steps[i].name, hash: cctxIndex, cctxUrl, status: TransactionStepStatus.completed, data: { inbound: inboundRes.data, cctx: cctxData } }]);
          } else if (isRevertWithSecondOutbound(cctxData) || status === 'Reverted' || status === 'Aborted') {
            setResults((prev) => [...prev, { step: steps[i].name, hash: cctxIndex, cctxUrl, status: TransactionStepStatus.reverted, data: { inbound: inboundRes.data, cctx: cctxData } }]);
            setCurrentStep(i + 1);
            setError(`Transaction reverted at step "${steps[i].name}": Revert detected (hash: ${cctxData.CrossChainTx.outbound_params?.[1]?.hash || cctxData.CrossChainTx.outbound_params?.[0]?.hash})`);
            setLoading(false);
            setFinished(false);
            return;
          } else {
            throw new Error(`Unexpected status: ${status}`);
          }
          data = { inbound: inboundRes.data, cctx: cctxData };
          cctxHash = cctxIndex;
        } else if (steps[i].type === 'inboundToCctx') {
          const inboundRes = await axios.get(steps[i].url);
          const cctxIndex = inboundRes.data?.inboundHashToCctx?.cctx_index?.[0];
          if (!cctxIndex) throw new Error('No cctx_index found for this step');
          const cctxUrl = `${process.env.NEXT_PUBLIC_BLOCKPI_URL}/cctx/${cctxIndex}`;
          const cctxRes = await axios.get(cctxUrl);
          cctxData = cctxRes.data;
          const status = cctxData?.CrossChainTx?.cctx_status?.status;
          if (status === 'OutboundMined') {
            setResults((prev) => [...prev, { step: steps[i].name, hash: cctxIndex, cctxUrl, status: TransactionStepStatus.completed, data: { inbound: inboundRes.data, cctx: cctxData } }]);
          } else if (isRevertWithSecondOutbound(cctxData)) {
            setResults((prev) => [...prev, { step: steps[i].name, hash: cctxIndex, cctxUrl, status: TransactionStepStatus.reverted, data: { inbound: inboundRes.data, cctx: cctxData } }]);
            setCurrentStep(i + 1);
            setError(`Transaction reverted at step "${steps[i].name}": Revert detected (hash: ${cctxData.CrossChainTx.outbound_params[1].hash})`);
            setLoading(false);
            setFinished(false);
            return;
          } else {
            throw new Error(`Unexpected status: ${status}`);
          }
          data = { inbound: inboundRes.data, cctx: cctxData };
          cctxHash = cctxIndex;
        } else if (steps[i].type === 'cctx') {
          const cctxRes = await axios.get(steps[i].url);
          cctxData = cctxRes.data;
          const status = cctxData?.CrossChainTx?.cctx_status?.status;
          const cctxUrl = steps[i].url;
          if (status === 'OutboundMined') {
            setResults((prev) => [...prev, { step: steps[i].name, hash: steps[i].hash, cctxUrl, status: TransactionStepStatus.completed, data: { cctx: cctxData } }]);
          } else if (isRevertWithSecondOutbound(cctxData)) {
            setResults((prev) => [...prev, { step: steps[i].name, hash: steps[i].hash, cctxUrl, status: TransactionStepStatus.reverted, data: { cctx: cctxData } }]);
            setCurrentStep(i + 1);
            setError(`Transaction reverted at step "${steps[i].name}": Revert detected (hash: ${cctxData.CrossChainTx.outbound_params[1].hash})`);
            setLoading(false);
            setFinished(false);
            return;
          } else {
            throw new Error(`Unexpected status: ${status}`);
          }
          data = { cctx: cctxData };
        }
        if (steps[i].type === 'local') {
          // already set above
        }
        setCurrentStep(i + 1);
        await new Promise((resolve) => setTimeout(resolve, 1200)); // short delay for UX
      } catch (err) {
        let message = 'Unknown error';
        if (err instanceof Error) message = err.message;
        else if (typeof err === 'string') message = err;
        setError(`Error at step "${steps[i].name}": ${message}`);
        setLoading(false);
        setFinished(false);
        return;
      }
    }
    setLoading(false);
    setFinished(true);
  };

  // Helper to get step status
  const getStepStatus = (idx: number): TransactionStepStatus => {
    if (error && currentStep === idx && results[idx]?.status === TransactionStepStatus.reverted) return TransactionStepStatus.reverted;
    if (error && currentStep === idx) return TransactionStepStatus.error;
    if (idx < currentStep) return TransactionStepStatus.completed;
    if (idx === currentStep && loading && !finished) return TransactionStepStatus.processing;
    return TransactionStepStatus.pending;
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg max-w-2xl mx-auto">
      <h2 className="text-white text-3xl font-bold mb-2">
        {type === 'deposit' ? 'Type 4 Deposit Success Simulation' : 
         type === 'withdrawal' ? 'Type 4 Withdrawal Success Simulation' :
         type === 'revert' ? 'Type 4 Deposit Revert Simulation' :
         type === 'type2Revert' ? 'Type 2 Deposit Revert Simulation' :
         'Type 4 Withdrawal Revert Simulation'}
      </h2>
      {!started && (
        <button
          onClick={runAllSteps}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors self-center text-lg font-semibold shadow"
        >
          {type === 'deposit' ? 'Deposit' : 
           type === 'withdrawal' ? 'Withdraw' :
           type === 'revert' ? 'Simulate Revert' :
           type === 'type2Revert' ? 'Simulate Type 2 Revert' :
           'Simulate Type 4 Withdrawal Revert'}
        </button>
      )}
      {loading && (
        <div className="flex items-center gap-2 justify-center text-blue-300 text-lg font-medium animate-pulse">
          <AiOutlineLoading3Quarters className="animate-spin" size={22} />
          Processing transaction...
        </div>
      )}
      {error && (
        <div className="text-red-400 bg-red-900 p-4 rounded-xl font-semibold flex flex-col items-center">
          <AiOutlineExclamation className="text-red-500 mb-1" size={28} />
          <p>{error}</p>
          <button onClick={resetSimulation} className="mt-3 px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">Restart</button>
        </div>
      )}
      <ul className="mt-2 flex flex-col gap-4">
        {steps.map((step, i) => {
          const status = results[i]?.status || getStepStatus(i);
          return (
            <li
              key={i}
              className={`p-4 rounded-xl shadow flex flex-col gap-1 border transition-all duration-300
                ${status === TransactionStepStatus.completed ? 'bg-green-900/40 border-green-500' : ''}
                ${status === TransactionStepStatus.processing ? 'bg-yellow-900/40 border-yellow-400' : ''}
                ${status === TransactionStepStatus.error ? 'bg-red-900/40 border-red-500' : ''}
                ${status === TransactionStepStatus.pending ? 'bg-gray-800/60 border-gray-700' : ''}
                ${currentStep === i && !finished ? 'ring-2 ring-yellow-400' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                {status === TransactionStepStatus.completed && <AiOutlineCheck className="text-green-400" size={20} />}
                {status === TransactionStepStatus.processing && <AiOutlineLoading3Quarters className="text-yellow-400 animate-spin" size={20} />}
                {status === TransactionStepStatus.error && <AiOutlineExclamation className="text-red-400" size={20} />}
                <span className={`font-semibold text-lg ${status === TransactionStepStatus.completed ? 'text-green-200' : status === TransactionStepStatus.processing ? 'text-yellow-200' : status === TransactionStepStatus.error ? 'text-red-200' : 'text-white'}`}>{step.name}</span>
              </div>
              <div className="text-xs text-gray-300 break-all"><span className="font-semibold">Hash:</span> {results[i]?.hash || step.hash}</div>
              <div className="text-xs text-blue-300 break-all">
                {results[i]?.cctxUrl && (
                  <>
                    <span className="font-semibold">URL:</span> <a href={results[i].cctxUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">{results[i].cctxUrl}</a>
                  </>
                )}
              </div>
              <div className={`text-xs font-semibold mt-1 ${
                status === TransactionStepStatus.completed ? 'text-green-400' :
                status === TransactionStepStatus.processing ? 'text-yellow-300' :
                status === TransactionStepStatus.error ? 'text-red-400' :
                status === TransactionStepStatus.reverted ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {status === TransactionStepStatus.completed && 'Step completed'}
                {status === TransactionStepStatus.processing && 'Processing...'}
                {status === TransactionStepStatus.error && 'Step failed'}
                {status === TransactionStepStatus.reverted && 'Step failed: Transaction reverted. Please restart the process.'}
                {status === TransactionStepStatus.pending && 'Waiting...'}
              </div>
            </li>
          );
        })}
      </ul>
      {finished && !error && (
        <div className="text-center text-green-400 mt-6 text-xl font-bold flex flex-col items-center gap-2">
          <AiOutlineCheck className="text-green-400" size={32} />
          {type === 'deposit' ? 'Deposit' : 
           type === 'withdrawal' ? 'Withdrawal' :
           type === 'revert' ? 'Revert Simulation' :
           type === 'type2Revert' ? 'Type 2 Revert Simulation' :
           'Type 4 Withdrawal Revert Simulation'} completed successfully!
          <button onClick={resetSimulation} className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold">Test Again</button>
        </div>
      )}
    </div>
  );
} 