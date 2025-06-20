"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import VaultsMobileMenuIcon from "../svg/mobileMenu/VaultsMobileMenu";
import LeaderboardIcon from "../svg/mobileMenu/LeaderBoard";
import RoadmapIcon from "../svg/mobileMenu/Roadmap";
import AboutIcon from "../svg/mobileMenu/AboutIcon";
import classNames from "classnames";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import CloseModalIcon from "../svg/CloseModalIcon";
import DiscordLogo from "@public/logo/discord.svg";
import XLogo from "@public/logo/x.svg";
import LinkedInLogo from "@public/logo/linkedIn.svg";
import GlowIcon from "../svg/GlowIcon";
import MenuNavigation from "../sidebar/MenuNavigation";
import { DashboardIcon } from "../svg/sidebar/DashboardIcon";
import { ActivityIcon } from "../svg/sidebar/ActivityIcon";
import { useMultiChain } from "@/providers/MultiChainProvider";

const GUEST_MENU_ITEMS = [
  {
    path: "/",
    icon: <VaultsMobileMenuIcon height={19} width={19} fill="#1B46E0" />,
    title: "Vaults",
  },
  {
    path: "/leaderboard",
    icon: <LeaderboardIcon height={19} width={19} fill="#1B46E0" />,
    title: "Leaderboard",
  },
  {
    path: "/about",
    icon: <AboutIcon height={19} width={19} fill="#1B46E0" />,
    title: "About",
  },
  {
    path: "/roadmap",
    icon: <RoadmapIcon height={19} width={19} stroke="#1B46E0" />,
    title: "Roadmap",
  },
];

const USER_MENU_ITEMS = [
  {
    path: "/dashboard",
    icon: <DashboardIcon height={19} width={19} color="#1B46E0" />,
    title: "Dashboard",
  },
  {
    path: "/",
    icon: <VaultsMobileMenuIcon height={19} width={19} fill="#1B46E0" />,
    title: "Vaults",
  },
  {
    path: "/activity",
    icon: <ActivityIcon height={19} width={19} color="#1B46E0" />,
    title: "Activity",
  },
  {
    path: "/leaderboard",
    icon: <LeaderboardIcon height={19} width={19} fill="#1B46E0" />,
    title: "Leaderboard",
  },
  {
    path: "/about",
    icon: <AboutIcon height={19} width={19} fill="#1B46E0" />,
    title: "About",
  },
  {
    path: "/roadmap",
    icon: <RoadmapIcon height={19} width={19} stroke="#1B46E0" />,
    title: "Roadmap",
  },
];

interface MobileMenuProps {
  toggleMenu: () => void;
  isOpen: boolean;
}

const MobileMenuModal: React.FC<MobileMenuProps> = ({ toggleMenu, isOpen }) => {
  const path = usePathname();
  const { walletAddress } = useMultiChain();

  const menuItems = walletAddress ? USER_MENU_ITEMS : GUEST_MENU_ITEMS;

  return (
    <div
      className={`z-10 py-10 px-4 lg:!hidden fixed top-0 bottom-0 left-0 right-0 bg-black h-screen transform transition-all duration-500 ease-in-out ${
        isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <GlowIcon position="top-mobile" />
      <GlowIcon position="bottom-mobile" />
      <nav className="flex flex-col h-full w-full items-center justify-between">
        <div className="flex flex-col w-full items-center">
          <div className="flex flex-row items-center w-full justify-between mb-10">
            <div className="w-[50px] h-10" />
            <AmanaLogo width={65} height={46} className="w-[65px] h-[46px]" />
            <button
              onClick={toggleMenu}
              className="z-10 flex items-center justify-center w-10 h-10"
              aria-label="Close"
            >
              <CloseModalIcon width={16} height={16} />
            </button>
          </div>

          <div className="flex flex-col gap-6 items-center w-full">
            {menuItems.map((link) => {
              return (
                <Link
                  key={link.path}
                  onClick={toggleMenu}
                  href={link.path}
                  className={classNames(
                    "flex cursor-pointer flex-row items-center gap-[6px] text-white",
                    {
                      "text-blue-button":
                        path === link.path ||
                        (link.path === "/" && path === "/earn"),
                    },
                  )}
                >
                  {link.icon}
                  <p className="font-gotham font-normal text-base leading-4 text-center">
                    {link.title}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-center items-center">
          <div className="flex flex-col justify-center items-center mb-[62px]">
            <div className="border-t border-[#535E73] w-[224px] mb-8"></div>
            <MenuNavigation
              isCollapsed={false}
              isMobile={true}
              onItemClick={toggleMenu}
            />
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://www.linkedin.com/company/amana-defi"
              target="_blank"
              className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
            >
              <LinkedInLogo height={20} className="w-[20px] h-[20px]" />
            </Link>
            <Link
              href="https://x.com/Amana_DeFi"
              target="_blank"
              className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
            >
              <XLogo height={24} className="w-[24px] h-[24px]" />
            </Link>
            <Link
              href="https://discord.gg/kG3Gfn3B9V"
              target="_blank"
              className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
            >
              <DiscordLogo height={18} className="w-[22px] h-[26px]" />
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default MobileMenuModal;
