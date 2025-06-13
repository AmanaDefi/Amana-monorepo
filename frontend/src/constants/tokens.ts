export interface TokenInfo {
  symbol: string;
  name: string;
  icon: string;
  bgColor?: string;
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: "SOL",
    name: "Solana",
    icon: "/solana.png",
    bgColor: "bg-black",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "/ETH.png",
    bgColor: "bg-blue-500",
  },
  {
    symbol: "TRX",
    name: "Tron",
    icon: "/tron.webp",
    bgColor: "bg-red-500",
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    icon: "/bitcoin_logo.png",
    bgColor: "bg-yellow-500",
  },
  {
    symbol: "BASE",
    name: "Base",
    icon: "/base.png",
    bgColor: "bg-blue-400",
  },
];

export const CHAINS_ICONS: TokenInfo[] = [
  {
    symbol: "ZETA",
    name: "ZETA",
    icon: "/ZetaChainLogo.png",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "/ETH.png",
  },
  {
    symbol: "BNB",
    name: "BNB",
    icon: "/bnb-bnb-logo.png",
  },
  {
    symbol: "AVALANCHE",
    name: "AVALANCHE",
    icon: "/avalanche-avax-logo.png",
  },
  {
    symbol: "ARBITRUM",
    name: "ARBITRUM",
    icon: "/arbitrum-arb-logo.png",
  },
];

export const getTokenBySymbol = (symbol: string): TokenInfo | undefined => {
  return SUPPORTED_TOKENS.find((token) => token.symbol === symbol);
};
export const getChainBySymbol = (symbol: string): TokenInfo | undefined => {
  return CHAINS_ICONS.find((icon) => icon.symbol === symbol);
};