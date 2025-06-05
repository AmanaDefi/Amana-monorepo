import { DashboardIcon } from "@/components/svg/sidebar/DashboardIcon";
import { EarnIcon } from "@/components/svg/sidebar/EarnIcon";
import { WalletIcon } from "@/components/svg/sidebar/WalletIcon";
import { ActivityIcon } from "@/components/svg/sidebar/ActivityIcon";
import { SettingsIcon } from "@/components/svg/sidebar/SettingsIcon";
import { QandAIcon } from "@/components/svg/sidebar/QandAIcon";
import { LogOutIcon } from "@/components/svg/sidebar/LogOutIcon";

export const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: DashboardIcon,
    type: "button" as const,
    href: "/dashboard",
  },
  {
    id: "earn",
    label: "Earn",
    icon: EarnIcon,
    type: "link" as const,
    href: "/earn",
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: WalletIcon,
    type: "button" as const,
  },
  {
    id: "activity",
    label: "Activity",
    icon: ActivityIcon,
    type: "button" as const,
    href: "/activity",
  },
];

export const bottomMenuItems = [
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    type: "button" as const,
    href: "/settings",
  },
  {
    id: "qa",
    label: "Q&A",
    icon: QandAIcon,
    type: "button" as const,
    href: "/qa",
  },
  {
    id: "logout",
    label: "Log out",
    icon: LogOutIcon,
    type: "button" as const,
  },
];
