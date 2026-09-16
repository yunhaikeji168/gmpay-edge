import { queryOptions } from "@tanstack/react-query";
import { listSystemAccessFn } from "#/features/access/server/admin";

export const systemAccessQueryKey = ["admin", "system-access"] as const;

export const systemAccessQueryOptions = queryOptions({
	queryKey: systemAccessQueryKey,
	queryFn: () => listSystemAccessFn(),
	staleTime: 5 * 60_000,
});
