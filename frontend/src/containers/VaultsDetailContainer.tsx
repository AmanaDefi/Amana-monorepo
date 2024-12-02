import { useState, useEffect } from "react";
import LeftArrowIcon from "@/components/svg/LeftArrowIcon";
import VaultHeader from "@/components/VaultHeader";
import VaultInputs from "@/components/VaultInputs";
import { VaultData, VaultAPY, UserVaultBalance, VaultTotalAssets, VaultTotalAssetsinToken, Token } from "../types/types";
import { VAULT_DATA } from "../constants/index";
import { useActiveAccount } from "thirdweb/react";
import { Account } from "thirdweb/wallets";
import { useUpdateVaultBalanceAndTotal, useUpdateAPYs } from "@/hooks/hooks";
import { tokens } from "../constants/index";
import { useRouter } from 'next/navigation';

const VaultsDetailContainer: React.FC<{
  vaultID: string | string[];
}> = ({
  vaultID
}) => {

    const [vaultData, setVaultData] = useState<VaultData>();
    const [tokenOptions, setTokenOptions] = useState<Token[]>(tokens);
    const router = useRouter();

    const [loading, setLoading] = useState<boolean>(true);
    const [activeAccount, setActiveAccount] = useState<Account | null>(null);
    const [vaultAPYs, setVaultAPYs] = useState<VaultAPY[]>([]);
    const [userVaultBalances, setUserVaultBalances] = useState<UserVaultBalance[]>([]);
    const [vaultTotalAssets, setVaultTotalAssets] = useState<VaultTotalAssets[]>([]);
    const [vaultTotalAssetsinToken, setVaultTotalAssetsinToken] = useState<VaultTotalAssetsinToken[]>([]);
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

    useUpdateVaultBalanceAndTotal(vaults, EOAaccount, setUserVaultBalances, setVaultTotalAssets, setVaultTotalAssetsinToken, transactionCompleted);
    useUpdateAPYs(vaults, setVaultAPYs, setLoading);

    return (

      vaultData ? (
        <div className="overflow-x-auto">
          <button
            className="border border-customGray500 rounded-lg flex flex-row items-center px-4 py-2 ml-4 md:ml-0"
            type="button"
            onClick={() => router.push("/vaults")}
          >
            <div className="w-5 h-5">
              <LeftArrowIcon color="white" />
            </div>
            <p className="text-white leading-0 mt-1 ml-2">Back to Vaults</p>
          </button>

          <VaultHeader
            vaultData={vaultData}
            userVaultBalances={userVaultBalances}
            selectedVaultId={vaultID.toString()}
            vaultTotalAssets={vaultTotalAssets}
            vaultAPYs={vaultAPYs}
          />

          <section className="w-full md:flex md:flex-row md:justify-between md:space-x-8 py-10 px-4 md:px-0">
            <div className="w-full md:w-1/3">
              <div className="bg-customNeutral200 p-6 rounded-lg">
                <div className="bg-customNeutral300 px-6 py-6 rounded-lg">
                  <VaultInputs
                    vaultData={vaultData}
                    tokenOptions={tokenOptions}
                    setTransactionCompleted={setTransactionCompleted}
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-2/3 mt-8 md:mt-0 space-y-4">
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
                    <p className="text-white font-normal mt-1">{vaultData.id}</p>
                    <p className="text-white font-bold mt-5">input Token</p>
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
