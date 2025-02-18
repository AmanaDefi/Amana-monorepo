import {useState, useEffect, useMemo} from "react";
import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import VaultHeader from "@/components/VaultHeader";
import VaultInputs from "@/components/VaultInputs";
import { VaultData, VaultAPY, VaultTotalAssets, VaultTotalAssetsinToken, Token } from "@/types/types";
import { VAULT_DATA } from "@/constants";
import {useActiveAccount, useActiveWalletChain} from "thirdweb/react";
import { Account } from "thirdweb/wallets";
import { useUpdateVaultBalanceAndTotalPerVault, useUpdateAPYs } from "@/hooks/hooks";
import { useRouter } from 'next/navigation';
import {CHAINS_EXPLORER_BASE_URL_MAINNET} from "@/constants/chainConfig";
import {ArrowTopRightOnSquareIcon} from "@heroicons/react/24/solid";
import Link from "next/link";

const VaultsDetailContainer: React.FC<{
  vaultID: string | string[];
}> = ({
  vaultID
}) => {
    const [vaultData, setVaultData] = useState<VaultData>();
    const router = useRouter();
    const activeChain = useActiveWalletChain();

    const [loading, setLoading] = useState<boolean>(true);
    const [activeAccount, setActiveAccount] = useState<Account | null>(null);
    const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
    const [userVaultBalance, setUserVaultBalance] = useState<string>();
    const [vaultTotalAsset, setVaultTotalAsset] = useState<VaultTotalAssets>();
    const [vaultTotalAssetinToken, setVaultTotalAssetinToken] = useState<VaultTotalAssetsinToken>();
    const [transactionCompleted, setTransactionCompleted] = useState(false);


    const vaults: VaultData[] = VAULT_DATA;
    const EOAaccount = useActiveAccount();

    useEffect(() => {
      const foundVault = vaults.find((v) => v.id === vaultID.toString());
      setVaultData(foundVault)
    }, [])

    useEffect(() => {
      if (EOAaccount) {
        setActiveAccount(EOAaccount);
      } else {
        setActiveAccount(null);
      }
    }, [EOAaccount]);

    if (!EOAaccount) {
      throw new Error("No active account found");
    }

    const strategyExplorerBaseUrl = useMemo(() => {
        if (!vaultData?.protocol?.chainId) return "";
        return CHAINS_EXPLORER_BASE_URL_MAINNET[vaultData.protocol.chainId] ?? "";
    }, [vaultData?.protocol?.chainId])

    const vaultExplorerBaseUrl = CHAINS_EXPLORER_BASE_URL_MAINNET[7000]

    useUpdateVaultBalanceAndTotalPerVault(vaultData, EOAaccount, setUserVaultBalance, setVaultTotalAsset, setVaultTotalAssetinToken, transactionCompleted);
    useUpdateAPYs(vaults, setVaultAPYs, setLoading);
    return (

      vaultData ? (
        <div className="overflow-x-auto">
          <button
            className="border border-customGray500 hover:bg-gray-800 rounded-lg transition-colors flex flex-row items-center gap-2 px-4 py-2 ml-4 md:ml-0"
            type="button"
            onClick={() => router.push("/")}
          >
            <div className="w-5 h-5">
              <LeftArrowIcon color="white" />
            </div>
            <p className="text-white leading-0">Back to Vaults</p>
          </button>

          <VaultHeader
            vaultData={vaultData}
            userVaultBalance={userVaultBalance}
            selectedVaultId={vaultID.toString()}
            vaultTotalAsset={vaultTotalAsset}
            vaultAPYs={vaultAPYs}
            transactionCompleted={transactionCompleted}
          />

          <section className="w-full md:flex md:flex-row md:justify-between md:space-x-8 py-10 px-4 md:px-0">
            <div className="w-full md:w-1/2">
              <div className="bg-customNeutral200 p-6 rounded-lg">
                <div className="bg-customNeutral300 px-6 py-6 rounded-lg">
                  <VaultInputs
                    vaultData={vaultData}
                    setTransactionCompleted={setTransactionCompleted}
                    userVaultBalance={userVaultBalance}
                    vaultTotalAssetinToken={vaultTotalAssetinToken}
                    transactionCompleted={transactionCompleted}
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 mt-8 md:mt-0 space-y-4">
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
                            <ArrowTopRightOnSquareIcon width='20' height='20' className='size-5'/>
                        </Link>
                        <p className="text-white font-bold mt-5">Strategy Address</p>
                        <Link href={`${strategyExplorerBaseUrl}/address/${vaultData.protocol.strategyAddress}`}
                              className='flex items-center gap-1 group text-white underline-offset-2 hover:underline'
                              target='_blank' rel="noopener noreferrer">
                            <p className="font-normal mt-1">{vaultData.protocol.strategyAddress}</p>
                            <ArrowTopRightOnSquareIcon width='20' height='20' className='size-5'/>
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
