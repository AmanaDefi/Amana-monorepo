"use client";

import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormSetValue } from "react-hook-form";
import { z } from "zod";
import { Modal } from "../base/Modal";
import { motion, AnimatePresence } from "framer-motion";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import Button from "@/components/common/Button";
import { useState, useEffect, useMemo, useCallback } from "react";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import {
  CHAIN_ICONS,
  CHAIN_ID,
  chainConfigs,
  chainsWithCustomRpcs,
  APPROVED_TOKENS,
} from "@/constants/chainConfig";
import { useWallets } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";
import { Token, Balance } from "@/types/types";
import TokenIcon from "@/components/common/TokenIcon";
import { useMultichainTokenBalanceForModal } from "@/hooks/useMultichainTokenBalanceForModal";
import { formatTokenBalance, getOnlyTokenSymbol } from "@/utils/utils";
import { formatUSDAmount } from "@/utils/tokenFormat";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { MiniSpinner, BreathingValue } from "@/components/PendingDots";
import { useSendTransaction } from "@/hooks/useSendTransaction";
import { useMaxAmountSimple } from "@/hooks/useMaxAmount";
import { AmountInputField } from "./components/AmountInputField";

const getSendErrorMessage = (
  amount: string,
  selectedToken: Token | null,
  activeChain: any,
  tokenBalances: Map<
    string,
    { balance: Balance; price: number; isLoading: boolean }
  >,
  balance?: Balance,
): string => {
  const num = parseFloat(amount);

  if (!amount || isNaN(num) || num <= 0) {
    return "";
  }

  if (selectedToken && activeChain) {
    const tokenKey = `${selectedToken.address.toLowerCase()}-${activeChain?.id}`;
    const tokenData = tokenBalances.get(tokenKey);

    if (tokenData?.balance) {
      const tokenBalance = parseFloat(tokenData.balance.formatted);
      if (num > tokenBalance) {
        return `Not enough ${getOnlyTokenSymbol(selectedToken.symbol)} tokens. Available: ${tokenData.balance.formatted}`;
      }
    }
  } else {
    const userBalance = parseFloat(balance?.formatted || "0");
    if (num > userBalance) {
      return "Not enough tokens on your wallet";
    }
  }

  return "";
};

const sendSchema = z.object({
  recipientAddress: z
    .string()
    .min(1, "Wallet address is required")
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address format"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d*\.?\d*$/, "Amount must contain only numbers and decimal point")
    .refine((val) => {
      if (!val || val === "") return false;
      if (val === ".") return false;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, "Amount must be a positive number"),
  network: z.string().min(1, "Please select a network"),
  token: z.string().optional(),
});

type SendFormData = z.infer<typeof sendSchema>;

const SelectedTokenBalanceLoader = ({
  token,
  selectedChain,
  onBalanceUpdate,
}: {
  token: Token;
  selectedChain: any;
  onBalanceUpdate: (
    token: Token,
    balance: Balance,
    price: number,
    isLoading: boolean,
  ) => void;
}) => {
  const { balance, isLoading } = useMultichainTokenBalanceForModal(
    token,
    selectedChain,
  );
  const price = useTokenPriceBySymbol(token.symbol) || 0;

  useEffect(() => {
    onBalanceUpdate(token, balance, price, isLoading);
  }, [balance, price, isLoading, token, onBalanceUpdate]);

  return null;
};

const TokenBalanceItem = ({
  token,
  selectedChain,
  isSelected,
  onClick,
  onBalanceUpdate,
  index,
}: {
  token: Token;
  selectedChain: any;
  isSelected: boolean;
  onClick: () => void;
  onBalanceUpdate: (
    token: Token,
    balance: Balance,
    price: number,
    isLoading: boolean,
  ) => void;
  index: number;
}) => {
  const { balance, isLoading } = useMultichainTokenBalanceForModal(
    token,
    selectedChain,
  );
  const price = useTokenPriceBySymbol(token.symbol) || 0;

  useEffect(() => {
    onBalanceUpdate(token, balance, price, isLoading);
  }, [balance, price, isLoading, token, onBalanceUpdate]);

  const balanceUSD = useMemo(() => {
    if (!balance || !price) return 0;
    return parseFloat(balance.formatted) * price;
  }, [balance, price]);

  const formattedBalance = useMemo(() => {
    if (
      !balance ||
      balance.formatted === "0" ||
      parseFloat(balance.formatted) === 0
    ) {
      return `0 ${getOnlyTokenSymbol(token.symbol)}`;
    }
    const formatted = formatTokenBalance(balance.formatted, token.symbol);
    if (formatted.includes(getOnlyTokenSymbol(token.symbol))) {
      return formatted;
    }
    return `${formatted} ${getOnlyTokenSymbol(token.symbol)}`;
  }, [balance, token.symbol]);

  const displayUSDValue = useMemo(() => {
    if (
      !balance ||
      balance.formatted === "0" ||
      parseFloat(balance.formatted) === 0
    ) {
      return "$0.00";
    }

    if (balanceUSD > 0 && balanceUSD < 0.01) {
      return "<$0.01";
    }

    return `$${balanceUSD.toFixed(2)}`;
  }, [balanceUSD, balance]);

  return (
    <motion.button
      onClick={onClick}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        layout: { duration: 0.3, ease: "easeInOut" },
        delay: index * 0.03,
        duration: 0.2,
      }}
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center gap-3 rounded-[8px] border transition-colors duration-200 p-3 w-full ${
        isSelected
          ? "bg-[#0C1015] border-[#3E73C4]"
          : "bg-transparent border-[#1D2A41] hover:bg-[#0C1015] hover:border-[#3E73C4]"
      }`}
    >
      <div className="w-8 h-8 flex-shrink-0">
        <TokenIcon token={token} icon={token.imgURL} imageSize="w-8 h-8" />
      </div>
      <div className="flex-1 text-left">
        <div className="text-white text-[16px] font-normal">
          {getOnlyTokenSymbol(token.symbol)}
        </div>
        <div className="text-[#535E73] text-[14px] font-normal">
          {selectedChain?.name}
        </div>
      </div>
      <div className="text-right">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <MiniSpinner size={12} color="#9A9CB3" />
          ) : (
            <div>
              <div className="text-white text-[14px] font-normal">
                {formattedBalance}
              </div>
              <div className="text-[#9A9CB3] text-[12px] font-normal">
                {displayUSDValue}
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
};

export const Send = () => {
  const { step, closeAll, setLoading, setError } = useAuthStore();

  const [showNetworkSelection, setShowNetworkSelection] = useState(false);
  const [showTokenSelection, setShowTokenSelection] = useState(false);
  const [networkSearchQuery, setNetworkSearchQuery] = useState("");
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);

  const { walletAddress, activeChain, switchToChain, balance } =
    useMultiChain();
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const activePrivyEVMWallet = filteredWallets[0];
  const { connected: solanaConnected } = useWallet();

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

  const { sendTransaction: sendTransactionFromHook } = useSendTransaction({
    walletAddress,
    activeChain,
    selectedToken,
    privyEVMWallet: activePrivyEVMWallet,
    solanaConnected,
    setLoading,
    setError,
    onSuccess: () => {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        closeAll();
      }, 2000);
    },
  });

  const { isLoading: isGlobalLoading } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    trigger,
    reset,
  } = useForm<SendFormData>({
    resolver: zodResolver(sendSchema),
    mode: "onChange",
  });

  const { handleMaxClick, getMaxAmount } = useMaxAmountSimple(
    selectedToken,
    tokenBalances,
    activeChain,
    setValue,
  );

  const clearForm = useCallback(() => {
    reset({
      recipientAddress: "",
      amount: "",
      network: "",
      token: "",
    });
    setSelectedToken(null);
    setErrorMessage("");
    setShowNetworkSelection(false);
    setShowTokenSelection(false);
    setNetworkSearchQuery("");
    setTokenSearchQuery("");
    setTokenBalances(new Map());
    setIsSuccess(false);
  }, [reset]);

  const handleClose = useCallback(() => {
    clearForm();
    closeAll();
  }, [clearForm, closeAll]);

  useEffect(() => {
    if (step !== "send") {
      clearForm();
    }
  }, [step, clearForm]);

  const getTokensForChain = useCallback((chain: any): Token[] => {
    if (chain?.id === 7000 || chain?.id === 7001) {
      return APPROVED_TOKENS[chain.id] || [];
    }
    return APPROVED_TOKENS[chain.id] || [];
  }, []);

  const availableTokens = useMemo(() => {
    if (!activeChain) return [];
    return getTokensForChain(activeChain);
  }, [activeChain, getTokensForChain]);

  const displayTokens = useMemo(() => {
    let tokens = availableTokens;

    if (tokenSearchQuery) {
      const query = tokenSearchQuery.toLowerCase();
      tokens = tokens.filter(
        (token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query),
      );
    }

    if (activePrivyEVMWallet?.walletClientType === "privy") {
      return tokens.filter((token) => {
        const tokenKey = `${token.address.toLowerCase()}-${activeChain?.id}`;
        const tokenData = tokenBalances.get(tokenKey);

        if (tokenData?.isLoading) return true;

        return (
          tokenData?.balance && parseFloat(tokenData.balance.formatted) > 0
        );
      });
    }
    return tokens;
  }, [
    availableTokens,
    tokenSearchQuery,
    activePrivyEVMWallet?.walletClientType,
    tokenBalances,
    activeChain,
  ]);

  const sortedTokens = useMemo(() => {
    return [...displayTokens].sort((a, b) => {
      const keyA = `${a.address.toLowerCase()}-${activeChain?.id}`;
      const keyB = `${b.address.toLowerCase()}-${activeChain?.id}`;

      const dataA = tokenBalances.get(keyA);
      const dataB = tokenBalances.get(keyB);

      if (dataA?.isLoading && !dataB?.isLoading) return -1;
      if (!dataA?.isLoading && dataB?.isLoading) return 1;

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
  }, [displayTokens, tokenBalances, activeChain]);

  const handleBalanceUpdate = useCallback(
    (token: Token, balance: Balance, price: number, isLoading: boolean) => {
      const tokenKey = `${token.address.toLowerCase()}-${activeChain?.id}`;
      setTokenBalances((prev) => {
        const newMap = new Map(prev);
        newMap.set(tokenKey, { balance, price, isLoading });
        return newMap;
      });
    },
    [activeChain],
  );

  useEffect(() => {
    if (activeChain?.name) {
      setValue("network", activeChain?.name, { shouldValidate: true });
    }
  }, [activeChain, setValue]);

  useEffect(() => {
    if (activeChain?.name && !watch("network")) {
      setValue("network", activeChain?.name, { shouldValidate: true });
    }
  }, []);

  // reset token selection when network changes
  useEffect(() => {
    setSelectedToken(null);
    setValue("token", undefined, { shouldValidate: true });
    setTokenBalances(new Map());
  }, [activeChain, setValue]);

  // auto-select first token
  useEffect(() => {
    if (sortedTokens.length > 0 && !selectedToken && activeChain) {
      const firstToken = sortedTokens[0];
      setSelectedToken(firstToken);
      setValue("token", firstToken.symbol, { shouldValidate: true });
    } else if (sortedTokens.length === 0) {
      setSelectedToken(null);
      setValue("token", undefined, { shouldValidate: true });
    }
  }, [sortedTokens, selectedToken, setValue, activeChain]);

  useEffect(() => {
    if (selectedToken && activeChain && !showTokenSelection) {
      const tokenKey = `${selectedToken.address.toLowerCase()}-${activeChain?.id}`;
      const tokenData = tokenBalances.get(tokenKey);

      if (!tokenData) {
        console.log(
          "Loading balance for auto-selected token:",
          selectedToken.symbol,
        );
      }
    }
  }, [selectedToken, activeChain, tokenBalances, showTokenSelection]);

  useEffect(() => {
    const currentAmount = watch("amount");
    if (currentAmount && selectedToken) {
      const error = getSendErrorMessage(
        currentAmount,
        selectedToken,
        activeChain,
        tokenBalances,
        balance,
      );
      setErrorMessage(error);
    } else {
      setErrorMessage("");
    }
  }, [
    watch("amount"),
    selectedToken,
    activeChain,
    tokenBalances,
    balance,
    watch,
  ]);

  const selectedNetworkValue = watch("network") || "";
  const selectedTokenValue = watch("token") || "";

  const tokenPlaceholder = useMemo(() => {
    if (selectedToken) return getOnlyTokenSymbol(selectedToken.symbol);

    if (sortedTokens.length === 0) return "No tokens available";
    if (sortedTokens.length === 1)
      return `Select ${getOnlyTokenSymbol(sortedTokens[0].symbol)}`;

    return `Select token (${sortedTokens.length} available)`;
  }, [selectedToken, sortedTokens]);

  const chainList =
    activePrivyEVMWallet?.walletClientType === "privy"
      ? [chainsWithCustomRpcs()[0]]
      : solanaConnected
        ? [chainConfigs[CHAIN_ID["solana"]]]
        : chainsWithCustomRpcs().filter(
            (chain) => chain.id !== CHAIN_ID["solana"],
          );

  const filteredNetworks = chainList.filter((chainConfig) =>
    chainConfig.name.toLowerCase().includes(networkSearchQuery.toLowerCase()),
  );

  const handleNetworkSelect = async (chainName: string): Promise<void> => {
    const chainConfig = chainsWithCustomRpcs().find(
      (config) => config.name === chainName,
    );
    const solanaChainConfig = chainConfigs[CHAIN_ID["solana"]];
    if (!chainConfig && chainName === solanaChainConfig.name) {
      if (solanaChainConfig && chainName === solanaChainConfig.name) {
        await switchToChain(solanaChainConfig);
        setValue("network", chainName, { shouldValidate: true });
        setShowNetworkSelection(false);
        setNetworkSearchQuery("");
        return;
      }
    }

    if (!chainConfig) {
      return;
    }

    const chain = chainConfig;

    setValue("network", chainName, { shouldValidate: true });

    setShowNetworkSelection(false);
    setNetworkSearchQuery("");

    if (activeChain?.id === chain.id) {
      return;
    }

    try {
      await switchToChain(chain);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      setError(`Failed to switch to ${chain.name}. Please try again.`);
    }
  };

  const handleTokenSelect = (token: Token): void => {
    setSelectedToken(token);
    setValue("token", token.symbol, { shouldValidate: true });
    setShowTokenSelection(false);
    setTokenSearchQuery("");
  };

  const isButtonDisabled = useMemo(() => {
    const currentAmount = watch("amount");

    if (
      !currentAmount ||
      currentAmount === "0" ||
      parseFloat(currentAmount) <= 0
    ) {
      return true;
    }

    if (errorMessage) {
      return true;
    }

    if (!isValid) {
      return true;
    }

    if (sortedTokens.length > 0 && !selectedToken) {
      return true;
    }

    if (isGlobalLoading) {
      return true;
    }

    return false;
  }, [
    watch("amount"),
    errorMessage,
    isValid,
    sortedTokens.length,
    selectedToken,
    isGlobalLoading,
    watch,
  ]);

  const onSubmit = async (data: SendFormData): Promise<void> => {
    if (sortedTokens.length > 0 && !selectedToken) {
      setValue("token", "", { shouldValidate: true });
      trigger("token");
      return;
    }

    await sendTransactionFromHook(data.recipientAddress, data.amount);
  };

  const shouldShowTokenError = useMemo(() => {
    return errors.token && sortedTokens.length > 0;
  }, [errors.token, sortedTokens.length]);

  if (!walletAddress) {
    return null;
  }

  return (
    <Modal
      isOpen={step === "send"}
      onClose={handleClose}
      paddingClass="p-6 w-full"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[436px]"
    >
      <div className="flex justify-start">
        <button
          onClick={() => {
            if (showTokenSelection) {
              setShowTokenSelection(false);
              setTokenSearchQuery("");
            } else if (showNetworkSelection) {
              setShowNetworkSelection(false);
              setNetworkSearchQuery("");
            } else {
              handleClose();
            }
          }}
          className="rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label={
            showNetworkSelection || showTokenSelection ? "Back" : "Close"
          }
        >
          {showNetworkSelection || showTokenSelection ? (
            <ChevronLeftIcon width={16} height={16} />
          ) : (
            <CloseModalIcon width={16} height={16} />
          )}
        </button>
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="text-sm font-normal text-white mt-5"
      >
        {showNetworkSelection ? (
          <div className="space-y-4">
            <div>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[#535E73]" />
                </div>
                <input
                  type="text"
                  placeholder="Search name or paste address"
                  value={networkSearchQuery}
                  onChange={(e) => setNetworkSearchQuery(e.target.value)}
                  className="w-full rounded-[8px] pl-10 pr-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border border-[#2C2F36] transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4]"
                />
              </div>

              <div
                className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-6 pr-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#1B46E0 transparent",
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: 6px;
                  }
                  div::-webkit-scrollbar-track {
                    background: #161c27;
                  }
                  div::-webkit-scrollbar-thumb {
                    background-color: #1b46e0;
                    border-radius: 4px;
                  }
                `}</style>
                <p className="text-[#4874DB] text-[16px]">Popular</p>
                {filteredNetworks.map((chainConfig, index) => (
                  <motion.div
                    key={chainConfig.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className="group hover:cursor-pointer hover:shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] hover:bg-[#1D2A41] hover:rounded-[4px] max-h-9 flex rounded-[4px] py-3 w-full flex-row justify-between items-center transition-colors duration-200"
                    onClick={() => handleNetworkSelect(chainConfig.name)}
                    whileHover={{ scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="font-normal flex flex-row gap-2 items-center py-2 px-4">
                      {CHAIN_ICONS[chainConfig.id]?.url && (
                        <img
                          src={CHAIN_ICONS[chainConfig.id]?.url}
                          alt={chainConfig.name}
                          className="w-[20px] h-[20px] rounded-full"
                        />
                      )}
                      <p className="text-white">{chainConfig.name}</p>
                    </div>
                    {selectedNetworkValue === chainConfig.name && (
                      <div className="w-2 h-2 bg-[#3E73C4] rounded-full mr-4"></div>
                    )}
                  </motion.div>
                ))}

                {filteredNetworks.length === 0 && (
                  <div className="text-center py-8 text-[#535E73]">
                    <p>No networks found matching {networkSearchQuery}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : showTokenSelection ? (
          // token Selection Block
          <div className="space-y-4">
            <div>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[#535E73]" />
                </div>
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={tokenSearchQuery}
                  onChange={(e) => setTokenSearchQuery(e.target.value)}
                  className="w-full rounded-[8px] pl-10 pr-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border border-[#2C2F36] transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4]"
                />
              </div>

              <div
                className="flex flex-col gap-2 max-h-[300px] overflow-y-auto mt-6 pr-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#1B46E0 transparent",
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    width: 6px;
                  }
                  div::-webkit-scrollbar-track {
                    background: #161c27;
                  }
                  div::-webkit-scrollbar-thumb {
                    background-color: #1b46e0;
                    border-radius: 4px;
                  }
                `}</style>
                <p className="text-[#4874DB] text-[16px]">Available Tokens</p>

                <AnimatePresence mode="wait">
                  {sortedTokens.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="text-center text-[#535E73] py-8"
                    >
                      {tokenSearchQuery
                        ? "No tokens found"
                        : activePrivyEVMWallet?.walletClientType === "privy"
                          ? "No tokens with balance available to send"
                          : "No tokens available for this network"}
                    </motion.div>
                  ) : (
                    <>
                      {sortedTokens.map((token, index) => (
                        <motion.div
                          key={`${token.address}-${activeChain?.id}`}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{
                            layout: { duration: 0.3, ease: "easeInOut" },
                            opacity: { duration: 0.2 },
                            y: { duration: 0.2 },
                          }}
                        >
                          <TokenBalanceItem
                            token={token}
                            selectedChain={activeChain}
                            isSelected={
                              selectedToken?.address === token.address
                            }
                            onClick={() => handleTokenSelect(token)}
                            onBalanceUpdate={handleBalanceUpdate}
                            index={index}
                          />
                        </motion.div>
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <p className="text-[12px] md:text-[18px] font-bold mb-4">
                Send from
              </p>
              <div className="w-full h-[48px] bg-[#161C27] px-3 rounded-lg shadow-[0_4px_6px_0_rgba(0,0,0,0.15)] flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide text-[14px] sm:text-[16px]">
                {walletAddress}
              </div>
            </div>

            <div>
              <p className="text-[18px] font-bold mb-4">Send to</p>
              <input
                type="text"
                placeholder="Enter wallet address..."
                {...register("recipientAddress")}
                className={`w-full rounded-[8px] px-3 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
                  errors.recipientAddress
                    ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                    : "border-[#2C2F36]"
                }`}
              />
              {errors.recipientAddress && (
                <div className="flex gap-1 items-center mt-2">
                  <ErrorInputIcon
                    width={16}
                    height={16}
                    className="text-[#FFC700]"
                  />
                  <p className="text-[#FFC700] text-[12px] font-normal">
                    {errors.recipientAddress.message}
                  </p>
                </div>
              )}
            </div>

            {/* Network Selection */}
            <div>
              <p className="text-[18px] font-bold mb-4">Network</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNetworkSelection(true)}
                  className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
                    errors.network
                      ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                      : "border-[#2C2F36]"
                  } flex flex-row justify-between items-center`}
                >
                  <div className="flex items-center gap-3">
                    {(selectedNetworkValue || activeChain?.name) &&
                      (() => {
                        const networkName =
                          selectedNetworkValue || activeChain?.name;
                        const chainConfig =
                          chainsWithCustomRpcs().find(
                            (config) => config.name === networkName,
                          ) ||
                          (chainConfigs[CHAIN_ID["solana"]] &&
                          networkName === chainConfigs[CHAIN_ID["solana"]].name
                            ? chainConfigs[CHAIN_ID["solana"]]
                            : undefined);

                        return chainConfig ? (
                          <img
                            src={CHAIN_ICONS[chainConfig.id]?.url}
                            alt={networkName}
                            className="w-[20px] h-[20px] rounded-full"
                          />
                        ) : null;
                      })()}
                    <span
                      className={
                        selectedNetworkValue || activeChain?.name
                          ? "text-white"
                          : "text-[#535E73]"
                      }
                    >
                      {selectedNetworkValue ||
                        activeChain?.name ||
                        "Select network"}
                    </span>
                  </div>
                  <ChevronDownIcon className="w-5 h-5 text-[#9A9CB3]" />
                </button>

                <input type="hidden" {...register("network")} />
              </div>

              {errors.network && (
                <div className="flex gap-1 items-center mt-2">
                  <ErrorInputIcon
                    width={16}
                    height={16}
                    className="text-[#FFC700]"
                  />
                  <p className="text-[#FFC700] text-[12px] font-normal">
                    {errors.network.message}
                  </p>
                </div>
              )}
            </div>

            {/* Token Selection */}
            <div>
              <p className="text-[18px] font-bold mb-4">Token</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTokenSelection(true)}
                  disabled={!activeChain}
                  className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
                    shouldShowTokenError
                      ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
                      : "border-[#2C2F36]"
                  } flex flex-row justify-between items-center ${
                    !activeChain ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedToken && (
                      <div className="w-[20px] h-[20px]">
                        <TokenIcon
                          token={selectedToken}
                          icon={selectedToken.imgURL}
                          imageSize="w-[20px] h-[20px]"
                        />
                      </div>
                    )}
                    <span
                      className={
                        selectedToken ? "text-white" : "text-[#535E73]"
                      }
                    >
                      {tokenPlaceholder}
                    </span>
                  </div>
                  <ChevronDownIcon className="w-5 h-5 text-[#9A9CB3]" />
                </button>

                <input type="hidden" {...register("token")} />
              </div>

              {shouldShowTokenError && (
                <div className="flex gap-1 items-center mt-2">
                  <ErrorInputIcon
                    width={16}
                    height={16}
                    className="text-[#FFC700]"
                  />
                  <p className="text-[#FFC700] text-[12px] font-normal">
                    Please select a token
                  </p>
                </div>
              )}
            </div>

            <AmountInputField
              register={register}
              watch={watch}
              errors={errors}
              fieldName="amount"
              selectedToken={selectedToken}
              tokenBalances={tokenBalances}
              activeChain={activeChain}
              label="Amount"
              placeholder="0.00"
              showMaxButton={true}
              onMaxClick={handleMaxClick}
              errorMessage={errorMessage}
              getMaxAmount={getMaxAmount}
            />

            <div className="">
              <Button
                variant="custom"
                type="submit"
                disabled={isButtonDisabled && !isSuccess}
                className={`!max-h-[48px] !w-full !mt-6 ${
                  isSuccess ? "!bg-green-500 !opacity-100 !cursor-default" : ""
                }`}
              >
                {isGlobalLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <MiniSpinner size={20} color="#1B46E0" /> Sending...
                  </span>
                ) : isSuccess ? (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.svg
                      width={20}
                      height={20}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                    Sent Successfully!
                  </motion.span>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </form>
        )}

        {selectedToken && activeChain && !showTokenSelection && (
          <SelectedTokenBalanceLoader
            token={selectedToken}
            selectedChain={activeChain}
            onBalanceUpdate={handleBalanceUpdate}
          />
        )}
      </motion.div>
    </Modal>
  );
};
