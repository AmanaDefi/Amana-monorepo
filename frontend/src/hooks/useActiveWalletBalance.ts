import { useMultiChain } from "@/providers/MultiChainProvider";
import { useActiveWalletChain, useActiveAccount } from "thirdweb/react";
import { useWalletBalance } from "thirdweb/react";
import { client } from "@/utils/client";

export default function useActiveWalletBalance() {
  const { solanaBalance } = useMultiChain();
  return {displayValue: solanaBalance};
}
