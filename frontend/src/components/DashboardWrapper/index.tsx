"use client";
import { useVaultData } from "@/hooks/useVaultData";
import ProfileInfo from "./components/ProfileInfo";
import PortfolioTabs from "./components/Tabs";
import TopTokens from "./components/TopTokens";

const DashboardWrapper = () => {
  const { loading, vaults, vaultAPYs, userVaultBalances, vaultTotalAssets } =
    useVaultData();

  return (
    <div className="font-gotham">
      <div className="text-white text-[40px] font-bold mb-8">
        <h2>Dashboard</h2>
      </div>

      <div className="mb-[45px]">
        <ProfileInfo />
      </div>

      <div>
        <TopTokens />
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
