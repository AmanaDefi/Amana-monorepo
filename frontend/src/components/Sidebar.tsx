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
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  item,
  isActive,
  isBottomMenu = false,
}) => {
  if (isBottomMenu) {
    const bottomClasses =
      "flex items-center gap-3 rounded-lg px-[22px] py-2 w-[240px] h-12 font-bold text-lg text-gray-400 transition-all hover:text-white";

    if (item.type === "button") {
      return (
        <button className={bottomClasses} onClick={item.action}>
          <item.icon />
          <span>{item.label}</span>
        </button>
      );
    }

    if (item.type === "link" && item.href) {
      return (
        <Link href={item.href} className={bottomClasses}>
          <item.icon />
          <span>{item.label}</span>
        </Link>
      );
    }

    return null;
  }

  const baseClasses =
    "flex items-center gap-3 rounded-lg w-[240px] h-12 font-bold text-lg transition-all relative";
  const regularClasses = "text-white hover:menu-item-hover";
  const activeClasses = "menu-item-hover text-white";

  const menuItemContent = (
    <>
      <div className="flex items-center gap-3 px-3">
        <item.icon />
        <span>{item.label}</span>
      </div>
      {isActive && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-[#1B46E0] rounded-sm"></div>
      )}
    </>
  );

  if (item.type === "button") {
    return (
      <button
        className={`${baseClasses} ${isActive ? activeClasses : regularClasses}`}
      >
        {menuItemContent}
      </button>
    );
  }

  return (
    <Link
      href={item.href!}
      className={`${baseClasses} ${isActive ? activeClasses : regularClasses}`}
    >
      {menuItemContent}
    </Link>
  );
};

const Sidebar = () => {
  const pathname = usePathname();
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;

  if (!isConnected) {
    return null;
  }

  return (
    <div
      className="w-[302px] h-[972px] rounded-3xl py-[54px] px-[31px] sidebar-shadow bg-[#0D1117] flex flex-col justify-between"
      style={{
        boxShadow:
          "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="text-white">
        <div className="flex items-center justify-between mb-[65px]">
          <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
          <button>
            <CloseSidebarIcon width={24} height={25} />
          </button>
        </div>

        <div className="mb-8">
          <span className="text-[24px] font-bold text-white mb-8 block">
            Explore Amana
          </span>
          <nav className="space-y-4">
            {menuItems.map((item) => (
              <SidebarMenuItem
                key={item.id}
                item={item}
                isActive={pathname === item.href}
              />
            ))}
          </nav>
        </div>
      </div>
      <div>
        <div className="border-t border-[#535E73] my-4"></div>
        <nav className="space-y-1 mt-auto">
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem
              key={item.id}
              item={item}
              isActive={pathname === item.href}
              isBottomMenu={true}
            />
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
