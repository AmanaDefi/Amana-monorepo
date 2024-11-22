import { VaultData } from "@/types/types";
import { Account } from "thirdweb/wallets";
import React, { useEffect, useState } from "react";
import { Address, getContract } from "thirdweb";
import { getBalance } from "thirdweb/extensions/erc20";
import { client } from "../utils/client";
import { useActiveWalletChain } from "thirdweb/react";

const DepositModal: React.FC<{
  isOpen: boolean;
  closeModal: () => void;
  transactionAmount: string;
  setTransactionAmount: (value: string) => void;
  handleDeposit: () => void;
  activeAccount: Account | null;
  selectedVault: VaultData | null;
  isProcessing: boolean;
}> = ({
  isOpen,
  closeModal,
  transactionAmount,
  setTransactionAmount,
  handleDeposit,
  activeAccount,
  selectedVault,
  isProcessing,
}) => {
    const [tokenBalance, setTokenBalance] = useState<string>("0");
    const activeChain = useActiveWalletChain();
    if (!activeChain) {
      throw new Error("No active chain found");
    }
    // Fetch the input token balance for the selected vault
    useEffect(() => {
      if (selectedVault && activeAccount) {
        const fetchTokenBalance = async () => {
          const contract = getContract({
            client,
            chain: activeChain,
            address: selectedVault.inputToken.address as Address,
          });
          const { value, decimals } = await getBalance({
            contract,
            address: activeAccount.address as Address,
          });
          setTokenBalance((Number(value) / Number(10 ** selectedVault.inputToken.decimals)).toString() || "0");
        };
        fetchTokenBalance();
      }
    }, [selectedVault, activeAccount]);

    if (!isOpen || !selectedVault) return null;

    const isAmountValid =
      Number(transactionAmount) > 0 &&
      Number(transactionAmount) <= Number(tokenBalance);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 w-full max-w-lg shadow-lg">
          {/* Modal header */}
          <h2 className="text-2xl font-semibold mb-6 text-center text-gray-700">Deposit</h2>

          {/* Input for deposit/withdraw amount */}
          <div className="flex gap-4">
            <div className="flex flex-col flex-1">
              <p className="font-normal text-gray-500">From Wallet</p>
              <button className="bg-gray-400 rounded-lg p-2 text-left">{selectedVault.inputToken.symbol}</button>
              <p className="text-sm text-black font-light mt-1">
                You have {Number(tokenBalance)}{" "}
                {selectedVault.inputToken.symbol}
              </p>
            </div>

            <div className="flex flex-col flex-1">
              <p className="font-normal text-gray-500">Amount</p>
              <div className="flex border border-gray-300 rounded-lg p-1">
                <input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full px-2 text-gray-800 focus:outline-none bg-transparent"
                />
                <button
                  className="bg-gray-400 h-fit p-1 rounded-md text-black"
                  onClick={() => setTransactionAmount(tokenBalance)}
                >
                  Max
                </button>
              </div>
              <p className="text-sm text-black font-light mt-1">
                ${Number(transactionAmount).toFixed(2)}
              </p>
              {!isAmountValid && (
                <p className="text-sm text-red-500 mt-1">
                  Insufficient {selectedVault.inputToken.symbol} balance
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={() => {
                setTransactionAmount("1");
                closeModal();
              }}
              className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleDeposit}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={isProcessing || !isAmountValid}
            >
              {isProcessing ? (
                <div className="spinner-border animate-spin border-2 rounded-full w-4 h-4 border-white border-t-transparent"></div>
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

export default DepositModal;
