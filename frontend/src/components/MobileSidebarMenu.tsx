"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import CloseSidebarIcon from "./svg/CloseSidebarIcon";
import { bottomMenuItems, menuItems } from "@/constants/sidebarMenu";
import { NAV_LINKS } from "@/constants/navigation";
import { SUPPORTED_CHAINS } from "@/constants/chainConfig";
import { useMultiChain } from "@/providers/MultiChainProvider";
import { useSidebarActions } from "@/hooks/useSidebarActions";

interface MobileNavItemProps {
  label: string;
  href: string;
  isActive: boolean;
  onItemClick: () => void;
}

const MobileNavItem: React.FC<MobileNavItemProps> = ({
  label,
  href,
  isActive,
  onItemClick,
}) => {
  const router = useRouter();

  const handleClick = () => {
    router.push(href);
    onItemClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center px-[22px] rounded-lg h-12 font-bold text-lg transition-all duration-300 ease-in-out w-[240px] relative text-white hover:menu-item-hover ${
        isActive ? "menu-item-hover text-white" : ""
      }`}
    >
      <span>{label}</span>
      {isActive && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-[#1B46E0] rounded-sm"></div>
      )}
    </button>
  );
};

interface MobileSidebarMenuItemProps {
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
  onItemClick: () => void;
}

const MobileSidebarMenuItem: React.FC<MobileSidebarMenuItemProps> = ({
  item,
  isActive,
  isBottomMenu = false,
  onItemClick,
}) => {
  const isDisabled =
    item.id !== "wallet" && item.id !== "logout" && item.id !== "earn";

  const commonClasses = `flex items-center gap-3 px-[22px] rounded-lg h-12 font-bold text-lg transition-all duration-300 ease-in-out w-[240px]`;

  const enabledClasses = "hover:text-white text-gray-400";
  const disabledClasses = "bg-[#35383D] text-gray-400 cursor-not-allowed";

  const baseClasses = `${commonClasses} ${
    isDisabled ? disabledClasses : enabledClasses
  }`;

  const menuItemContent = (
    <>
      <div className="flex items-center">
        <item.icon />
        <span className="ml-3">{item.label}</span>
      </div>
      {isActive && !isDisabled && (
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-6 bg-[#1B46E0] rounded-sm"></div>
      )}
    </>
  );

  const handleClick = () => {
    if (!isDisabled) {
      onItemClick();
      if (item.action) {
        item.action();
      }
    }
  };

  if (isBottomMenu) {
    if (item.type === "button") {
      return (
        <button
          className={baseClasses}
          onClick={handleClick}
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
          onClick={(e) => {
            if (isDisabled) {
              e.preventDefault();
            } else {
              onItemClick();
            }
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
        className={`${itemSpecificClasses} relative`}
        onClick={handleClick}
        disabled={isDisabled}
      >
        {menuItemContent}
      </button>
    );
  }

  return (
    <Link
      href={isDisabled ? "#" : item.href!}
      className={`${itemSpecificClasses} relative`}
      onClick={(e) => {
        if (isDisabled) {
          e.preventDefault();
        } else {
          onItemClick();
        }
      }}
    >
      {menuItemContent}
    </Link>
  );
};

interface MobileSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
  activeSection,
  onSectionChange,
  isOpen,
  onClose,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;
  const actions = useSidebarActions();

  const navLinks = isConnected
    ? [{ label: "Home", href: "/" }, ...NAV_LINKS.slice(1)]
    : NAV_LINKS;

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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isConnected) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 h-full w-80 bg-[#0D1117] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } flex flex-col rounded-r-3xl font-gotham`}
        style={{
          boxShadow:
            "0 2px 2px 0 rgba(255, 255, 255, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        <div className="flex items-center justify-between py-[54px] px-[29px] text-white">
          <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
        </div>

        <div className="flex-1 overflow-y-auto px-[29px] text-white">
          <div className="mb-8">
            <nav className="space-y-4">
              {navLinks.map(({ label, href }) => (
                <MobileNavItem
                  key={href}
                  label={label}
                  href={href}
                  isActive={pathname === href}
                  onItemClick={onClose}
                />
              ))}
            </nav>
          </div>
        </div>

        <div className="px-[29px] pb-[54px]">
          <div className="border-t border-[#535E73] my-4"></div>
          <nav className="space-y-1">
            {enhancedBottomItems.map((item) => (
              <MobileSidebarMenuItem
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                isBottomMenu={true}
                onItemClick={onClose}
              />
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

export default MobileSidebar;
