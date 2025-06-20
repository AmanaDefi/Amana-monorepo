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
      {/* Mobile: Full width stack, Desktop: Flex row */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-stretch md:gap-8">
        <div className="flex flex-col w-full md:w-auto md:min-h-[323px]">
          <div className="hidden md:block text-white text-[40px] font-bold mb-8">
            <h2>Dashboard</h2>
          </div>

          <div className="mb-8 md:mb-[45px]">
            <ProfileInfo />
          </div>

          <div className="w-full md:w-auto">
            <TopTokens />
          </div>
        </div>

        <div className="hidden xl:flex w-full max-w-[443px] pt-6">
          <ProfitChart className="w-full h-full" />
        </div>
      </div>

      <div className="mt-10 md:mt-[82px]">
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
