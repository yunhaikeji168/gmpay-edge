import { type DehydrateOptions, QueryClient } from "@tanstack/react-query";

export const ssrQueryDehydrateOptions = {
	shouldDehydrateQuery: (query) => query.state.status !== "error",
} satisfies DehydrateOptions;

export function getContext() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { staleTime: 15_000 },
		},
	});

	return {
		queryClient,
	};
}
