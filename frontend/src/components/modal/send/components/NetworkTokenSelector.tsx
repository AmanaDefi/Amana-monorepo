import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

import { Token, Balance } from "@/types/types";
import { TOKEN_LOGO_URLS } from "@/constants/chainConfig";
import TokenIcon from "@/components/common/TokenIcon";
import { useMultichainTokenBalanceForModal } from "@/hooks/useMultichainTokenBalanceForModal";
import { formatTokenBalance, getOnlyTokenSymbol } from "@/utils/utils";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { MiniSpinner } from "@/components/PendingDots";

interface NetworkData {
  networkKey: string;
  icon: string;
  tokenSuffixes: string[];
  tokens: Token[];
}

interface NetworksMap {
  [networkName: string]: NetworkData;
}

interface NetworkTokenSelectorProps {
  availableTokens: Token[];
  selectedToken: Token | null;
  onTokenSelect: (token: Token, networkName: string) => void;
  activeChain: any;
  handleBalanceUpdate: (
    token: Token,
    balance: Balance,
    price: number,
    isLoading: boolean,
  ) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  tokenBalances: Map<
    string,
    { balance: Balance; price: number; isLoading: boolean }
  >;
  activePrivyEVMWallet?: any;
}

interface NetworkTokenGroupProps {
  networkName: string;
  networkData: NetworkData;
  isExpanded: boolean;
  onToggle: (networkName: string) => void;
  onTokenSelect: (token: Token, networkName: string) => void;
  selectedToken: Token | null;
  activeChain: any;
  handleBalanceUpdate: (
    token: Token,
    balance: Balance,
    price: number,
    isLoading: boolean,
  ) => void;
}

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

const NETWORK_TOKEN_MAP: { [key: string]: Omit<NetworkData, "tokens"> } = {
  ZetaChain: {
    networkKey: "NATIVE",
    icon: TOKEN_LOGO_URLS.ZETA,
    tokenSuffixes: [""],
  },
  Ethereum: {
    networkKey: "ETH",
    icon: TOKEN_LOGO_URLS.ETH,
    tokenSuffixes: ["ETH"],
  },
  Base: {
    networkKey: "BASE",
    icon: TOKEN_LOGO_URLS.BASE,
    tokenSuffixes: ["BASE"],
  },
  Polygon: {
    networkKey: "POL",
    icon: TOKEN_LOGO_URLS.POL,
    tokenSuffixes: ["POL"],
  },
  "BNB Chain": {
    networkKey: "BSC",
    icon: TOKEN_LOGO_URLS.BNB,
    tokenSuffixes: ["BSC"],
  },
  Solana: {
    networkKey: "SOL",
    icon: TOKEN_LOGO_URLS.SOL,
    tokenSuffixes: ["SOL"],
  },
  Arbitrum: {
    networkKey: "ARB",
    icon: TOKEN_LOGO_URLS.ARB,
    tokenSuffixes: ["ARB"],
  },
  Avalanche: {
    networkKey: "AVAX",
    icon: TOKEN_LOGO_URLS.AVAX,
    tokenSuffixes: ["AVAX"],
  },
  Bitcoin: {
    networkKey: "BTC",
    icon: TOKEN_LOGO_URLS.BTC,
    tokenSuffixes: ["BTC"],
  },
};

const NetworkTokenGroup: React.FC<NetworkTokenGroupProps> = ({
  networkName,
  networkData,
  isExpanded,
  onToggle,
  onTokenSelect,
  selectedToken,
  activeChain,
  handleBalanceUpdate,
}) => {
  return (
    <div
      className={`border rounded-[8px] mb-2 transition-all duration-200 ${
        isExpanded
          ? "border-[#3E73C4] bg-[#0C1015] shadow-[0_0_12px_rgba(62,115,196,0.15)]"
          : "border-[#1D2A41] hover:border-[#3E73C4]"
      }`}
    >
      <button
        onClick={() => onToggle(networkName)}
        className={`w-full flex items-center justify-between p-3 transition-colors duration-200 rounded-[8px] ${
          isExpanded ? "bg-[#0C1015]" : "hover:bg-[#0C1015]"
        }`}
      >
        <div className="flex items-center gap-3">
          <img
            src={networkData.icon}
            alt={networkName}
            className="w-6 h-6 rounded-full"
          />
          <div className="text-left">
            <div
              className={`text-[16px] font-normal transition-colors duration-200 ${
                isExpanded ? "text-[#3E73C4]" : "text-white"
              }`}
            >
              {networkName}
            </div>
            <div className="text-[#535E73] text-[14px]">
              {networkData.tokens.length} token
              {networkData.tokens.length !== 1 ? "s" : ""} available
            </div>
          </div>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 transition-all duration-200 ${
            isExpanded ? "rotate-180 text-[#3E73C4]" : "text-[#9A9CB3]"
          }`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[#1D2A41] overflow-hidden"
          >
            <div className="p-2 space-y-1">
              {networkData.tokens.map((token, index) => (
                <TokenBalanceItem
                  key={`${token.address}-${networkName}`}
                  token={token}
                  selectedChain={activeChain}
                  isSelected={selectedToken?.address === token.address}
                  onClick={() => onTokenSelect(token, networkName)}
                  onBalanceUpdate={handleBalanceUpdate}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NetworkTokenSelector: React.FC<NetworkTokenSelectorProps> = ({
  availableTokens,
  selectedToken,
  onTokenSelect,
  activeChain,
  handleBalanceUpdate,
  searchQuery = "",
  onSearchChange,
  tokenBalances,
  activePrivyEVMWallet,
}) => {
  const [expandedNetwork, setExpandedNetwork] = useState<string | null>(null);

  const groupTokensByNetwork = (tokens: Token[]): NetworksMap => {
    const networksWithTokens: NetworksMap = {};

    Object.entries(NETWORK_TOKEN_MAP).forEach(([networkName, networkData]) => {
      const networkTokens = tokens.filter((token: Token) => {
        if (token.symbol === "ZETA") {
          return networkData.tokenSuffixes.includes("");
        }

        const tokenSuffix = token.symbol.split(".")[1];
        return tokenSuffix && networkData.tokenSuffixes.includes(tokenSuffix);
      });

      if (networkTokens.length > 0) {
        networksWithTokens[networkName] = {
          ...networkData,
          tokens: networkTokens,
        };
      }
    });

    return networksWithTokens;
  };

  const filteredTokens = useMemo((): Token[] => {
    if (activePrivyEVMWallet?.walletClientType === "privy") {
      return availableTokens.filter((token: Token) => {
        const tokenKey = `${token.address.toLowerCase()}-${activeChain?.id}`;
        const tokenData = tokenBalances.get(tokenKey);

        if (tokenData?.isLoading) return true;

        return (
          tokenData?.balance && parseFloat(tokenData.balance.formatted) > 0
        );
      });
    }

    return availableTokens;
  }, [
    availableTokens,
    activePrivyEVMWallet?.walletClientType,
    tokenBalances,
    activeChain,
  ]);

  const networksWithTokens = useMemo((): NetworksMap => {
    let tokens = filteredTokens;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tokens = tokens.filter(
        (token: Token) =>
          token.symbol.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query) ||
          getOnlyTokenSymbol(token.symbol).toLowerCase().includes(query),
      );
    }

    return groupTokensByNetwork(tokens);
  }, [filteredTokens, searchQuery]);

  const handleTokenSelect = (token: Token, networkName: string): void => {
    onTokenSelect(token, networkName);
  };

  const handleNetworkToggle = (networkName: string): void => {
    setExpandedNetwork(expandedNetwork === networkName ? null : networkName);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-[#535E73]" />
        </div>
        <input
          type="text"
          placeholder="Search networks or tokens..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="w-full rounded-[8px] pl-10 pr-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border border-[#2C2F36] transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4]"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-1">
        <p className="text-[#4874DB] text-[16px] mb-4">Networks & Tokens</p>

        <div className="space-y-2">
          {Object.entries(networksWithTokens).map(
            ([networkName, networkData]) => (
              <NetworkTokenGroup
                key={networkName}
                networkName={networkName}
                networkData={networkData}
                isExpanded={expandedNetwork === networkName}
                onToggle={handleNetworkToggle}
                onTokenSelect={handleTokenSelect}
                selectedToken={selectedToken}
                activeChain={activeChain}
                handleBalanceUpdate={handleBalanceUpdate}
              />
            ),
          )}
        </div>

        {Object.keys(networksWithTokens).length === 0 && (
          <div className="text-center text-[#535E73] py-8">
            {searchQuery
              ? `No networks or tokens found matching "${searchQuery}"`
              : "No networks with tokens available"}
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkTokenSelector;
