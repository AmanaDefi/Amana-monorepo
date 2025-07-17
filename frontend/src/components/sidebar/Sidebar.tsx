"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
      initial={{ width: 302 }}
      animate={{ width: isCollapsed ? 136 : 302 }}
      transition={{
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
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

      <AnimatePresence>
        {!isCollapsed && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleSidebar}
            className="absolute top-[54px] right-[29px] z-20 flex-shrink-0 p-1"
          >
            <CloseSidebarIcon width={20} height={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="text-white overflow-hidden">
        <div className="mb-[65px] h-[53px]"></div>

        <AnimatePresence>
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute z-10 top-[160px] right-3"
            >
              <button onClick={toggleSidebar}>
                <OpenSidebarIcon width={20} height={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 overflow-hidden">
          <motion.div
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
              delay: isCollapsed ? 0 : 0.1,
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
