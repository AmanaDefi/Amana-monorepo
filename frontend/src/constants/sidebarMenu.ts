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
    action: () => console.log("Dashboard clicked"), 
  },
  {
    id: "earn",
    label: "Earn",
    icon: EarnIcon,
    type: "button" as const,
    action: () => console.log("Earn clicked"),
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: WalletIcon,
    type: "button" as const,
    action: () => console.log("Wallet clicked"),
  },
  {
    id: "activity",
    label: "Activity",
    icon: ActivityIcon,
    type: "button" as const,
    action: () => console.log("Activity clicked"),
  },
];

export const bottomMenuItems = [
  {
    id: "settings",
    label: "Settings",
    icon: SettingsIcon,
    type: "button" as const,
    action: () => console.log("Settings clicked"),
  },
  {
    id: "qa",
    label: "Q&A",
    icon: QandAIcon,
    type: "button" as const,
    action: () => console.log("Q&A clicked"),
  },
  {
    id: "logout",
    label: "Log out",
    icon: LogOutIcon,
    type: "button" as const,
    action: () => console.log("Logout clicked"),
  },
];
