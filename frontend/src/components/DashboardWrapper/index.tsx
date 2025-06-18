"use client";
import { useVaultData } from "@/hooks/useVaultData";
import ProfileInfo from "./components/ProfileInfo";
import PortfolioTabs from "./components/Tabs";
import TopTokens from "./components/TopTokens";
import ProfitChart from "./components/ProfitChart";

const DashboardWrapper = () => {
  const { loading, vaults, vaultAPYs, userVaultBalances, vaultTotalAssets } =
    useVaultData();

  return (
    <div className="font-gotham">
      <div className="flex flex-row justify-between items-stretch gap-8">
        <div className="flex flex-col min-h-[323px]">
          <div className="text-white text-[40px] font-bold mb-8">
            <h2>Dashboard</h2>
          </div>

          <div className="mb-[45px]">
            <ProfileInfo />
          </div>

          <div>
            <TopTokens />
          </div>
        </div>
        <div className="w-full max-w-[443px] flex pt-6">
          <ProfitChart className="w-full h-full" />
        </div>
      </div>

      <div className="mt-[82px]">
        <PortfolioTabs
          vaults={vaults}
          vaultAPYs={vaultAPYs}
          userVaultBalances={userVaultBalances}
          vaultTotalAssets={vaultTotalAssets}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default DashboardWrapper;
