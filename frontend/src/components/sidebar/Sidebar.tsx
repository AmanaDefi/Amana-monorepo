"use client";

import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { menuItems } from "@/constants/sidebarMenu";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useSidebarActions } from "@/hooks/useSidebarActions";
import SidebarMenuItem from "./SidebarMenuItem";
import MenuNavigation from "./MenuNavigation";
import CloseSidebarIcon from "../svg/CloseSidebarIcon";
import OpenSidebarIcon from "../svg/sidebar/OpenSidebarIcon";

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

  if (!isConnected) return null;

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      ref={sidebarRef}
      className={`min-h-[908px] rounded-3xl sidebar-shadow bg-[#0D1117] flex-col justify-between transition-all duration-500 ease-in-out relative font-gotham overflow-hidden
    hidden lg:flex
    ${isCollapsed ? "w-[136px] px-[29px]" : "w-[302px] px-[29px]"}
    py-[54px] h-full
  `}
      style={{
        boxShadow:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 1px 0 2px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="absolute top-[54px] left-[29px] z-20">
        <AmanaLogo width={78} height={53} className="w-[78px] h-[53px]" />
      </div>

      <button
        onClick={toggleSidebar}
        className={`absolute top-[54px] right-[29px] z-20 flex-shrink-0 p-1 ${
          isCollapsed
            ? "opacity-0 pointer-events-none"
            : "opacity-100 pointer-events-auto"
        }`}
      >
        <CloseSidebarIcon width={20} height={20} />
      </button>

      <div className="text-white overflow-hidden">
        <div
          className={`transition-all duration-500 ease-in-out mb-[65px] ${
            isCollapsed ? "h-[53px]" : "h-[53px]"
          }`}
        ></div>

        <div
          className={`absolute z-10 top-[160px] right-3 ${
            isCollapsed
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
        >
          <button onClick={toggleSidebar}>
            <OpenSidebarIcon width={20} height={20} />
          </button>
        </div>

        <div className="mb-8 overflow-hidden">
          <div
            className={`text-[24px] font-bold text-white mb-8 transition-all duration-200 whitespace-nowrap ${
              isCollapsed
                ? "opacity-0 max-height-0 overflow-hidden"
                : "opacity-100 max-height-[32px]"
            }`}
          >
            Explore Amana
          </div>

          <nav
            className={`transition-all duration-500 ease-in-out ${
              isCollapsed ? "space-y-4 flex flex-col" : "space-y-4"
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

      <MenuNavigation activeSection={activeSection} isCollapsed={isCollapsed} />
    </div>
  );
};

export default Sidebar;
