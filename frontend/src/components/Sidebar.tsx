"use client";

import React from "react";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import CloseSidebarIcon from "./svg/CloseSidebarIcon";

const Sidebar = () => {
  return (
    <div className="w-[302px] h-[972px] rounded-3xl py-[54px] px-[31px] sidebar-shadow bg-[#0D1117]">
      <div className="text-white">
        <div className="flex items-center justify-between mb-[65px]">
          <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
          <button>
            <CloseSidebarIcon width={24} height={25} />
          </button>
        </div>
        <div>
          <span className="text-[24px] font-bold text-white mb-8">Explore Amana</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
