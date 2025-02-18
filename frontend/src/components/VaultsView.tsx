import { VaultData, VaultAPY, VaultTotalAssets, VaultTotalAssetsinToken, UserVaultBalance } from "../types/types";
import { Address } from "thirdweb";
import { Account } from "thirdweb/wallets";
import { useRouter } from 'next/navigation';
import Image from "next/image";
import {formatBalance, getOnlyTokenSymbol} from "@/utils/utils";
import {useActiveAccount} from "thirdweb/react";

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
  const activeAccount = useActiveAccount();

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
                  User Deposits
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
                    <div className="flex items-center">
                      <Image src={vault.inputToken.imgURL} width="30" height="30" alt="USD Icon" className="mr-2" />
                      <div>{vault.name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap flex flex-col items-center justify-center text-center">
                    <div className="font-semibold">{Number(vaultTotalAssets.find((asset) => asset.vaultId === vault.id)?.totalAssets).toFixed(6)} {getOnlyTokenSymbol(vault.inputToken.symbol)}</div>
                    {/* <div className="text-sm font-light">$ {Number(vaultTotalAssetsinToken.find((asset) => asset.vaultId === vault.id)?.totalAssetsinToken).toFixed(6)}</div> */}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {(Number(vaultAPYs.find((APY7d) => APY7d.vaultId === vault.id)?.APY7d) * 100).toFixed(2)}%
                  </td>
                  <td className="px-9 py-4 whitespace-nowrap text-center">
                    {
                      activeAccount ?
                          `${formatBalance(Number(userVaultBalances.find((balance) => balance.vaultId === vault.id)?.balance))} ${getOnlyTokenSymbol(vault.inputToken.symbol)}` :
                          ' - '
                    }
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
