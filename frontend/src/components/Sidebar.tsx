"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import CloseSidebarIcon from "./svg/CloseSidebarIcon";
import OpenSidebarIcon from "./svg/sidebar/OpenSidebarIcon";
import { bottomMenuItems, menuItems } from "@/constants/sidebarMenu";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useSidebarActions } from "@/hooks/useSidebarActions";

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
  const isDisabled =
    item.id !== "wallet" && item.id !== "logout" && item.id !== "earn";

  const commonClasses = `flex items-center rounded-lg h-12 font-bold text-lg transition-all duration-300 ease-in-out ${
    isCollapsed ? "justify-center w-16" : "gap-3 px-[22px] w-[240px]"
  }`;

  const enabledClasses = "hover:text-white text-gray-400";
  const disabledClasses = "bg-[#35383D] text-gray-400 cursor-not-allowed";

  const baseClasses = `${commonClasses} ${
    isDisabled ? disabledClasses : enabledClasses
  }`;

  const menuItemContent = (
    <>
      <div data-toggle="ignore" className="flex items-center">
        <item.icon />
        <span
          className={`ml-3 transition-all duration-300 ease-in-out ${
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
          }`}
        >
          {item.label}
        </span>
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
          data-toggle="ignore"
          className={baseClasses}
          onClick={isDisabled ? undefined : item.action}
          title={isCollapsed ? item.label : undefined}
          disabled={isDisabled}
        >
          {menuItemContent}
        </button>
      );
    }

    if (item.type === "link" && item.href) {
      return (
        <Link
          data-toggle="ignore"
          href={isDisabled ? "#" : item.href}
          className={baseClasses}
          title={isCollapsed ? item.label : undefined}
          onClick={(e) => {
            if (isDisabled) e.preventDefault();
          }}
        >
          {menuItemContent}
        </Link>
      );
    }

    return null;
  }

  const regularClasses = isDisabled
    ? "bg-[#35383D] text-gray-400 cursor-not-allowed"
    : "text-white hover:menu-item-hover";

  const activeClasses = isDisabled
    ? "bg-[#35383D] text-gray-400 cursor-not-allowed"
    : "menu-item-hover text-white";

  const itemSpecificClasses = `${baseClasses} ${
    isActive ? activeClasses : regularClasses
  }`;

  if (item.type === "button") {
    return (
      <button
        data-toggle="ignore"
        className={`${itemSpecificClasses} relative`}
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
      data-toggle="ignore"
      href={isDisabled ? "#" : item.href!}
      className={`${itemSpecificClasses} relative`}
      onClick={(e) => {
        if (isDisabled) e.preventDefault();
      }}
    >
      {menuItemContent}
    </Link>
  );
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const actions = useSidebarActions();

  const enhancedMenuItems = menuItems.map((item) =>
    item.type === "button"
      ? { ...item, action: actions[item.id as keyof typeof actions] }
      : item,
  );

  const enhancedBottomItems = bottomMenuItems.map((item) =>
    item.id === "logout"
      ? { ...item, action: actions.logout }
      : {
          ...item,
          action: actions[item.id as keyof typeof actions],
        },
  );

  if (!isConnected) return null;

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest("[data-toggle='ignore']")) {
      toggleSidebar();
    }
  };

  return (
    <div
      ref={sidebarRef}
      onClick={handleClick}
      className={`rounded-3xl sidebar-shadow bg-[#0D1117] flex flex-col justify-between transition-all duration-500 ease-in-out relative font-gotham ${
        isCollapsed
          ? "w-[136px] h-[972px] py-[48px] px-[20px]"
          : "w-[302px] h-[972px] py-[54px] px-[29px]"
      }`}
      style={{
        boxShadow:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="text-white">
        <div
          className={`flex items-center transition-all duration-300 ease-in-out ${
            isCollapsed
              ? "justify-center mb-[124px]"
              : "justify-between mb-[65px]"
          }`}
        >
          <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />

          <button
            data-toggle="ignore"
            onClick={toggleSidebar}
            className={`transition-opacity duration-300 ease-in-out ${
              isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <CloseSidebarIcon width={24} height={25} />
          </button>
        </div>

        <div
          className={`absolute top-[110px] right-4 transition-opacity duration-300 ease-in-out ${
            isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <button data-toggle="ignore" onClick={toggleSidebar}>
            <OpenSidebarIcon width={24} height={25} />
          </button>
        </div>

        <div className="mb-8">
          <span
            className={`text-[24px] font-bold text-white mb-8 block transition-all duration-300 ease-in-out ${
              isCollapsed
                ? "opacity-0 w-0 overflow-hidden"
                : "opacity-100 min-w-[200px]"
            }`}
          >
            Explore Amana
          </span>

          <nav
            className={
              isCollapsed ? "space-y-4 flex flex-col items-center" : "space-y-4"
            }
          >
            {enhancedMenuItems.map((item) => (
              <SidebarMenuItem
                key={item.id}
                item={item}
                isActive={
                  activeSection === item.id ||
                  (!activeSection && item.id === "earn")
                }
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
          {enhancedBottomItems.map((item) => (
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
