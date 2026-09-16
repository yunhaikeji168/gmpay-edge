import { z } from "zod";

const apiScopeSchema = z.array(z.string().min(1).max(100)).max(100);

export function parseApiScopes(value: string): string[] | null {
	try {
		const parsed: unknown = JSON.parse(value);
		const result = apiScopeSchema.safeParse(parsed);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}

export function hasRequiredApiScope(
	scopes: readonly string[],
	requiredScope: string,
) {
	return scopes.includes("*") || scopes.includes(requiredScope);
}
