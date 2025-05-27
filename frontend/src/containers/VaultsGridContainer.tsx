import { useState } from "react";
import { usePathname } from "next/navigation";
import { 
  VaultData, 
  VaultAPY, 
  UserVaultBalance, 
  VaultTotalAssets, 
  VaultTotalAssetsinToken 
} from "../types/types";
import { VAULT_DATA } from "../constants/index";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";
import { Chain } from "thirdweb";
import { Account } from "thirdweb/wallets";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useActiveAccount } from "thirdweb/react";
import VaultsGrid from "../components/VaultsGrid";

// Zero account for default value
export const ZERO_ACCOUNT: Account = {
  address: "0x0000000000000000000000000000000000000000",
  sendTransaction: async () => {
    throw new Error("sendTransaction not implemented for ZERO_ACCOUNT");
  },
  signMessage: async () => {
    throw new Error("signMessage not implemented for ZERO_ACCOUNT");
  },
  signTypedData: async () => {
    throw new Error("signTypedData not implemented for ZERO_ACCOUNT");
  },
};

interface VaultsGridContainerProps {
  activeChain?: Chain; // Make activeChain optional
  defaultAccount?: Account; // Optional default account
}

const VaultsGridContainer: React.FC<VaultsGridContainerProps> = ({ 
  activeChain, 
  defaultAccount = ZERO_ACCOUNT 
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
  const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
  const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
  const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<VaultTotalAssetsinToken[]>([]);
  const pathname = usePathname();

  const vaults: VaultData[] = VAULT_DATA;
  const EOAaccount = useActiveAccount() || defaultAccount;
  const { walletAddress } = useMultiChain();

  // Fetch vault balances and total values
  useUpdateVaultBalanceAndTotal(
    vaults, 
    walletAddress, 
    setUserVaultBalances, 
    setVaultTotalAssets, 
    setVaultTotalAssetsinToken
  );
  // Fetch token prices for APY calculations
  const crvTokenPrice = useTokenPriceBySymbol("CRV");
  const cvxTokenPrice = useTokenPriceBySymbol("CVX");
  const ethTokenPrice = useTokenPriceBySymbol("ETH");
  const compTokenPrice = useTokenPriceBySymbol("COMP");
  
  // Calculate APYs
  useUpdateAPYs(vaults, setVaultAPYs, setLoading, crvTokenPrice, cvxTokenPrice, ethTokenPrice, compTokenPrice, true);

  return (
    <div className="container mx-auto">
      <VaultsGrid
        loading={loading}
        vaults={vaults}
        vaultAPYs={vaultAPYs}
        userVaultBalances={userVaultBalances}
        vaultTotalAssets={vaultTotalAssets}
        vaultTotalAssetsinToken={vaultTotalAssetsinToken}
      />
    </div>
  );
};

export default VaultsGridContainer; 
