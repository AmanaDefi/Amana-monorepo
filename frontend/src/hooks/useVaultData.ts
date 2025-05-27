import { apiService } from "@/service";
import { useQuery } from "@tanstack/react-query";

// export default function useVaultData() {
//   const { data, isLoading, error } = useQuery({
//     queryKey: ["VaultDat"],
//     queryFn: () => apiService.api.getVaultData(),
//   });

//   return { data, isLoading, error };
// }
