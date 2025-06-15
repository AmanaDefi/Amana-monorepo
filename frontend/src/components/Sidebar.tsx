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
    item.id !== "dashboard" && item.id !== "logout" && item.id !== "earn";

  const commonClasses = `px-[22px] w-full flex items-center rounded-lg h-12 font-bold text-lg transition-all duration-500 ease-in-out relative overflow-hidden ${
    isCollapsed ? "justify-center max-w-[64px]" : "gap-3"
  }`;

  const enabledClasses = "hover:text-white text-gray-400";
  const disabledClasses = "bg-[#35383D] text-gray-400 cursor-not-allowed";

  const baseClasses = `${commonClasses} ${
    isDisabled ? disabledClasses : enabledClasses
  }`;

  const menuItemContent = (
    <>
      <div className="flex items-center flex-shrink-0">
        <item.icon />
      </div>
      <span
        className={`transition-all duration-500 ease-in-out whitespace-nowrap ${
          isCollapsed
            ? "opacity-0 max-w-0 ml-0 overflow-hidden"
            : "opacity-100 max-w-[200px] ml-3"
        }`}
      >
        {item.label}
      </span>
      {isActive && !isDisabled && (
        <div
          className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-[#1B46E0] rounded-sm transition-opacity duration-500 ${
            isCollapsed ? "opacity-0" : "opacity-100"
          }`}
        ></div>
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
        >
          {menuItemContent}
        </button>
      );
    }

    if (item.type === "link" && item.href) {
      return (
        <Link
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
        className={itemSpecificClasses}
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
      className={itemSpecificClasses}
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

  return (
    <div
      ref={sidebarRef}
      className={`rounded-3xl sidebar-shadow bg-[#0D1117] flex flex-col justify-between transition-all duration-500 ease-in-out relative font-gotham overflow-hidden
    hidden md:flex
    ${isCollapsed ? "w-[136px] px-[29px]" : "w-[302px] px-[29px]"}
    py-[54px] h-full
  `}
      style={{
        boxShadow:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 1px 0 2px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="text-white overflow-hidden">
        <div
          className={`flex items-center transition-all duration-500 ease-in-out mb-[65px] ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex-shrink-0">
            <AmanaLogo width={78} height={53} className="w-[78px] h-[53px]" />
          </div>

          <button
            onClick={toggleSidebar}
            className={`transition-all duration-500 ease-in-out flex-shrink-0 p-1 ${
              isCollapsed
                ? "opacity-0 max-w-0 overflow-hidden ml-0"
                : "opacity-100 max-w-[24px] ml-3"
            }`}
          >
            <CloseSidebarIcon width={20} height={20} />
          </button>
        </div>

        <div
          className={`absolute z-10 top-[160px] right-3 transition-all duration-500 ease-in-out ${
            isCollapsed
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <button onClick={toggleSidebar}>
            <OpenSidebarIcon width={24} height={25} />
          </button>
        </div>

        <div className="mb-8 overflow-hidden">
          <div
            className={`text-[24px] font-bold text-white mb-8 transition-all duration-500 ease-in-out whitespace-nowrap ${
              isCollapsed
                ? "opacity-0 max-height-0 overflow-hidden"
                : "opacity-100 max-height-[32px]"
            }`}
          >
            Explore Amana
          </div>

          <nav
            className={`transition-all duration-500 ease-in-out ${
              isCollapsed ? "space-y-4 flex flex-col items-center" : "space-y-4"
            }`}
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

      <div className="flex flex-col items-center overflow-hidden">
        <div
          className={`border-t border-[#535E73] my-4 transition-all duration-500 ease-in-out ${
            isCollapsed ? "w-[64px]" : "w-full"
          }`}
        ></div>
        <nav
          className={`transition-all duration-500 ease-in-out ${
            isCollapsed
              ? "space-y-1 mt-auto flex flex-col items-center"
              : "space-y-1 mt-auto"
          }`}
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
