import { makeRequest } from "@/lib/api";
import { AppVersion, VersionText } from "@/lib/version";
import { useQuery } from "@tanstack/react-query";

export function useAppVersion() {
  return useQuery<VersionText | undefined>({
    queryKey: ["app", "version"],
    queryFn: async () =>
      (await makeRequest<AppVersion>("/api/version", undefined))?.version,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
}
