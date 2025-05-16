import React, { useState, useEffect } from 'react';
import { MoonLoader } from 'react-spinners';
import { AiOutlineCheck, AiOutlineExclamation } from 'react-icons/ai';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

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

// Action enum for transaction steps
enum Action {
  // Initial local transaction
  withdraw = 'withdraw',
  withdrawconfirmed = 'withdrawconfirmed',
  
  // Cross chain call from Base to vault on ZC
  crosschainInvest = 'crosschainInvest',
  
  // Cross chain call from vault on ZC to strategy
  FundsInvest = 'FundsInvest',
  
  // Transaction on strategy chain
  strategyTransaction = 'strategyTransaction',
  
  // Cross chain call from strategy back to vault
  DivestSent = 'DivestSent',
  
  // Cross chain withdraw from vault to Base
  ReturnFundsToUserSent = 'ReturnFundsToUserSent',
  
  // Error states
  CrossChainWithdrawFailed = 'CrossChainWithdrawFailed',
  InvestConfirmFailed = 'InvestConfirmFailed'
}

interface CrossChainTransactionSimulatorProps {
  initialTxHash: string;
  onComplete?: () => void;
}

export default function CrossChainTransactionSimulator({
  initialTxHash,
  onComplete
}: CrossChainTransactionSimulatorProps) {
  // State for tracking transaction progress
  const [transactionStepFeedback, setTransactionStepFeedback] = useState<TransactionStepMessages>({});
  const [isTransactionProcessing, setIsTransactionProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<Action>(Action.withdraw);
  const [finishedTransaction, setFinishedTransaction] = useState(false);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | undefined>(undefined);
  const [currentStatus, setCurrentStatus] = useState<string>('In Progress');

  const resetSimulation = () => {
    setTransactionStepFeedback({});
    setIsTransactionProcessing(false);
    setCurrentStep(Action.withdraw);
    setFinishedTransaction(false);
    setSimulationStarted(false);
    setCurrentTxHash(undefined);
    setCurrentStatus('In Progress');
  };

  const startSimulation = () => {
    setSimulationStarted(true);
    setIsTransactionProcessing(true);
    setCurrentStatus('In Progress');
    setCurrentTxHash(initialTxHash);
  };

  // Simulate transaction flow
  useEffect(() => {
    if (!simulationStarted || !initialTxHash) return;

    setTransactionStepFeedback({
      [Action.withdraw]: {
        label: 'Initial withdraw transaction on local chain completed',
        status: TransactionStepStatus.completed,
        txHash: initialTxHash,
        stepDescription: 'Step 1 => Initial local transaction'
      },
      [Action.withdrawconfirmed]: {
        label: 'Cross chain request to vault in progress',
        status: TransactionStepStatus.processing,
        stepDescription: 'Step 2 => Cross chain call from Base to vault on ZC'
      }
    });
    setCurrentTxHash(initialTxHash);
    setCurrentStep(Action.withdrawconfirmed);

    // Step 2
    setTimeout(() => {
      setTransactionStepFeedback(prev => ({
        ...prev,
        [Action.withdrawconfirmed]: {
          label: 'Cross chain request to vault completed',
          status: TransactionStepStatus.completed,
          txHash: '0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7',
          stepDescription: 'Step 2 => Cross chain call from Base to vault on ZC'
        },
        [Action.crosschainInvest]: {
          label: 'Cross chain withdrawal from vault in progress',
          status: TransactionStepStatus.processing,
          stepDescription: 'Step 3 => Cross chain call from vault on ZC to strategy'
        }
      }));
      setCurrentTxHash('0x5fcecb507982bd2e18b2b435aabc74b69183005a1ae94e864bb9aa72fa020dc7');
      setCurrentStep(Action.crosschainInvest);
    }, 10000);

    // Step 3
    setTimeout(() => {
      setTransactionStepFeedback(prev => ({
        ...prev,
        [Action.crosschainInvest]: {
          label: 'Cross chain withdrawal from vault completed',
          status: TransactionStepStatus.completed,
          txHash: '0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f',
          stepDescription: 'Step 3 => Cross chain call from vault on ZC to strategy'
        },
        [Action.FundsInvest]: {
          label: 'Transaction on strategy chain in progress',
          status: TransactionStepStatus.processing,
          stepDescription: 'Step 4 => Transaction on strategy chain'
        }
      }));
      setCurrentTxHash('0xe4d6cc027bf4b5e82488111267cb3b91f725fc08b475e8dad0941d331c72541f');
      setCurrentStep(Action.FundsInvest);
    }, 20000);

    // Step 4
    setTimeout(() => {
      setTransactionStepFeedback(prev => ({
        ...prev,
        [Action.FundsInvest]: {
          label: 'Transaction on strategy chain completed',
          status: TransactionStepStatus.completed,
          txHash: '0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50',
          stepDescription: 'Step 4 => Transaction on strategy chain'
        },
        [Action.DivestSent]: {
          label: 'Divestment of funds from strategy in progress',
          status: TransactionStepStatus.processing,
          stepDescription: 'Step 5 => Cross chain call from strategy back to vault'
        }
      }));
      setCurrentTxHash('0x95cc0cb8806235d00c9dcb3a41602c63e755201156941fb646a0e46d685b3a50');
      setCurrentStep(Action.DivestSent);
    }, 30000);

    // Step 5
    setTimeout(() => {
      setTransactionStepFeedback(prev => ({
        ...prev,
        [Action.DivestSent]: {
          label: 'Divestment completed',
          status: TransactionStepStatus.completed,
          txHash: '0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37',
          stepDescription: 'Step 5 => Cross chain call from strategy back to vault'
        },
        [Action.ReturnFundsToUserSent]: {
          label: 'Return of funds to user in progress',
          status: TransactionStepStatus.processing,
          stepDescription: 'Step 6 => Cross chain withdraw from vault to Base'
        }
      }));
      setCurrentTxHash('0xac069e02538d032937c3498487486563b62f2057bfc856b0ab974083b1786e37');
      setCurrentStep(Action.ReturnFundsToUserSent);
    }, 40000);

    // Step 6
    setTimeout(() => {
      setTransactionStepFeedback(prev => ({
        ...prev,
        [Action.ReturnFundsToUserSent]: {
          label: 'Withdrawal completed successfully',
          status: TransactionStepStatus.completed,
          txHash: '0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579',
          stepDescription: 'Step 6 => Cross chain withdraw from vault to Base'
        }
      }));
      setCurrentTxHash('0xe2002861045fe4e627ce511f96cce55f1e7a9ab016fe818b8c64a60f0252f579');
      setFinishedTransaction(true);
      setIsTransactionProcessing(false);
      setCurrentStatus('Completed');
      onComplete?.();
    }, 50000);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationStarted, initialTxHash, onComplete]);

  // Find the latest completed step for details
  const latestStep = Object.entries(transactionStepFeedback)
    .reverse()
    .find(([_, feedback]) => feedback.txHash);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 rounded-lg">
      <h2 className="text-white text-2xl font-bold">Transaction Progress</h2>

      {/* Start Button */}
      {!simulationStarted && (
        <button
          onClick={startSimulation}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors self-center"
        >
          Start Withdrawal
        </button>
      )}

      {/* Transaction Steps */}
      {simulationStarted && (
        <div className="flex flex-col gap-4">
          {Object.entries(transactionStepFeedback).map(([action, feedback]) => (
            <div key={action} className="flex items-start gap-3">
              {/* Status Icon */}
              <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center">
                {feedback.status === TransactionStepStatus.pending && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full animate-[ping_1.5s_ease-in-out_infinite]" />
                )}
                {feedback.status === TransactionStepStatus.processing && (
                  <MoonLoader color="yellow" size={18} speedMultiplier={0.3} />
                )}
                {feedback.status === TransactionStepStatus.completed && (
                  <AiOutlineCheck className="text-green-400" size={16} />
                )}
                {feedback.status === TransactionStepStatus.error && (
                  <AiOutlineExclamation className="text-red-600" size={16} />
                )}
              </div>

              {/* Step Details */}
              <div className="flex-1">
                <p className="text-white font-medium">{feedback.label}</p>
                <p className="text-gray-500 text-xs mb-1">{feedback.stepDescription}</p>
                {/* Show Tx Hash as visible text if present */}
                {feedback.txHash && (
                  <div className="text-gray-400 text-xs mt-1">
                    Tx Hash: <span className="break-all">{feedback.txHash}</span>
                  </div>
                )}
                {/* Transaction Hash Link */}
                {feedback.txHash && (
                  <a
                    href={`https://basescan.org/tx/${feedback.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm mt-1"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    View Transaction
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isTransactionProcessing && !finishedTransaction && simulationStarted && (
        <div className="text-center text-gray-400 mt-4">
          Processing transaction...
        </div>
      )}

      {/* Completion Message */}
      {finishedTransaction && simulationStarted && (
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="text-center text-green-400">
            Transaction completed successfully!
          </div>
          <button
            onClick={resetSimulation}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Test Again
          </button>
        </div>
      )}

      {/* Transaction Details */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h3 className="text-white text-lg font-semibold mb-2">Transaction Details</h3>
        <div className="text-gray-300 text-sm">
          <div className="mb-1">
            <span className="font-semibold">Initial Transaction Hash:</span>
            <span className="ml-2 break-all">{initialTxHash}</span>
          </div>
          <div>
            <span className="font-semibold">Status:</span>
            <span className="ml-2">{currentStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 