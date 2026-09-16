import { queryOptions } from "@tanstack/react-query";

import { listUsersFn } from "#/features/users/server/admin";
import type { ListUsersInput } from "#/features/users/server/users";

export const adminUsersQueryKey = ["admin", "users"] as const;

export function adminUsersQueryOptions(input: ListUsersInput) {
	return queryOptions({
		queryKey: [...adminUsersQueryKey, input] as const,
		queryFn: () => listUsersFn({ data: input }),
		staleTime: 15_000,
		gcTime: 5 * 60_000,
	});
}
