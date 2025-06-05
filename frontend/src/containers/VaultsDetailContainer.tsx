import {useState, useEffect, useMemo, useCallback} from "react";
import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import VaultHeader from "@/components/VaultHeader";
import VaultInputs from "@/components/VaultInputs";
import { VaultData, VaultAPY, VaultTotalAssets, VaultTotalAssetsinToken, Token, Balance, ITxLocalStorage, Tabs } from "@/types/types";
import { VAULT_DATA } from "@/constants";
import { useUpdateVaultBalanceAndTotalPerVault, useUpdateAPYs } from "@/hooks/hooks";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CHAINS_EXPLORER_BASE_URL_MAINNET } from "@/constants/chainConfig";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { useTokenPriceBySymbol } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { bigIntReplacer, bigIntReviver } from "@/utils/utils";
import { CheckTheTxIsInProgress, getLocalStorageObject, updateLocalStorageObject } from "@/utils/localStorageUtils";

const VaultsDetailContainer: React.FC<{
  vaultID: string | string[];
  setVaultSymbol?: (symbol: string) => void;
}> = ({ vaultID, setVaultSymbol }) => {
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

    const currentVault = useMemo(() =>{
      return vaultData ? [vaultData] : null}, [vaultData])

    const vaults: VaultData[] = VAULT_DATA;
    const backPath: string = pathname.includes("old-vaults") ? "/old-vaults" : "/";
    const { walletAddress } = useMultiChain();

    useEffect(() => {
      const foundVault = vaults.find((v) => v.id === vaultID.toString());

      if (foundVault) {
        setVaultData(foundVault);
      }

      if (vaultID) {
        const vaultInfo = getLocalStorageObject(vaultID.toString())
        const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString())
        if (isTxInProgress) {
          if (vaultInfo?.selectedToken) {
            setSelectedToken(JSON.parse(vaultInfo.selectedToken, bigIntReviver));
          }
          setTransactionCompleted(vaultInfo?.transactionCompleted ?? false)
        } else {
          localStorage.removeItem(vaultID.toString());
          updateLocalStorageObject(vaultID.toString(), {tab: initialIsDeposit ? Tabs.DEPOSIT : Tabs.WITHDRAW})
        }
      }
    }, [vaultID, initialIsDeposit, vaults]);

    const strategyExplorerBaseUrl = useMemo(() => {
      if (!vaultData?.protocol?.chainId) return "";
      return CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] ?? "";
    }, [vaultData?.protocol?.chainId])

    const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000]

    // Always call the hook unconditionally, but pass empty/default values when vaultData is undefined
    useUpdateVaultBalanceAndTotalPerVault(vaultData || null, walletAddress, setUserVaultBalance, setVaultTotalAsset, setVaultTotalAssetinToken, transactionCompleted);

    // Get token price for USD conversion
    const vaultTokenPrice = useTokenPriceBySymbol(vaultData?.inputToken.symbol);

    // Log detailed vault deposit information
    useEffect(() => {
      if (userVaultBalance && vaultData) {
        const rawBalance = typeof userVaultBalance === 'string' ? userVaultBalance : userVaultBalance.formatted;
        const usdValue = Number(rawBalance) * (vaultTokenPrice || 0);

        console.log(`Vault Deposit Details for ${vaultData.name}:`, {
          vaultId: vaultData.id,
          tokenSymbol: vaultData.inputToken.symbol,
          rawBalance: rawBalance,
          usdValue: `$${usdValue.toFixed(2)}`,
          tokenPrice: `$${vaultTokenPrice || 0}`
        });
      }
    }, [userVaultBalance, vaultData, vaultTokenPrice]);

    const crvTokenPrice = useTokenPriceBySymbol("CRV");
    const cvxTokenPrice = useTokenPriceBySymbol("CVX");
    const ethTokenPrice = useTokenPriceBySymbol("ETH");
    const compTokenPrice = useTokenPriceBySymbol("COMP");
    const opTokenPrice = useTokenPriceBySymbol("OP");
    useUpdateAPYs(currentVault, setVaultAPYs, setLoading, crvTokenPrice, cvxTokenPrice, ethTokenPrice, compTokenPrice, opTokenPrice);

    // Handle token selection from child components
    const handleTokenSelect = useCallback((token: Token) => {
        setSelectedToken(token);
        updateLocalStorageObject(vaultID.toString(), {selectedToken: JSON.stringify(token, bigIntReplacer)})
    }, [vaultID]);

    const handleBack = () => {
      const isTxInProgress = CheckTheTxIsInProgress(vaultID.toString())
      if (!isTxInProgress) {
        localStorage.removeItem(vaultID.toString())
      }
      router.push(backPath)
    }

    return (
      vaultData ? (
        <div className="overflow-x-auto">
          <button
            className="fluid-hover-button rounded-lg flex flex-row items-center gap-2 px-4 py-2 ml-4 md:ml-0"
            type="button"
            onClick={handleBack}
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

          <section className="w-full flex flex-col lg:flex-row gap-4 my-4 ">
            <div className="w-full ">
              <div className="bg-customNeutral200 p-6 rounded-lg">
                <div className="bg-customNeutral300 px-6 py-6 rounded-lg">
                  <VaultInputs
                    vaultData={vaultData}
                    setTransactionCompleted={setTransactionCompleted}
                    userVaultBalance={userVaultBalance}
                    vaultTotalAssetinToken={vaultTotalAssetinToken}
                    transactionCompleted={transactionCompleted}
                    initialIsDeposit={initialIsDeposit}
                    onTokenSelect={handleTokenSelect}
                    selectedToken={selectedToken}
                  />
                </div>
              </div>
            </div>
            <div className="w-full mt-8 md:mt-0 space-y-4">
              <div className="bg-customNeutral200 p-6 rounded-lg">
                <p className="text-white text-2xl font-bold">Information</p>
                <div className="md:flex md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4 mt-4">
                  <div className="w-full md:w-10/12 border border-customNeutral100 rounded-lg p-4">
                    <p className="text-white font-bold">{vaultData.name}</p>
                    <p className="text-white font-normal mt-1">{vaultData.des}</p>
                    <p className="text-white font-bold mt-5">{vaultData.protocol.name}</p>
                    <p className="text-white font-normal mt-1">{vaultData.protocol.des}</p>
                    <p className="text-white font-bold mt-5">{vaultData.protocol.network}</p>
                    <p className="text-white font-normal mt-1">{vaultData.protocol.netdes}</p>
                    <p className="text-white font-bold mt-5">Vault Address</p>
                    <Link href={`${vaultExplorerBaseUrl}/address/${vaultData.id}`}
                      className='flex items-center gap-1 group text-white underline-offset-2 hover:underline'
                      target='_blank' rel="noopener noreferrer">
                      <p className="font-normal mt-1">{vaultData.id}</p>
                      <ArrowTopRightOnSquareIcon width='20' height='20' className='size-5' />
                    </Link>
                    <p className="text-white font-bold mt-5">Strategy Address</p>
                    <Link href={`${strategyExplorerBaseUrl}/address/${vaultData.protocol.strategyAddress}`}
                      className='flex items-center gap-1 group text-white underline-offset-2 hover:underline'
                      target='_blank' rel="noopener noreferrer">
                      <p className="font-normal mt-1">{vaultData.protocol.strategyAddress}</p>
                      <ArrowTopRightOnSquareIcon width='20' height='20' className='size-5' />
                    </Link>
                    <p className="text-white font-bold mt-5">Input Token</p>
                    <p className="text-white font-normal mt-1">{vaultData.inputToken.symbol}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

      )
        : <div></div>

    )
  };

export default VaultsDetailContainer;
