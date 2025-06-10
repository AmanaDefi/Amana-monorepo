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

export const getTokenBySymbol = (symbol: string): TokenInfo | undefined => {
  return SUPPORTED_TOKENS.find((token) => token.symbol === symbol);
};
