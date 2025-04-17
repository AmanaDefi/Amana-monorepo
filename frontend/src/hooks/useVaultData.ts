import { ApiService } from "@/service";
import { useQuery } from "@tanstack/react-query";

export default function useVaultData() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["VaultDat"],
    queryFn: () => new ApiService().api.getVaultData(),
  });

  return { data, isLoading, error };
}
