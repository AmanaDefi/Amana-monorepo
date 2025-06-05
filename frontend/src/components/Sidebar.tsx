"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import CloseSidebarIcon from "./svg/CloseSidebarIcon";
import { bottomMenuItems, menuItems } from "@/config.ts/sidebarMenu";
import { useMultiChain } from "@/providers/MultiChainProvider";

interface SidebarMenuItemProps {
  item: {
    id: string;
    label: string;
    icon: React.ComponentType;
    type: "link" | "button";
    href?: string;
    action?: () => void;
  };
  isActive: boolean;
  isBottomMenu?: boolean;
  isCollapsed?: boolean;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  item,
  isActive,
  isBottomMenu = false,
  isCollapsed = false,
}) => {
  const isDisabled = item.id !== "wallet" && item.id !== "logout";

  const commonClasses = isCollapsed
    ? "flex items-center justify-center rounded-lg w-16 h-12 font-bold text-lg transition-all"
    : "flex items-center gap-3 rounded-lg px-[22px] py-2 w-[240px] h-12 font-bold text-lg transition-all";

  const enabledClasses = "hover:text-white text-gray-400";
  const disabledClasses = "bg-[#35383D] text-gray-400 cursor-not-allowed";

  const baseClasses = `${commonClasses} ${isDisabled ? disabledClasses : enabledClasses}`;

  const menuItemContent = (
    <>
      <div
        className={
          isCollapsed
            ? "flex items-center justify-center"
            : "flex items-center gap-3 px-3"
        }
      >
        <item.icon />
        {!isCollapsed && <span>{item.label}</span>}
      </div>
      {isActive && !isDisabled && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-[#1B46E0] rounded-sm"></div>
      )}
    </>
  );

  if (isBottomMenu) {
    if (item.type === "button") {
      return (
        <button
          className={baseClasses}
          onClick={isDisabled ? undefined : item.action}
          title={isCollapsed ? item.label : undefined}
          disabled={isDisabled}
          style={isCollapsed ? { padding: "12px 20px" } : undefined}
        >
          <item.icon />
          {!isCollapsed && <span>{item.label}</span>}
        </button>
      );
    }

    if (item.type === "link" && item.href) {
      return (
        <Link
          href={isDisabled ? "#" : item.href}
          className={baseClasses}
          title={isCollapsed ? item.label : undefined}
          style={isCollapsed ? { padding: "12px 20px" } : undefined}
          onClick={(e) => {
            if (isDisabled) e.preventDefault();
          }}
        >
          <item.icon />
          {!isCollapsed && <span>{item.label}</span>}
        </Link>
      );
    }

    return null;
  }

  if (!isBottomMenu) {
    const regularClasses = isDisabled
      ? "bg-[#35383D] text-gray-400 cursor-not-allowed"
      : "text-white hover:menu-item-hover";

    const activeClasses = isDisabled
      ? "bg-[#35383D] text-gray-400 cursor-not-allowed"
      : "menu-item-hover text-white";

    const baseClasses = `${commonClasses} ${
      isActive ? activeClasses : regularClasses
    }`;

    if (item.type === "button") {
      return (
        <button
          className={`${baseClasses} relative`}
          onClick={isDisabled ? undefined : item.action}
          title={isCollapsed ? item.label : undefined}
          disabled={isDisabled}
        >
          {menuItemContent}
        </button>
      );
    }

    return (
      <Link
        href={isDisabled ? "#" : item.href!}
        className={`${baseClasses} relative`}
        onClick={(e) => {
          if (isDisabled) e.preventDefault();
        }}
      >
        {menuItemContent}
      </Link>
    );
  }
};

const Sidebar = ({
  activeSection,
  onSectionChange,
  isCollapsed,
  setIsCollapsed,
}: {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}) => {
  const pathname = usePathname();
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;

  if (!isConnected) {
    return null;
  }

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`rounded-3xl sidebar-shadow bg-[#0D1117] flex flex-col justify-between transition-all duration-500 relative ${
        isCollapsed
          ? "w-[136px] h-[1001px] py-[48px] px-[20px]"
          : "w-[302px] h-[972px] py-[54px] px-[29px]"
      }`}
      style={{
        boxShadow:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="text-white">
        <div
          className={`flex items-center ${isCollapsed ? "justify-center mb-[124px]" : "justify-between mb-[65px]"}`}
        >
          <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />

          {!isCollapsed && (
            <button onClick={toggleSidebar}>
              <CloseSidebarIcon width={24} height={25} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <div className="absolute top-[110px] right-4">
            <button onClick={toggleSidebar}>
              <CloseSidebarIcon width={24} height={25} />
            </button>
          </div>
        )}

        <div className="mb-8">
          {!isCollapsed && (
            <span className="text-[24px] font-bold text-white mb-8 block min-w-[200px]">
              Explore Amana
            </span>
          )}
          <nav
            className={
              isCollapsed ? "space-y-4 flex flex-col items-center" : "space-y-4"
            }
          >
            {menuItems.map((item) => (
              <SidebarMenuItem
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                isCollapsed={isCollapsed}
              />
            ))}
          </nav>
        </div>
      </div>
      <div>
        <div className="border-t border-[#535E73] my-4"></div>
        <nav
          className={
            isCollapsed
              ? "space-y-1 mt-auto flex flex-col items-center"
              : "space-y-1 mt-auto"
          }
        >
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              isCollapsed={isCollapsed}
              isBottomMenu={true}
            />
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
