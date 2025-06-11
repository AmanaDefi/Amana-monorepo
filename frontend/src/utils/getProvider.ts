import { Chain } from "viem";
import {
  arbitrumProvider,
  arbitrumTestnetProvider,
  avalancheProvider,
  avalancheTestnetProvider,
  baseProvider,
  baseTestnetProvider,
  bscProvider,
  bscTestnetProvider,
  ethereumProvider,
  ethereumTestnetProvider,
  polygonProvider,
  polygonTestnetProvider,
  zetaProvider,
} from "./providers";

export const getProvider = (chainId: number) => {
  switch (chainId) {
    case 7001:
      return zetaProvider;
    case 7000:
      return zetaProvider;
    case 11155111:
      return ethereumTestnetProvider;
    case 1:
      return ethereumProvider;
    case 84532:
      return baseTestnetProvider;
    case 8453:
      return baseProvider;
    case 80001:
      return polygonTestnetProvider;
    case 137:
      return polygonProvider;
    case 97:
      return bscTestnetProvider;
    case 56:
      return bscProvider;
    case 421613:
      return arbitrumTestnetProvider;
    case 42161:
      return arbitrumProvider;
    case 43113:
      return avalancheTestnetProvider;
    case 43114:
      return avalancheProvider;

    default:
      return zetaProvider;
  }
};
