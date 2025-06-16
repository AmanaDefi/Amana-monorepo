import { ReactNode } from "react";

export interface TabsStore {
  activeTab: TabValueType;
  setActiveTab: (tab: TabValueType) => void;
}

export interface TabsProps {
  children: ReactNode;
  defaultValue?: TabValueType;
  className?: string;
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  value: TabValueType;
  children: ReactNode;
  className?: string;
}

export interface TabsContentProps {
  value: TabValueType;
  children: ReactNode;
  className?: string;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export enum TabValue {
  PORTFOLIO = "portfolio",
  HISTORY = "history",
}

export type TabValueType = "portfolio" | "history";
