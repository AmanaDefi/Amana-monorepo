import { DashboardIcon } from "../components/svg/sidebar/DashboardIcon";
import { EarnIcon } from "../components/svg/sidebar/EarnIcon";
import { ActivityIcon } from "../components/svg/sidebar/ActivityIcon";
import { SettingsIcon } from "../components/svg/sidebar/SettingsIcon";
import { LogOutIcon } from "@/components/svg/sidebar/LogOutIcon";

export interface MobileMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  path: string;
  requiresAuth: boolean;
  showInBottomNav: boolean;
  showInSideMenu: boolean;
}

export const MOBILE_MENU_ITEMS: MobileMenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    path: "/dashboard",
    requiresAuth: true,
    showInBottomNav: true,
    showInSideMenu: true,
  },
  {
    id: "earn",
    label: "Earn",
    icon: EarnIcon,
    path: "/",
    requiresAuth: false,
    showInBottomNav: true,
    showInSideMenu: true,
  },
  {
    id: "activity",
    label: "Activity",
    icon: ActivityIcon,
    path: "/activity",
    requiresAuth: true,
    showInBottomNav: true,
    showInSideMenu: true,
  },
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    path: "/settings",
    requiresAuth: true,
    showInBottomNav: false,
    showInSideMenu: true,
  },
  {
    id: "logout",
    label: "Logout",
    icon: LogOutIcon,
    path: "/",
    requiresAuth: true,
    showInBottomNav: false,
    showInSideMenu: true,
  },
];