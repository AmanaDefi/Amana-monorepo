"use client";
import React from "react";
import cn from "classnames";
import { useTabsStore } from "@/store/portfolioTabsStore";
import type {
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
  EmptyStateProps,
} from "@/types/dasboard";
import Button from "@/components/Button";
import WalletConnectIcon from "@/components/svg/WalletConnectIcon";
import { WalletIcon } from "@/components/svg/sidebar/WalletIcon";

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
        "pb-4  text-base font-normal transition-all duration-200 relative",
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

const EmptyState: React.FC<EmptyStateProps> = ({
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

const PortfolioTabs: React.FC = () => {
  const handleEarningClick = () => {
    console.log("Earning in one click clicked");
  };

  return (
    <Tabs defaultValue="portfolio">
      <TabsList>
        <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="portfolio">
        <EmptyState
          title="No positions"
          description="This account has not yet added any assets"
          action={{
            label: "Earning in one click",
            onClick: handleEarningClick,
          }}
        />
      </TabsContent>

      <TabsContent value="history">
        <EmptyState
          title="No history"
          description="You haven't made any transactions yet"
        />
      </TabsContent>
    </Tabs>
  );
};

export default PortfolioTabs;
export { useTabsStore };
