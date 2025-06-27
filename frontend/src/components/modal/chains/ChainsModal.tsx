import React, { useState, useMemo, useEffect, useCallback } from "react";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { Modal } from "../base/Modal";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import {
  SUPPORTED_CHAINS,
  CHAIN_ICONS,
  APPROVED_TOKENS,
} from "@/constants/chainConfig";
import { Token, VaultData } from "@/types/types";
import { Chain } from "viem";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import TokenIcon from "@/components/common/TokenIcon";

interface ChainsModalProps {
  vaultData?: VaultData;
}

const ChainsModal = ({ vaultData: propVaultData }: ChainsModalProps) => {
  const {
    isOpen,
    closeModal,
    selectedChainFromModal,
    selectedTokenFromModal,
    onSelectChainCallback,
    onSelectChainAndTokenCallback,
    isFromTopUpForModal,
    vaultDataForModal,
    setSelectedChainFromModal,
    setSelectedTokenFromModal,
  } = useChainTokenModalStore();

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedChainLocal, setSelectedChainLocal] = useState<Chain | null>(
    selectedChainFromModal || null,
  );
  const [selectedTokenLocal, setSelectedTokenLocal] = useState<Token | null>(
    selectedTokenFromModal || null,
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedChainLocal(
        selectedChainFromModal || SUPPORTED_CHAINS[0].chain,
      );
      setSelectedTokenLocal(selectedTokenFromModal || null);
      setSearchQuery("");
    }
  }, [isOpen, selectedChainFromModal, selectedTokenFromModal]);

  const getTokensForChain = useCallback(
    (chain: Chain): Token[] => {
      const currentVaultData = vaultDataForModal || propVaultData;

      if (chain.id === 7000 || chain.id === 7001) {
        return currentVaultData?.inputToken
          ? [currentVaultData.inputToken]
          : [];
      }
      return APPROVED_TOKENS[chain.id] || [];
    },
    [vaultDataForModal, propVaultData],
  );

  const availableTokens = useMemo(() => {
    if (!selectedChainLocal) return [];
    return getTokensForChain(selectedChainLocal);
  }, [selectedChainLocal, getTokensForChain]);

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return availableTokens;

    const query = searchQuery.toLowerCase();
    return availableTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query),
    );
  }, [availableTokens, searchQuery]);

  const handleTokenSelect = (token: Token) => {
    if (selectedChainLocal) {
      setSelectedTokenLocal(token);
      setSelectedTokenFromModal(token);

      if (onSelectChainAndTokenCallback) {
        onSelectChainAndTokenCallback(selectedChainLocal, token);
      } else if (onSelectChainCallback) {
        onSelectChainCallback(selectedChainLocal);
      }
      closeModal();
    }
  };

  const handleChainOnlySelect = (chain: Chain) => {
    setSelectedChainLocal(chain);
    setSelectedChainFromModal(chain);

    if (onSelectChainAndTokenCallback) {
      setSelectedTokenLocal(null);
      setSelectedTokenFromModal(null);
    } else if (onSelectChainCallback) {
      setSelectedTokenLocal(null);
      setSelectedTokenFromModal(null);
      onSelectChainCallback(chain);
      closeModal();
    }
  };

  const isTokenSelected = (token: Token) => {
    return (
      selectedTokenLocal?.address?.toLowerCase() ===
        token.address.toLowerCase() &&
      selectedTokenLocal?.chainId === token.chainId
    );
  };

  const chainList = isFromTopUpForModal
    ? SUPPORTED_CHAINS.slice(1)
    : SUPPORTED_CHAINS;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      paddingClass="pt-[50px] pl-[45px] pr-[36px] pb-[50px]"
      roundedClass="rounded-[24px]"
      maxWidth="max-w-[760px]"
      minHeight="min-h-[714px]"
      customCloseButton={
        <button
          onClick={closeModal}
          className="absolute top-[20px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10 hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      }
    >
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-white text-[24px] font-normal leading-none"
            style={{
              fontWeight: 400,
              letterSpacing: "-0.04em",
            }}
          >
            From
          </h2>
        </div>

        <div className="w-full h-px bg-[#1D2A41] mb-6"></div>

        <div className="w-full flex gap-6">
          <div className="flex-1">
            <h3
              className="text-[#535E73] text-[24px] font-normal leading-none mb-3"
              style={{
                fontWeight: 400,
                letterSpacing: "-0.04em",
              }}
            >
              Chains
            </h3>

            <div className="flex flex-col gap-4">
              {chainList.map((chainConfig) => {
                const isSelected =
                  selectedChainLocal?.id === chainConfig.chain.id;
                return (
                  <button
                    key={chainConfig.chain.id}
                    onClick={() => handleChainOnlySelect(chainConfig.chain)}
                    className={`flex items-center gap-3 px-3 py-[10px] rounded-[8px] border transition-all ${
                      isSelected
                        ? "bg-[#0C1015] border-[#3E73C4]"
                        : "bg-transparent border-[#1D2A41] hover:bg-[#0C1015] hover:border-[#3E73C4] focus:bg-[#0C1015] focus:border-[#3E73C4]"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full overflow-hidden ${
                        isSelected ? "ring-1 ring-white" : ""
                      }`}
                    >
                      <img
                        src={CHAIN_ICONS[chainConfig.chain.id]?.url}
                        alt={chainConfig.chain.name}
                        className="w-full h-full object-cover"
                        width={20}
                        height={20}
                      />
                    </div>
                    <span
                      className="text-white text-[16px] font-normal"
                      style={{
                        fontWeight: 400,
                        letterSpacing: "-0.06em",
                      }}
                    >
                      {chainConfig.chain.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-px bg-[#1D2A41] flex-shrink-0 mx-10"></div>

          {onSelectChainAndTokenCallback ? (
            <div className="flex-1">
              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 py-2 bg-transparent border border-[#1D2A41] rounded-[8px] text-white placeholder-gray-400 focus:outline-none hover:bg-[#0C1015] hover:border-[#3E73C4] focus:bg-[#0C1015] focus:border-[#3E73C4] transition-all"
                    style={{
                      padding: "8px 10px",
                      paddingLeft: "40px",
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {!selectedChainLocal ? (
                  <div className="text-center text-gray-400 py-8">
                    Select a network first
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    {searchQuery
                      ? "No tokens found"
                      : "No tokens available for this network"}
                  </div>
                ) : (
                  filteredTokens.map((token) => {
                    const isSelected = isTokenSelected(token);
                    return (
                      <button
                        key={`${token.address}-${selectedChainLocal.id}`}
                        onClick={() => handleTokenSelect(token)}
                        className={`flex items-center gap-3 rounded-[8px] border transition-all ${
                          isSelected
                            ? "bg-[#0C1015] border-[#3E73C4]"
                            : "bg-transparent border-[#1D2A41] hover:bg-[#0C1015] hover:border-[#3E73C4] focus:bg-[#0C1015] focus:border-[#3E73C4]"
                        }`}
                        style={{
                          padding: "11px 12px",
                          width: "358px",
                          height: "64px",
                        }}
                      >
                        <div className="w-8 h-8 flex-shrink-0">
                          <TokenIcon
                            token={token}
                            icon={token.imgURL}
                            imageSize="w-8 h-8"
                          />
                        </div>
                        <div className="flex-1 text-left">
                          <div
                            className="text-white text-[16px] font-normal"
                            style={{
                              fontWeight: 400,
                            }}
                          >
                            {token.symbol}
                          </div>
                          <div
                            className="text-[#535E73] text-[16px] font-normal"
                            style={{
                              fontWeight: 400,
                              letterSpacing: "-0.06em",
                            }}
                          >
                            {selectedChainLocal?.name}
                          </div>
                        </div>
                        {token.balance && (
                          <div className="text-right">
                            <div
                              className="text-[#9A9CB3] text-[12px] font-normal"
                              style={{
                                fontWeight: 400,
                              }}
                            >
                              ${token.balance.formatted}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <p>Select a chain to see available tokens</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ChainsModal;
