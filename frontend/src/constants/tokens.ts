import { CHAIN_ID } from "./chainConfig";

export interface TokenInfo {
  symbol: string;
  name: string;
  icon: string;
  bgColor?: string;
}

interface ChainInfo extends TokenInfo {
  id: number;
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

export const CHAINS_ICONS_BUTTON: ChainInfo[] = [
  {
    symbol: "ZETA",
    name: "ZETA",
    icon: "/ZetaChainLogo.png",
    id: CHAIN_ID["zetachain"],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "/ETH.png",
    id: CHAIN_ID["ethereum"],
  },
  {
    symbol: "BNB",
    name: "BNB",
    icon: "/bnb-bnb-logo.png",
    id: CHAIN_ID["bsc"],
  },
  {
    symbol: "AVALANCHE",
    name: "AVALANCHE",
    icon: "/avalanche-avax-logo.png",
    id: CHAIN_ID["avalanche"],
  },
  {
    symbol: "ARBITRUM",
    name: "ARBITRUM",
    icon: "/arbitrum-arb-logo.png",
    id: CHAIN_ID["arbitrum"],
  },
];
export const CHAINS_ICONS_BUTTON_WITHOUT_ZETA: ChainInfo[] = [
  {
    symbol: "BASE",
    name: "BASE",
    icon: "/base.png",
    id: CHAIN_ID['base'],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    icon: "/ETH.png",
    id: CHAIN_ID["ethereum"],
  },
  {
    symbol: "BNB",
    name: "BNB",
    icon: "/bnb-bnb-logo.png",
    id: CHAIN_ID["bsc"],
  },
  {
    symbol: "AVALANCHE",
    name: "AVALANCHE",
    icon: "/avalanche-avax-logo.png",
    id: CHAIN_ID["avalanche"],
  },
  {
    symbol: "ARBITRUM",
    name: "ARBITRUM",
    icon: "/arbitrum-arb-logo.png",
    id: CHAIN_ID["arbitrum"],
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    icon: "/bitcoin_logo.png",
  },
];

export const getTokenBySymbol = (symbol: string): TokenInfo | undefined => {
  return SUPPORTED_TOKENS.find((token) => token.symbol === symbol);
};
export const getChainBySymbol = (symbol: string): TokenInfo | undefined => {
  return CHAINS_ICONS_BUTTON.find((icon) => icon.symbol === symbol);
};
