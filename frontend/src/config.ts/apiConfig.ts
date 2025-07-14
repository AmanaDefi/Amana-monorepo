import dotenv from "dotenv";
dotenv.config();

export const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const BLOCKPI_URL =
  process.env.NEXT_PUBLIC_BLOCKPI_URL ||
  "https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain";
export const API_KEY = process.env.NEXT_PUBLIC_AMANA_BACKEND_API_KEY;

// Graph endpoints
export const GRAPH_URL =
  process.env.NEXT_PUBLIC_GRAPH_URL ||
  "https://api.studio.thegraph.com/query/113761/amana-zetachain/version/latest";
export const GRAPH_API_KEY = process.env.NEXT_PUBLIC_GRAPH_API_KEY;
