"use strict";

import { useSigner, useSignerStatus, useUser } from "@account-kit/react";
import { useQuery } from "@tanstack/react-query";
import { Address } from "viem";

export const useSignerAddress = () => {
  const user = useUser();
  const signer = useSigner();
  const { isConnected: isScaSignerConnected } = useSignerStatus();

  const { data: scaSignerAddress } = useQuery({
    queryKey: ["signerAddress", user?.orgId],
    queryFn: async (): Promise<Address | undefined> => {
      if (!signer || !isScaSignerConnected) {
        return undefined;
      }
      return signer.getAddress();
    },
    enabled: !!user && !!signer && isScaSignerConnected,
  });

  return { scaSignerAddress, isScaSignerConnected };
};
