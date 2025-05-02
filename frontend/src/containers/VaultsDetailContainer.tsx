import { useState, useEffect, useMemo, useCallback } from "react";
import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import VaultHeader from "@/components/VaultHeader";
import VaultInputs from "@/components/VaultInputs";
import { VaultData, VaultAPY, VaultTotalAssets, VaultTotalAssetsinToken, Token, Balance } from "@/types/types";
import { VAULT_DATA } from "@/constants";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { Account } from "thirdweb/wallets";
import { useUpdateVaultBalanceAndTotalPerVault, useUpdateAPYs } from "@/hooks/hooks";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CHAINS_EXPLORER_BASE_URL_MAINNET } from "@/constants/chainConfig";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import Information from "@/components/Information";

const VaultsDetailContainer: React.FC<{
  vaultID: string | string[];
}> = ({
  vaultID,
}) => {
    const [vaultData, setVaultData] = useState<VaultData>();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const initialIsDeposit = tabParam !== 'withdraw';

    const [loading, setLoading] = useState<boolean>(true);
    const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
    const [userVaultBalance, setUserVaultBalance] = useState<Balance>();
    const [vaultTotalAsset, setVaultTotalAsset] = useState<VaultTotalAssets>();
    const [vaultTotalAssetinToken, setVaultTotalAssetinToken] = useState<VaultTotalAssetsinToken>();
    const [transactionCompleted, setTransactionCompleted] = useState(false);
    const [selectedToken, setSelectedToken] = useState<Token | undefined>();

    const vaults: VaultData[] =  VAULT_DATA;
    const backPath: string = pathname.includes("old-vaults") ? "/old-vaults" : "/";
    const { walletAddress } = useMultiChain();

    useEffect(() => {
      const foundVault = vaults.find((v) => v.id === vaultID.toString());
      
      if (foundVault) {
        console.log(`VaultsDetailContainer: Switching to vault ${vaultID}`);
        setVaultData(foundVault);
        
        // Explicitly reset selectedToken when vault changes
        // This is critical to ensure proper auto-selection in child components
        console.log(`VaultsDetailContainer: Resetting selected token for new vault`);
        setSelectedToken(undefined);
      }
    }, [vaultID, vaults]);

    const strategyExplorerBaseUrl = useMemo(() => {
      if (!vaultData?.protocol?.chainId) return "";
      return CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] ?? "";
    }, [vaultData?.protocol?.chainId])

    const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000]

    // Always call the hook unconditionally, but pass empty/default values when vaultData is undefined
    useUpdateVaultBalanceAndTotalPerVault(vaultData || null, walletAddress, setUserVaultBalance, setVaultTotalAsset, setVaultTotalAssetinToken, transactionCompleted);
    
    const crvTokenPrice = useTokenPriceBySymbol("CRV");
    const cvxTokenPrice = useTokenPriceBySymbol("CVX");
    console.log("cvxTokenPrice: ", cvxTokenPrice)
    const ethTokenPrice = useTokenPriceBySymbol("ETH");
    const compTokenPrice = useTokenPriceBySymbol("COMP");
    useUpdateAPYs(vaults, setVaultAPYs, setLoading, crvTokenPrice, cvxTokenPrice, ethTokenPrice, compTokenPrice);

    // Handle token selection from child components
    const handleTokenSelect = useCallback((token: Token) => {
      console.log(`VaultsDetailContainer: Token selected by child component:`, token.symbol);
      setSelectedToken(token);
    }, []);

    return (

      vaultData ? (
        <div className="overflow-x-auto">
          <button
            className="fluid-hover-button rounded-lg flex flex-row items-center gap-2 px-4 py-2 ml-4 md:ml-0 mb-6"
            type="button"
            onClick={() => router.push(backPath)}
          >
            <div className="w-5 h-5 relative z-2">
              <LeftArrowIcon color="white" />
            </div>
            <p className="text-white leading-0 relative z-2">Back to Vaults</p>
          </button>

          <VaultHeader
            vaultData={vaultData}
            userVaultBalance={userVaultBalance}
            selectedVaultId={vaultID.toString()}
            vaultTotalAsset={vaultTotalAsset}
            vaultAPYs={vaultAPYs}
            transactionCompleted={transactionCompleted}
            selectedToken={selectedToken}
          />

          <section className="w-full flex flex-col lg:flex-row gap-4 my-8">
            <div className="w-full">
              <div className="bg-gradient-to-br from-customNeutral300 to-customNeutral200 p-6 rounded-lg shadow-md border border-customNeutral100">
                <h2 className="text-xl font-bold text-teal-400 mb-4">Deposit & Withdraw</h2>
                <div className="bg-customNeutral200 px-6 py-6 rounded-lg border border-customNeutral100">
                  <VaultInputs
                    vaultData={vaultData}
                    setTransactionCompleted={setTransactionCompleted}
                    userVaultBalance={userVaultBalance}
                    vaultTotalAssetinToken={vaultTotalAssetinToken}
                    transactionCompleted={transactionCompleted}
                    initialIsDeposit={initialIsDeposit}
                    onTokenSelect={handleTokenSelect}
                  />
                </div>
              </div>
            </div>
            <div className="w-full mt-8 lg:mt-0 space-y-4">
              <div className="bg-gradient-to-br from-customNeutral300 to-customNeutral200 p-6 rounded-lg shadow-md border border-customNeutral100">
                <h2 className="text-xl font-bold text-teal-400 mb-4">Information</h2>
                <Information vaultData={vaultData} />
              </div>
            </div>
          </section>
        </div>

      )
        : <div></div>

    )
  };

export default VaultsDetailContainer;
