export const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: DashboardIcon,
    type: "link",
  },
  {
    id: "earn",
    label: "Earn",
    href: "/earn",
    icon: EarnIcon,
    type: "link",
  },
  {
    id: "wallet",
    label: "Wallet",
    href: "/wallet",
    icon: WalletIcon,
    type: "link",
  },
  {
    id: "activity",
    label: "Activity",
    href: "/activity",
    icon: ActivityIcon,
    type: "link",
  },
];

export const bottomMenuItems = [
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    type: "link",
  },
  {
    id: "qa",
    label: "Q&A",
    href: "/qa",
    icon: QuestionIcon,
    type: "link",
  },
  {
    id: "logout",
    label: "Log out",
    icon: LogoutIcon,
    type: "button",
    action: () => console.log("Logout clicked"),
  },
];
