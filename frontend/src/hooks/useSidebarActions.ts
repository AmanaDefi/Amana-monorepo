import { useRouter } from "next/navigation";
import { useMultiChain } from "@/providers/MultiChainProvider";

export const useSidebarActions = () => {
  const router = useRouter();
  const { disconnectWallet } = useMultiChain();

  const actionMap = {
    dashboard: () => router.push("/dashboard"),
    wallet: () => {},
    activity: () => router.push("/activity"),
    settings: () => router.push("/settings"),
    qa: () => router.push("/qa"),
    logout: async () => {
      try {
        disconnectWallet();
        router.push("/");
      } catch (error) {
        console.log("Error during logout:", error);
        router.push("/");
      }
    },
  };

  return actionMap;
};
