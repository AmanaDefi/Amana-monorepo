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
  error = 'error'
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

interface SimulationResult {
  step: string;
  hash: string;
  url: string;
  status: string;
  data: any;
}

interface CrossChainTransactionSimulatorProps {
  type: 'deposit' | 'withdrawal';
}

export default function CrossChainTransactionSimulator({ type }: CrossChainTransactionSimulatorProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const steps = type === 'deposit' ? depositSteps : withdrawalSteps;

  const resetSimulation = () => {
    setCurrentStep(0);
    setResults([]);
    setError(null);
    setLoading(false);
    setStarted(false);
    setFinished(false);
  };

  // Sequentially run all steps
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
          console.log('[Simulation] Local step:', steps[i].name, 'Hash:', steps[i].hash);
          data = { status: 'LocalTx' };
        } else if (steps[i].type === 'inboundToCctx') {
          console.log('[Simulation] Fetching inboundHashToCctx:', steps[i].url);
          const inboundRes = await axios.get(steps[i].url);
          console.log('[Simulation] inboundHashToCctx response:', inboundRes.data);
          const cctxIndex = inboundRes.data?.inboundHashToCctx?.cctx_index?.[0];
          if (!cctxIndex) throw new Error('No cctx_index found for this step');
          const cctxUrl = `https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/cctx/${cctxIndex}`;
          console.log('[Simulation] Fetching cctx:', cctxUrl);
          const cctxRes = await axios.get(cctxUrl);
          console.log('[Simulation] cctx response:', cctxRes.data);
          cctxData = cctxRes.data;
          if (cctxData?.CrossChainTx?.cctx_status?.status !== 'OutboundMined') {
            throw new Error(`cctx_status.status is not OutboundMined (got: ${cctxData?.CrossChainTx?.cctx_status?.status})`);
          }
          data = { inbound: inboundRes.data, cctx: cctxData };
          cctxHash = cctxIndex;
        } else if (steps[i].type === 'cctx') {
          console.log('[Simulation] Fetching cctx:', steps[i].url);
          const cctxRes = await axios.get(steps[i].url);
          console.log('[Simulation] cctx response:', cctxRes.data);
          cctxData = cctxRes.data;
          if (cctxData?.CrossChainTx?.cctx_status?.status !== 'OutboundMined') {
            throw new Error(`cctx_status.status is not OutboundMined (got: ${cctxData?.CrossChainTx?.cctx_status?.status})`);
          }
          data = { cctx: cctxData };
        }
        setResults((prev) => [...prev, { step: steps[i].name, hash: cctxHash, url: steps[i].url, status: 'success', data }]);
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
  const getStepStatus = (idx: number) => {
    if (error && currentStep === idx) return 'error';
    if (idx < currentStep) return 'success';
    if (idx === currentStep && loading && !finished) return 'processing';
    return 'pending';
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg max-w-2xl mx-auto">
      <h2 className="text-white text-3xl font-bold mb-2">{type === 'deposit' ? 'Cross-Chain Deposit Simulation' : 'Cross-Chain Withdrawal Simulation'}</h2>
      {!started && (
        <button
          onClick={runAllSteps}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors self-center text-lg font-semibold shadow"
        >
          {type === 'deposit' ? 'Deposit' : 'Withdraw'}
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
          const status = getStepStatus(i);
          return (
            <li
              key={i}
              className={`p-4 rounded-xl shadow flex flex-col gap-1 border transition-all duration-300
                ${status === 'success' ? 'bg-green-900/40 border-green-500' : ''}
                ${status === 'processing' ? 'bg-yellow-900/40 border-yellow-400' : ''}
                ${status === 'error' ? 'bg-red-900/40 border-red-500' : ''}
                ${status === 'pending' ? 'bg-gray-800/60 border-gray-700' : ''}
                ${currentStep === i && !finished ? 'ring-2 ring-yellow-400' : ''}
              `}
            >
              <div className="flex items-center gap-2 mb-1">
                {status === 'success' && <AiOutlineCheck className="text-green-400" size={20} />}
                {status === 'processing' && <AiOutlineLoading3Quarters className="text-yellow-400 animate-spin" size={20} />}
                {status === 'error' && <AiOutlineExclamation className="text-red-400" size={20} />}
                <span className={`font-semibold text-lg ${status === 'success' ? 'text-green-200' : status === 'processing' ? 'text-yellow-200' : status === 'error' ? 'text-red-200' : 'text-white'}`}>{step.name}</span>
              </div>
              <div className="text-xs text-gray-300 break-all"><span className="font-semibold">Hash:</span> {results[i]?.hash || step.hash}</div>
              <div className="text-xs text-blue-300 break-all">
                <span className="font-semibold">URL:</span> <a href={step.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">{step.url}</a>
              </div>
              <div className={`text-xs font-semibold mt-1 ${status === 'success' ? 'text-green-400' : status === 'processing' ? 'text-yellow-300' : status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                {status === 'success' && 'Step completed'}
                {status === 'processing' && 'Processing...'}
                {status === 'error' && 'Step failed'}
                {status === 'pending' && 'Waiting...'}
              </div>
            </li>
          );
        })}
      </ul>
      {finished && !error && (
        <div className="text-center text-green-400 mt-6 text-xl font-bold flex flex-col items-center gap-2">
          <AiOutlineCheck className="text-green-400" size={32} />
          {type === 'deposit' ? 'Deposit' : 'Withdrawal'} completed successfully!
          <button onClick={resetSimulation} className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-semibold">Test Again</button>
        </div>
      )}
    </div>
  );
} 