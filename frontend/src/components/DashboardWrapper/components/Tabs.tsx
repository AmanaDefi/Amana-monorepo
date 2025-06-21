"use client";
import React, { useState, useMemo } from "react";
import cn from "classnames";
import { useTabsStore } from "@/store/portfolioTabsStore";
import type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
  EmptyStateProps,
} from "@/types/dasboard";
import type {
  VaultData,
  VaultAPY,
  VaultTotalAssets,
  UserVaultBalance,
} from "@/types/types";
import Button from "@/components/Button";
import { WalletIcon } from "@/components/svg/sidebar/WalletIcon";
import { useMyVaults } from "@/hooks/useMyVaults";
import { VaultCard } from "@/components/VaultsWrapper/components/VaultCard";
import {
  MOCK_TRANSACTIONS,
  type Transaction,
} from "@/constants/mockTransactions";
import { useUserTransactionsHistory } from "@/hooks/hooks";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { formatTimestamp, convertStringToBalance } from "@/utils/graphUtils";
import Image from "next/image";
import ProfileCircle from "@/components/svg/ProfileCircle";
import TransactionDetailsIcon from "@/components/svg/TransactionDetailsIcon";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";


const ZetaChainIcon = "/ZetaChain.webp";

const Tabs: React.FC<TabsProps> = ({
  children,
  defaultValue = "portfolio",
  className,
}) => {
  const setActiveTab = useTabsStore((state) => state.setActiveTab);

  React.useEffect(() => {
    setActiveTab(defaultValue);
  }, [defaultValue, setActiveTab]);

  return <div className={cn("w-full", className)}>{children}</div>;
};

const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div className={cn("flex gap-12 border-b-2 border-[#161C27]", className)}>
      {children}
    </div>
  );
};

const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className,
}) => {
  const { activeTab, setActiveTab } = useTabsStore();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        "pb-4 text-base font-normal transition-all duration-200 relative",
        isActive ? "text-white" : "hover:text-[#9CA3AF]",
        className,
      )}
    >
      {children}
      {isActive && (
        <div className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[#1B46E0] rounded-[4px] w-[90px]" />
      )}
    </button>
  );
};

const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className,
}) => {
  const activeTab = useTabsStore((state) => state.activeTab);

  if (activeTab !== value) return null;

  return <div className={cn("mt-8", className)}>{children}</div>;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "backdrop-blur-[20px] shadow-custom bg-[rgba(20,23,31,0.15)] border border-[#3E3C59] rounded-[24px] min-h-[450px]",
        "flex flex-col items-center justify-center",
        className,
      )}
    >
      <div className="bg-[#14171F] border border-[#3E73C4] rounded-[8px] w-12 h-12 flex items-center justify-center mb-8">
        <WalletIcon width={26} height={27} />
      </div>

      <h3 className="text-2xl font-medium text-white mb-4 text-center">
        {title}
      </h3>

      <p className="text-[#535E73] text-[16px] text-center mb-6 font-normal">
        {description}
      </p>

      {action && (
        <Button
          variant="custom"
          onClick={action.onClick}
          className="!w-[412px] !h-10 !text-[16px] !font-normal !font-gotham"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

// Transaction Item Component
const TransactionItem: React.FC<{ transaction: Transaction }> = ({
  transaction,
}) => {
  const handleDetailsClick = () => {
    // Disabled for now
    console.log("Transaction details:", transaction.id);
  };

  return (
    <div className="flex items-center justify-between text-white">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center">
          <Image
            src={ZetaChainIcon}
            alt="ZetaChainIcon"
            width={44}
            height={44}
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center">
            <span className="font-bold text-lg capitalize">
              {transaction.type}
            </span>
          </div>

          <div className="text-sm">
            <span className="">{transaction.timestamp}</span>
          </div>
        </div>
      </div>

      {/* From Address */}
      <div className="flex gap-3 text-sm text-white">
        <ProfileCircle width={44} height={44} />
        <div className="flex flex-col gap-1 justify-start">
          <span className="font-bold text-lg">From</span>
          <span>{transaction.from}</span>
        </div>
      </div>

      <button
        onClick={handleDetailsClick}
        disabled={true}
        className="p-2 text-[#9A9CB3] cursor-not-allowed"
      >
        <TransactionDetailsIcon width={20} height={20} />
      </button>
    </div>
  );
};

interface PortfolioTabsProps {
  vaults?: VaultData[];
  vaultAPYs?: VaultAPY[];
  userVaultBalances?: UserVaultBalance[];
  vaultTotalAssets?: VaultTotalAssets[];
  loading?: boolean;
  transactions?: Transaction[]; // New prop for when backend is ready
}

const PortfolioTabs: React.FC<PortfolioTabsProps> = ({
  vaults = [],
  vaultAPYs = [],
  userVaultBalances = [],
  vaultTotalAssets = [],
  loading = false,
  transactions,
}) => {
  const router = useRouter()
  const myVaults = useMyVaults({ vaults, userVaultBalances });
  const { walletAddress } = useMultiChain();

  const [networkSearchQuery, setNetworkSearchQuery] = useState("");

  const { 
    deposits, 
    withdrawals, 
    isLoading: txLoading, 
    hasData 
  } = useUserTransactionsHistory(walletAddress || undefined);

  // Combine transactions and convert format
  const subgraphTransactions = useMemo((): Transaction[] => {
    const allTxs: Transaction[] = [
      ...deposits.map(dep => ({
        id: dep.id,
        type: 'received' as const,
        timestamp: formatTimestamp(dep.timestamp),
        from: dep.user,
        amount: convertStringToBalance(dep.amount, dep.vault.assetDecimals).formatted,
        token: dep.vault.assetSymbol,
        status: 'completed' as const
      })),
      ...withdrawals.map(wit => ({
        id: wit.id,
        type: 'sent' as const,
        timestamp: formatTimestamp(wit.timestamp),
        from: wit.user,
        amount: convertStringToBalance(wit.amount, wit.vault.assetDecimals).formatted,
        token: wit.vault.assetSymbol,
        status: 'completed' as const
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return allTxs;
  }, [deposits, withdrawals]);

  // Choose transaction source: subgraph, passed through props or mock data
  const displayTransactions = hasData 
    ? subgraphTransactions 
    : (transactions || MOCK_TRANSACTIONS);

  const handleEarningClick = () => {
    router.push("/");
  };

  return (
    <Tabs defaultValue="portfolio">
      <TabsList>
        <TabsTrigger value="portfolio">
          Portfolio {myVaults.length > 0 && `(${myVaults.length})`}
        </TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="portfolio">
        {myVaults.length === 0 ? (
          <EmptyState
            title="No positions"
            description="This account has not yet added any assets"
            action={{
              label: "Earning in one click",
              onClick: handleEarningClick,
            }}
          />
        ) : (
          <div className="space-y-6">
            
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
              }}
            >
              {myVaults.map((vault) => (
                <VaultCard
                  key={vault.id}
                  vault={vault}
                  vaultAPYs={vaultAPYs}
                  vaultTotalAssets={vaultTotalAssets}
                  userVaultBalances={userVaultBalances}
                />
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="history">
        {displayTransactions.length === 0 ? (
          <EmptyState
            title="No history"
            description="You haven't made any transactions yet"
          />
        ) : (
          <div>
            <div className="flex justify-end mb-6">
              <div className="relative max-w-[340px] w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-[#535E73]" />
                </div>
                <input
                  type="text"
                  placeholder="Search name or paste address"
                  value={networkSearchQuery}
                  onChange={(e) => setNetworkSearchQuery(e.target.value)}
                  className="w-full rounded-[8px] pl-10 pr-4 py-3 text-[16px] font-normal text-white placeholder-[#535E73] bg-[#161C27] border border-[#2C2F36] transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4]"
                />
              </div>
            </div>

            <div className="space-y-6">
              {displayTransactions.map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default PortfolioTabs;
export { useTabsStore };
export type { Transaction };
