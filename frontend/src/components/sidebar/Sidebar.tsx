"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
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
    <motion.div
      ref={sidebarRef}
      initial={{
        width: 302,
        opacity: 0,
        x: -50,
        scale: 0.95,
      }}
      animate={{
        width: isCollapsed ? 136 : 302,
        opacity: 1,
        x: 0,
        scale: 1,
      }}
      transition={{
        duration: 0.8,
        ease: "easeInOut",
      }}
      className="min-h-[908px] rounded-3xl sidebar-shadow bg-[#0D1117] flex-col justify-between relative font-gotham overflow-hidden hidden lg:flex px-[29px] py-[54px] h-full"
      style={{
        boxShadow:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1), 1px 0 2px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="absolute top-[54px] left-[29px] z-20">
        <AmanaLogo width={78} height={53} className="w-[78px] h-[53px]" />
      </div>
      {!isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="absolute top-[54px] right-[29px] z-20 flex-shrink-0 p-1  rounded-md transition-colors duration-200 group"
        >
          <CloseSidebarIcon width={20} height={20} />
          <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            Minimise
          </span>
        </button>
      )}

      <div className="text-white overflow-hidden">
        <div className="mb-[65px] h-[53px]"></div>
        {isCollapsed && (
          <div className="absolute z-10 top-[160px] right-3">
            <button
              onClick={toggleSidebar}
              className="p-1  rounded-md transition-colors duration-200 group"
            >
              <OpenSidebarIcon width={20} height={20} />
              <span className="absolute bottom-full right-0 mb-2 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                Maximise
              </span>
            </button>
          </div>
        )}

        <div className="mb-8 overflow-hidden">
          <motion.div
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
              delay: isCollapsed ? 0.2 : 0.2,
            }}
            className="text-[24px] font-bold text-white mb-8 whitespace-nowrap"
          >
            Explore Amana
          </motion.div>

          <nav className="space-y-4">
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
    </motion.div>
  );
};

export default Sidebar;