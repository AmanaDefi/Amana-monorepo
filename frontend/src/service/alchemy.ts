import { Alchemy, Network, AssetTransfersCategory } from "alchemy-sdk";
import { ethers } from "ethers";
import axios from "axios";
import { Token } from "@/types/types";
import { format } from "path";

// Type definitions
type Address = string;

interface Balance {
    wei: string;
    formatted: string;
}

// ZetaChain config
const ZETACHAIN_ID = 7000;
const ZETA_TOKEN_DECIMALS = 18;

// Initialize Alchemy SDK
// Note: As of creation time, Alchemy might not have direct ZetaChain support
// This example assumes Alchemy has added ZetaChain support or we're using a custom endpoint
const config = {
    apiKey: process.env.ALCHEMY_API_KEY || "YOUR_ALCHEMY_API_KEY",
    network: Network.ZETACHAIN_MAINNET // Replace with ZetaChain when available in Alchemy
};

const alchemy = new Alchemy(config);

// Custom provider for ZetaChain (use this if Alchemy doesn't support ZetaChain directly)
const provider = new ethers.JsonRpcProvider("https://zetachain-evm.blockpi.network/v1/rpc/public");

/**
 * Get all tokens for a wallet on ZetaChain using Alchemy
 */
export async function getZetaChainTokensWithAlchemy(walletAddress: string): Promise<Token[]> {
    try {
        const tokens: Token[] = [];

        // 1. Get native ZETA token balance
        const nativeBalance = await provider.getBalance(walletAddress);
        const zetaPrice = await fetchTokenPrice("ZETA");

        tokens.push({
            name: "ZetaChain",
            address: "0x0000000000000000000000000000000000000000",
            symbol: "ZETA",
            decimals: ZETA_TOKEN_DECIMALS,
            imgURL: "/zeta.svg",
            price: zetaPrice,
            balance: {
                value: nativeBalance,
                formatted: ethers.formatEther(nativeBalance),
                formattedUSD: (parseFloat(ethers.formatEther(nativeBalance)) * zetaPrice).toFixed(2)
            },
            isNative: true,
            chainId: ZETACHAIN_ID
        });

        // 2. Get token transfers to identify tokens the wallet has interacted with
        // For direct Alchemy support, you'd use:
        // const transfers = await alchemy.core.getAssetTransfers({
        //   fromAddress: walletAddress,
        //   category: [AssetTransfersCategory.ERC20],
        // });

        // Since ZetaChain might not be directly supported by Alchemy yet,
        // we'll use a custom approach to get token addresses:
        const tokenAddresses = await getWalletTokenAddresses(walletAddress);

        // 3. For each token address, get detailed information
        for (const tokenAddress of tokenAddresses) {
            const tokenData = await getTokenData(tokenAddress, walletAddress);
            if (tokenData) {
                tokens.push(tokenData);
            }
        }

        return tokens;
    } catch (error) {
        console.error("Error fetching ZetaChain tokens:", error);
        throw error;
    }
}

/**
 * Get all token addresses associated with a wallet
 */
async function getWalletTokenAddresses(walletAddress: string): Promise<string[]> {
    try {
        // Option 1: Use ZetaChain explorer API if available
        // const response = await axios.get(`https://explorer-api.zetachain.com/api/v1/address/${walletAddress}/tokens`);
        // return response.data.tokens.map((t: any) => t.contractAddress);

        // Option 2: Use Alchemy's getTokenBalances when ZetaChain is supported
        // const tokenBalances = await alchemy.core.getTokenBalances(walletAddress);
        // return tokenBalances.tokenBalances.map(t => t.contractAddress);

        // Option 3: Fallback to a list of common ZetaChain tokens
        // This is simplified - in production, you would need a more comprehensive approach
        return [
            "0x96152E6180E085FA57c7708e18AF8F05e37B479D", // Base.USDC
            "0xfC9201f4116aE6b054722E10b98D904829b469c3",  // POL.USDC
            // "0x695f0F747884fbDE1B82e157497cBfd201d21DcD",
            // Add more tokens as needed
        ];
    } catch (error) {
        console.error("Error getting token addresses:", error);
        return [];
    }
}

/**
 * Get detailed information for a specific token
 */
async function getTokenData(
    tokenAddress: string,
    walletAddress: string
): Promise<Token | null> {
    try {
        // Create contract instance for the token
        const erc20ABI = [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function balanceOf(address) view returns (uint256)"
        ];

        const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);

        // Get token details
        const [name, symbol, decimals, balanceWei] = await Promise.all([
            tokenContract.name().catch(() => "Unknown Token"),
            tokenContract.symbol().catch(() => "UNKNOWN"),
            tokenContract.decimals().catch(() => 18),
            tokenContract.balanceOf(walletAddress)
        ]);

        // Skip tokens with zero balance (optional)
        if (balanceWei.isZero()) {
            return null;
        }

        // Format balance according to decimals
        const formatted = ethers.formatUnits(balanceWei, decimals);

        // Get additional information
        const [price, imgURL, ZRC20equivalent] = await Promise.all([
            fetchTokenPrice(symbol),
            fetchTokenLogo(tokenAddress, symbol),
            checkIfZRC20(tokenAddress)
        ]);

        return {
            name,
            address: tokenAddress,
            symbol,
            decimals,
            imgURL,
            price,
            balance: {
                value: balanceWei,
                formatted,
                formattedUSD: (parseFloat(formatted) * price).toFixed(2)
            },
            isNative: false,
            ZRC20equivalent: ZRC20equivalent as any,
            chainId: ZETACHAIN_ID
        };
    } catch (error) {
        console.error(`Error getting data for token ${tokenAddress}:`, error);
        return null;
    }
}

/**
 * Fetch token price from an API
 */
async function fetchTokenPrice(symbol: string): Promise<number> {
    try {
        // CoinGecko API or similar
        const response = await axios.get(
            "https://api.coingecko.com/api/v3/simple/price",
            {
                params: {
                    ids: symbol.toLowerCase(),
                    vs_currencies: "usd"
                }
            }
        );

        return response.data[symbol.toLowerCase()]?.usd || 0;
    } catch (error) {
        console.warn(`Couldn't fetch price for ${symbol}`);
        return 0;
    }
}

/**
 * Fetch token logo URL
 */
async function fetchTokenLogo(address: string, symbol: string): Promise<string> {
    // Try multiple sources for token logos

    // 1. Check ZetaChain token list if available
    try {
        const response = await axios.get("https://raw.githubusercontent.com/zetachain/token-list/main/tokens.json");
        const tokenList = response.data;

        const token = tokenList.find((t: any) =>
            t.address.toLowerCase() === address.toLowerCase()
        );

        if (token?.logoURI) {
            return token.logoURI;
        }
    } catch (error) {
        // Continue to fallback options
    }

    //   2. Try Alchemy's getTokenMetadata when ZetaChain is supported
    try {
        const metadata = await alchemy.core.getTokenMetadata(address);
        if (metadata.logo) {
            return metadata.logo;
        }
    } catch (error) {
        // Continue to fallback
    }

    // 3. Fallback to Trust Wallet assets repository
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zetachain/assets/${address}/logo.png`;
}

/**
 * Check if a token is a ZRC20 token and get its equivalent address
 */
async function checkIfZRC20(tokenAddress: string): Promise<Address | undefined> {
    try {
        // Define ZRC20 interface methods to check
        const zrc20CheckABI = [
            "function getOriginalTokenAddress() view returns (address)",
            "function getOriginalChainId() view returns (uint256)"
        ];

        const contract = new ethers.Contract(tokenAddress, zrc20CheckABI, provider);

        // Try to call ZRC20-specific methods
        const originalAddress = await contract.getOriginalTokenAddress().catch(() => null);

        // If the call succeeds, it's a ZRC20 token
        if (originalAddress && originalAddress !== ethers.ZeroAddress) {
            return originalAddress;
        }

        return undefined;
    } catch (error) {
        // Not a ZRC20 token or error occurred
        return undefined;
    }
}

// Example usage
export default async function getWalletAssets(wallet: string) {
    const tokens = await getZetaChainTokensWithAlchemy(wallet);
    return tokens;
}