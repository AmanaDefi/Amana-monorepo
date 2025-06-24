import { useRouter, usePathname } from "next/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";

export const useMobileNavigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { walletAddress, disconnectWallet } = useMultiChain();
  const isConnected = !!walletAddress;

  const handleNavigation = (path: string, itemId: string) => {
    if (itemId === "logout") {
      disconnectWallet();
      router.push("/");
    } else {
      router.push(path);
    }
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/" || pathname === "/earn";
    }
    return pathname === path;
  };

  return {
    handleNavigation,
    isActive,
    isConnected,
    pathname,
  };
};
