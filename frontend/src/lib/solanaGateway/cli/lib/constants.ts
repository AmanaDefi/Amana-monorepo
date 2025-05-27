import { Connection, PublicKey } from "@solana/web3.js";
import { MAINNET_PROGRAM_ID, DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk"
import SolanaConnectionSingleton from "@/utils/solanaSingleton";


export const PROGRAM_ID = new PublicKey("EFj2jrBRHR96ScgYwGgUkKquuaL5g8eJivSkzETUHo9e")


export const lookupTable = new PublicKey("AAvzBxrQi3RRacyvmaZXpFBnK7BZenrMwYXj4HLMuMwK");
export const cluster:string = "devnet";
export const CONFIG_SEED = "config";
export const LOCKEDENTRIES_SEED = "locked-entries";
export const USERINFO_SEED = "user-info";
export const MINT_AUTHORITY_SEED = "mint-authority";
export const NUM_TOKEN_MINT =new PublicKey("AbM6MVFD8JU3e85kyhrNwhiCHt5saaRXkj21HZ8T9Vk5")
export const WSOL = new PublicKey("So11111111111111111111111111111111111111112")
export const USDC = cluster == 'mainnet-beta' ? new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") : new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")

export const MARKET_ID = new PublicKey("7LdXubmYtbbJNyBtzmRSEUwoZ8gSfg1WwxMv4n48sHrv")
export const USDC_MARKET_ID = new PublicKey("J3unQ8aZWKaEa8GGQZ6MYi8RVpEJvmAf7Ko5YeY9XHnW")

// export const RPC_URL = cluster == "mainnet-beta" ? "https://mainnet.helius-rpc.com/?api-key=36fe5fc9-8598-4302-a28f-a93d9cc441b7" :"https://devnet.helius-rpc.com/?api-key=44b7171f-7de7-4e68-9d08-eff1ef7529bd" ;
export const connection = SolanaConnectionSingleton.getInstance(); 
export const raydiumProgramId =
cluster == "mainnet-beta" ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID;
export const ammProgram =
cluster == "mainnet-beta"
    ? new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8") // mainnet-beta
    : new PublicKey("HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8"); // devnet

export const marketProgram =
  cluster == "mainnet-beta"
    ? new PublicKey("srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX") // mainnet-beta
    : new PublicKey("EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj"); // devnet

export const feeDestination =
  cluster == "mainnet-beta"
    ? new PublicKey("7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5") // mainnet-beta
    : new PublicKey("3XMrhbv989VxAMi3DErLV9eJht1pHppW5LbKxe9fkEFR"); // Devnet

// export const marketProgram =
//   cluster == "mainnet-beta"
//     ? new PublicKey("EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj") // mainnet-beta
//     : new PublicKey("srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX"); // devnet