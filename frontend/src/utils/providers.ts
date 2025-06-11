import { JsonRpcProvider } from "ethers";
import {
  zetaRpcUrl,
  baseMainnetRpcUrl,
  ethMainnetRpcUrl,
  arbitrumMainnetRpcUrl,
  polygonAmoyRpcUrl,
  polygonMainnetRpcUrl,
  avalancheMainnetRpcUrl,
  bscMainnetRpcUrl,
  baseSepoliaRpcUrl,
  sepoliaRpcUrl,
  arbitrumSepoliaRpcUrl,
  avalancheFujiRpcUrl,
  bscTestnetRpcUrl,
} from "@/constants/chainConfig";

const baseProvider = new JsonRpcProvider(baseMainnetRpcUrl);
const ethereumProvider = new JsonRpcProvider(ethMainnetRpcUrl);
const arbitrumProvider = new JsonRpcProvider(arbitrumMainnetRpcUrl);
const zetaProvider = new JsonRpcProvider(zetaRpcUrl);
const polygonProvider = new JsonRpcProvider(polygonMainnetRpcUrl);
const avalancheProvider = new JsonRpcProvider(avalancheMainnetRpcUrl);
const bscProvider = new JsonRpcProvider(bscMainnetRpcUrl);

const baseTestnetProvider = new JsonRpcProvider(baseSepoliaRpcUrl);
const ethereumTestnetProvider = new JsonRpcProvider(sepoliaRpcUrl);
const arbitrumTestnetProvider = new JsonRpcProvider(arbitrumSepoliaRpcUrl);
const polygonTestnetProvider = new JsonRpcProvider(polygonAmoyRpcUrl);
const avalancheTestnetProvider = new JsonRpcProvider(avalancheFujiRpcUrl);
const bscTestnetProvider = new JsonRpcProvider(bscTestnetRpcUrl);

export {
  baseProvider,
  ethereumProvider,
  arbitrumProvider,
  zetaProvider,
  polygonProvider,
  avalancheProvider,
  bscProvider,
  baseTestnetProvider,
  ethereumTestnetProvider,
  arbitrumTestnetProvider,
  polygonTestnetProvider,
  avalancheTestnetProvider,
  bscTestnetProvider
};
