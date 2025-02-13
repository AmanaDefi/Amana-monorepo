import { VaultData, VaultAPY, VaultTotalAssets, VaultTotalAssetsinToken, UserVaultBalance } from "../types/types";
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { formatBalance } from "@/utils/utils";
import ResponsiveTooltip from "@/components/common/Tooltip";
import ZetachainLogo from "@public/zetachain.svg";
import Link from "next/link";

interface VaultsViewProps {
  loading: boolean;
  vaults: VaultData[];
  vaultAPYs: VaultAPY[];
  userVaultBalances: UserVaultBalance[];
  vaultTotalAssets: VaultTotalAssets[];
  vaultTotalAssetsinToken: VaultTotalAssetsinToken[];
}

const VaultsView: React.FC<VaultsViewProps> = ({
  loading,
  vaults,
  vaultAPYs,
  userVaultBalances,
  vaultTotalAssets,
  vaultTotalAssetsinToken
}) => {
  const router = useRouter();


  return (
    <div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-black text-zinc-100">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider">
                  Chain
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider">
                  Protocol
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider">
                  Vault
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider">
                  Total Assets
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider">
                  7d APY
                </th>
                <th className="px-9 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider">
                  User Balance
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-300 tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {vaults.map((vault) => (
                <tr key={vault.id}
                  onClick={() => { router.push("/vaults/" + vault.id) }}
                  role="button"
                    className='hover:bg-gray-800 transition-colors'
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {vault.imgURL && <Image src={vault.imgURL} width="30" height="30" alt="USD Icon" className="mr-2 rounded-full w-8 h-8 object-cover" />}
                      {vault.protocol.network}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Image src={vault.protocol.imgURL} width="30" height="30" alt="USD Icon" className="mr-2 rounded-full" />
                      <div>{vault.protocol.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 lg:gap-4 relative">
                      <div className='flex items-center'>
                        <Image src={vault.inputToken.imgURL} width="30" height="30" alt="USD Icon" className="mr-2" />
                        <div>{vault.name}</div>
                      </div>
                      {
                        vault.tags?.length && (
                          <>
                            {
                              vault.tags.includes('UAS') && (
                                <>
                                  <Link href='https://hub.zetachain.com/xp' target='_blank' rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                    <div id={`info-${vault.id}`}
                                         className='flex-center gap-1 bg-themeColor/10 py-1 px-3 rounded-lg'>
                                      <ZetachainLogo width='24' height='24' alt="Zetachain Logo"/>
                                      <span className='text-themeColor font-bold text-sm'>UAS</span>
                                    </div>
                                  </Link>
                                  <ResponsiveTooltip
                                      id={`info-${vault.id}`}
                                      content={
                                        <p className="max-w-[15rem] !text-sm whitespace-normal text-left">
                                          Zetachain Universal App Season - earn extra points &#128293;
                                        </p>
                                    }
                                  />
                                </>
                              )
                            }
                          </>
                        )
                      }
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap flex flex-col items-center justify-center text-center">
                    <div
                        className="font-semibold">{Number(vaultTotalAssets.find((asset) => asset.vaultId === vault.id)?.totalAssets).toFixed(6)} {vault.inputToken.symbol}</div>
                    {/* <div className="text-sm font-light">$ {Number(vaultTotalAssetsinToken.find((asset) => asset.vaultId === vault.id)?.totalAssetsinToken).toFixed(6)}</div> */}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {(Number(vaultAPYs.find((APY7d) => APY7d.vaultId === vault.id)?.APY7d) * 100).toFixed(2)}%
                  </td>
                  <td className="px-9 py-4 whitespace-nowrap text-center">
                    {formatBalance(Number(userVaultBalances.find((balance) => balance.vaultId === vault.id)?.balance))} {vault.inputToken.symbol}
                  </td>
                  <td className='flex items-center justify-center'>
                    <button className="bg-cyan-600 hover:bg-cyan-700 transition-colors text-white font-bold py-1 px-3 rounded">
                      <span className='text-sm'>Visit vault</span>
                    </button>
                  </td>
                </tr>
              ))}

            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VaultsView;
