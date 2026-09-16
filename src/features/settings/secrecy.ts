type PresentableSettingValue = string | number | boolean | string[];

export function isRuntimeSecret(key: string) {
	return key.startsWith("runtime.") && key !== "runtime.better_auth_url";
}

export function presentSettingValue(
	key: string,
	value: PresentableSettingValue,
) {
	return {
		value,
		configured: isRuntimeSecret(key)
			? typeof value === "string" && value.length > 0
			: undefined,
	};
}

export function shouldPreserveRuntimeSecret(key: string, value: unknown) {
	return isRuntimeSecret(key) && value === "";
}
