"use client";

import React from "react";
import { bottomMenuItems } from "@/constants/sidebarMenu";
import { useSidebarActions } from "@/hooks/useSidebarActions";
import SidebarMenuItem from "./SidebarMenuItem";

interface MenuNavigationProps {
  activeSection?: string;
  isCollapsed: boolean;
  isMobile?: boolean;
  onItemClick?: () => void;
}

const MenuNavigation: React.FC<MenuNavigationProps> = ({
  activeSection,
  isCollapsed,
  isMobile = false,
  onItemClick,
}) => {
  const actions = useSidebarActions();

  const enhancedBottomItems = bottomMenuItems.map((item) =>
    item.id === "logout"
      ? { ...item, action: actions.logout }
      : {
          ...item,
          action: actions[item.id as keyof typeof actions],
        },
  );

  if (isMobile) {
    return (
      <nav className="flex flex-col gap-6 items-center w-full">
        {enhancedBottomItems.map((item) => {
          const isDisabled = item.id !== "logout";

          if (item.type === "button") {
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isDisabled && item.action) {
                    item.action();
                  }
                  onItemClick?.();
                }}
                disabled={isDisabled}
                className={`flex cursor-pointer flex-row items-center gap-2  transition-all hover:text-white active:text-white  ${
                  isDisabled
                    ? "text-[#535E73] cursor-not-allowed"
                    : "text-[#535E73]"
                }`}
              >
                <div className="w-[19px] h-[19px] flex items-center justify-center">
                  <item.icon />
                </div>
                <p className="font-gotham font-normal text-base leading-4 text-center">
                  {item.label}
                </p>
              </button>
            );
          }

          if (item.type === "link" && item.href) {
            return (
              <a
                key={item.id}
                href={isDisabled ? "#" : item.href}
                onClick={(e) => {
                  if (isDisabled) e.preventDefault();
                  onItemClick?.();
                }}
                className={`flex cursor-pointer flex-row items-center gap-2 ${
                  isDisabled
                    ? "text-[#535E73] cursor-not-allowed"
                    : "text-[#535E73]"
                }`}
              >
                <div className="w-[19px] h-[19px] flex items-center justify-center">
                  <item.icon />
                </div>
                <p className="font-gotham font-normal text-base leading-4 text-center">
                  {item.label}
                </p>
              </a>
            );
          }

          return null;
        })}
      </nav>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden">
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
  );
};

export default MenuNavigation;
