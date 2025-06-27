import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { Modal } from "../base/Modal";
import { useChainTokenModalStore } from "@/store/chainTokenModalStore";
import {
  SUPPORTED_CHAINS,
  CHAIN_ICONS,
  APPROVED_TOKENS,
} from "@/constants/chainConfig";
import { Token, VaultData, Balance } from "@/types/types";
import { Chain } from "viem";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import TokenIcon from "@/components/common/TokenIcon";
import { useTokenBalanceForModal } from "@/hooks/useTokenBalanceForModal";
import { formatTokenBalance, getOnlyTokenSymbol } from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { MiniSpinner } from "@/components/PendingDots";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

const buttonVariants = {
  idle: { scale: 1 },
  hover: {
    scale: 0.98,
    zIndex: 30,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

const searchVariants = {
  focus: {
    scale: 1.02,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
    },
  },
  blur: {
    scale: 1,
    transition: {
      duration: 0.2,
    },
  },
};

interface ChainsModalProps {
  vaultData?: VaultData;
}

const TokenBalanceItem = React.memo(
  ({
    token,
    selectedChain,
    isSelected,
    onClick,
    onBalanceUpdate,
    refreshTrigger,
    index,
  }: {
    token: Token;
    selectedChain: Chain;
    isSelected: boolean;
    onClick: () => void;
    onBalanceUpdate: (
      token: Token,
      balance: Balance,
      price: number,
      isLoading: boolean,
    ) => void;
    refreshTrigger?: number;
    index: number;
  }) => {
    const { balance, isLoading } = useTokenBalanceForModal(
      token,
      refreshTrigger,
    );
    const price = useTokenPriceBySymbol(token.symbol) || 0;

    useEffect(() => {
      onBalanceUpdate(token, balance, price, isLoading);
    }, [balance, price, isLoading, token, onBalanceUpdate]);

    const balanceUSD = useMemo(() => {
      if (!balance || !price) return 0;
      return parseFloat(balance.formatted) * price;
    }, [balance, price]);

    const formattedBalance = balance
      ? formatTokenBalance(balance.formatted, token.symbol)
      : "0";

    return (
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
        custom={index}
        transition={{
          layout: { duration: 0.3, ease: "easeInOut" },
        }}
      >
        <motion.button
          onClick={onClick}
          variants={buttonVariants}
          initial="idle"
          whileHover="hover"
          whileTap="tap"
          animate={isSelected ? "selected" : "unselected"}
          className={`flex items-center gap-3 rounded-[8px] border transition-colors duration-200 ${
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
          <motion.div
            className="w-8 h-8 flex-shrink-0"
            whileHover={{ rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <TokenIcon token={token} icon={token.imgURL} imageSize="w-8 h-8" />
          </motion.div>
          <div className="flex-1 text-left">
            <motion.div
              className="text-white text-[16px] font-normal"
              style={{
                fontWeight: 400,
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              {getOnlyTokenSymbol(token.symbol)}
            </motion.div>
            <motion.div
              className="text-[#535E73] text-[16px] font-normal"
              style={{
                fontWeight: 400,
                letterSpacing: "-0.06em",
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 + 0.05 }}
            >
              {selectedChain?.name}
            </motion.div>
          </div>

          <motion.div
            className="text-right"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 + 0.1 }}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center justify-end"
                >
                  <MiniSpinner size={12} color="#9A9CB3" />
                </motion.div>
              ) : (
                <motion.div
                  key="balance"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div
                    className="text-white text-[14px] font-normal"
                    style={{
                      fontWeight: 400,
                    }}
                  >
                    {formattedBalance}
                  </div>
                  {balanceUSD > 0 && (
                    <motion.div
                      className="text-[#9A9CB3] text-[12px] font-normal"
                      style={{
                        fontWeight: 400,
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      ${balanceUSD.toFixed(2)}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.button>
      </motion.div>
    );
  },
);

TokenBalanceItem.displayName = "TokenBalanceItem";

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Стан для зберігання балансів всіх токенів
  const [tokenBalances, setTokenBalances] = useState<
    Map<
      string,
      {
        balance: Balance;
        price: number;
        isLoading: boolean;
      }
    >
  >(new Map());

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
      setTokenBalances(new Map());
      setRefreshTrigger((prev) => prev + 1);
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

  useEffect(() => {
    setTokenBalances(new Map());
    setRefreshTrigger((prev) => prev + 1);
  }, [selectedChainLocal]);

  const handleBalanceUpdate = useCallback(
    (token: Token, balance: Balance, price: number, isLoading: boolean) => {
      const tokenKey = token.address.toLowerCase();
      setTokenBalances((prev) => {
        const newMap = new Map(prev);
        newMap.set(tokenKey, { balance, price, isLoading });
        return newMap;
      });
    },
    [],
  );

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return availableTokens;

    const query = searchQuery.toLowerCase();
    return availableTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query),
    );
  }, [availableTokens, searchQuery]);

  const sortedTokens = useMemo(() => {
    return [...filteredTokens].sort((a, b) => {
      const keyA = a.address.toLowerCase();
      const keyB = b.address.toLowerCase();

      const dataA = tokenBalances.get(keyA);
      const dataB = tokenBalances.get(keyB);

      const balanceA =
        dataA?.balance && dataA?.price
          ? parseFloat(dataA.balance.formatted) * dataA.price
          : 0;
      const balanceB =
        dataB?.balance && dataB?.price
          ? parseFloat(dataB.balance.formatted) * dataB.price
          : 0;

      if (balanceA !== balanceB) {
        return balanceB - balanceA;
      }

      return a.symbol.localeCompare(b.symbol);
    });
  }, [filteredTokens, tokenBalances]);

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
      selectedTokenLocal?.address?.toLowerCase() === token.address.toLowerCase()
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
        <motion.button
          onClick={closeModal}
          className="absolute top-[20px] right-[16px] z-10 rounded-[8px] flex items-center justify-center w-10 h-10 hover:bg-gray-700 transition-colors"
          aria-label="Close"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <CloseModalIcon width={16} height={16} />
        </motion.button>
      }
    >
      <motion.div
        className="w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="mb-4 flex items-center justify-between"
          variants={itemVariants}
        >
          <h2
            className="text-white text-[24px] font-normal leading-none"
            style={{
              fontWeight: 400,
              letterSpacing: "-0.04em",
            }}
          >
            From
          </h2>
        </motion.div>

        <motion.div
          className="w-full h-px bg-[#1D2A41] mb-6"
          variants={itemVariants}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        />

        <motion.div className="w-full flex gap-6" variants={itemVariants}>
          <div className="flex-1">
            <motion.h3
              className="text-[#535E73] text-[24px] font-normal leading-none mb-3"
              style={{
                fontWeight: 400,
                letterSpacing: "-0.04em",
              }}
              variants={itemVariants}
            >
              Chains
            </motion.h3>

            <motion.div
              className="flex flex-col gap-4"
              variants={containerVariants}
            >
              {chainList.map((chainConfig, index) => {
                const isSelected =
                  selectedChainLocal?.id === chainConfig.chain.id;
                return (
                  <motion.div
                    key={chainConfig.chain.id}
                    variants={itemVariants}
                    custom={index}
                  >
                    <motion.button
                      onClick={() => handleChainOnlySelect(chainConfig.chain)}
                      variants={buttonVariants}
                      initial="idle"
                      whileHover="hover"
                      whileTap="tap"
                      animate={isSelected ? "selected" : "unselected"}
                      className={`flex items-center gap-3 px-3 py-[10px] rounded-[8px] border transition-colors duration-200 w-full ${
                        isSelected
                          ? "bg-[#0C1015] border-[#3E73C4]"
                          : "bg-transparent border-[#1D2A41] hover:bg-[#0C1015] hover:border-[#3E73C4] focus:bg-[#0C1015] focus:border-[#3E73C4]"
                      }`}
                    >
                      <motion.div
                        className={`w-5 h-5 rounded-full overflow-hidden ${
                          isSelected ? "ring-1 ring-white" : ""
                        }`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <img
                          src={CHAIN_ICONS[chainConfig.chain.id]?.url}
                          alt={chainConfig.chain.name}
                          className="w-full h-full object-cover"
                          width={20}
                          height={20}
                        />
                      </motion.div>
                      <span
                        className="text-white text-[16px] font-normal"
                        style={{
                          fontWeight: 400,
                          letterSpacing: "-0.06em",
                        }}
                      >
                        {chainConfig.chain.name}
                      </span>
                    </motion.button>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <motion.div
            className="w-px bg-[#1D2A41] flex-shrink-0 mx-10"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          />

          {onSelectChainAndTokenCallback ? (
            <motion.div className="flex-1" variants={itemVariants}>
              <motion.div className="mb-4" variants={itemVariants}>
                <div className="relative">
                  <motion.div
                    className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    whileHover={{ scale: 1.1 }}
                  >
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                  </motion.div>
                  <motion.input
                    type="text"
                    placeholder="Search tokens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    variants={searchVariants}
                    animate={isSearchFocused ? "focus" : "blur"}
                    className="w-full h-10 pl-10 pr-3 py-2 bg-transparent border border-[#1D2A41] rounded-[8px] text-white placeholder-gray-400 focus:outline-none hover:bg-[#0C1015] hover:border-[#3E73C4] focus:bg-[#0C1015] focus:border-[#3E73C4] transition-all"
                    style={{
                      padding: "8px 10px",
                      paddingLeft: "40px",
                    }}
                  />
                </div>
              </motion.div>

              <motion.div
                className="flex flex-col gap-2 h-full overflow-y-auto overflow-x-hidden"
                variants={containerVariants}
              >
                <AnimatePresence mode="wait">
                  {!selectedChainLocal ? (
                    <motion.div
                      key="no-chain"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-center text-gray-400 py-8"
                    >
                      Select a network first
                    </motion.div>
                  ) : sortedTokens.length === 0 ? (
                    <motion.div
                      key="no-tokens"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-center text-gray-400 py-8"
                    >
                      {searchQuery
                        ? "No tokens found"
                        : "No tokens available for this network"}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="tokens-list"
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      className="flex flex-col gap-2"
                    >
                      {sortedTokens.map((token, index) => (
                        <TokenBalanceItem
                          key={`${token.address}-${selectedChainLocal.id}`}
                          token={token}
                          selectedChain={selectedChainLocal}
                          isSelected={isTokenSelected(token)}
                          onClick={() => handleTokenSelect(token)}
                          onBalanceUpdate={handleBalanceUpdate}
                          refreshTrigger={refreshTrigger}
                          index={index}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              className="flex-1 flex items-center justify-center"
              variants={itemVariants}
            >
              <motion.div
                className="text-center text-gray-400"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p>Select a chain to see available tokens</p>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </Modal>
  );
};

export default ChainsModal;
