"use client";

import React from "react";
import Link from "next/link";
import { MOBILE_MENU_ITEMS } from "@/constants/mobileNavigation";
import { useMobileNavigation } from "@/hooks/useMobileNavigation";

const MobileFixedMenu: React.FC = () => {
  const { handleNavigation, isActive, isConnected } = useMobileNavigation();

  const bottomNavItems = MOBILE_MENU_ITEMS.filter(
    (item) => item.showInBottomNav && (!item.requiresAuth || isConnected),
  );

  if (!isConnected && bottomNavItems.length === 0) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#3E3C59] font-gotham md:hidden"
      style={{
        backgroundColor: "#14171F",
        borderRadius: "16px 16px 0 0",
        height: "90px",
      }}
    >
      <div className="flex items-center justify-around h-full px-4">
        {bottomNavItems.map((item) => {
          const IconComponent = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.id}
              href={item.path}
              onClick={() => handleNavigation(item.path, item.id)}
              className="flex flex-col items-center justify-center space-y-1 transition-all duration-200 text-white min-w-[60px]"
            >
              <IconComponent
                className={`transition-all duration-200 w-5 h-5 ${
                  active
                    ? "scale-110 text-[#1B46E0]"
                    : "scale-100 text-white hover:text-white"
                }`}
                color={active ? "#1B46E0" : "#535E73"}
              />
              <span className="text-xs font-normal transition-colors duration-200 text-white">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileFixedMenu;
