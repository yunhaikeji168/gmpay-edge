import { queryOptions } from "@tanstack/react-query";
import { listSystemSettingsFn } from "#/features/settings/server/admin";

export const systemSettingsQueryKey = ["admin", "system-settings"] as const;

export const systemSettingsQueryOptions = queryOptions({
	queryKey: systemSettingsQueryKey,
	queryFn: () => listSystemSettingsFn(),
	staleTime: 5 * 60_000,
});
