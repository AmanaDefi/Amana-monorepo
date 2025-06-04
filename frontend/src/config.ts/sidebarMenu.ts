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
    href: "/dashboard",
    icon: DashboardIcon,
    type: "link" as const,
  },
  {
    id: "earn",
    label: "Earn",
    href: "/earn",
    icon: EarnIcon,
    type: "link" as const,
  },
  {
    id: "wallet",
    label: "Wallet",
    href: "/wallet",
    icon: WalletIcon,
    type: "link" as const,
  },
  {
    id: "activity",
    label: "Activity",
    href: "/activity",
    icon: ActivityIcon,
    type: "link" as const,
  },
];

export const bottomMenuItems = [
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    type: "link" as const,
  },
  {
    id: "qa",
    label: "Q&A",
    href: "/qa",
    icon: QandAIcon,
    type: "link" as const,
  },
  {
    id: "logout",
    label: "Log out",
    icon: LogOutIcon,
    type: "button" as const,
    action: () => console.log("Logout clicked"),
  },
];
