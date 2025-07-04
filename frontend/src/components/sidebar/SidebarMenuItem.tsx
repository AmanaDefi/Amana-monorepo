"use client";

import React from "react";
import Link from "next/link";

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

  const commonClasses = `px-[22px] w-full flex items-center rounded-lg h-12 font-medium text-lg transition-all duration-500 ease-in-out relative overflow-hidden ${
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

export default SidebarMenuItem;
