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
    <div className={cn("flex border-b border-[#2A2F3A]", className)}>
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
        "px-6 py-3 text-base font-medium transition-all duration-200 relative",
        isActive ? "text-white" : "text-[#6B7280] hover:text-[#9CA3AF]",
        className,
      )}
    >
      {children}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1B46E0] rounded-t-sm" />
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
        "bg-[#0F1419] border border-[#2A2F3A] rounded-2xl p-12 min-h-[400px]",
        "flex flex-col items-center justify-center",
        className,
      )}
    >
      <h3 className="text-2xl font-semibold text-white mb-3 text-center">
        {title}
      </h3>

      <p className="text-[#6B7280] text-center mb-8 max-w-md">{description}</p>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "bg-[#1B46E0] text-white px-8 py-4 rounded-xl font-medium text-base",
            "hover:bg-[#1640CC] active:bg-[#1437B8]",
            "transition-all duration-200 ease-in-out",
            "shadow-[0_4px_12px_rgba(27,70,224,0.3)]",
            "hover:shadow-[0_6px_16px_rgba(27,70,224,0.4)]",
          )}
        >
          {action.label}
        </button>
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
