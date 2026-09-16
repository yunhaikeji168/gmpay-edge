const sensitiveKey =
	/(?:secret|token|password|passphrase|credential|authorization|cookie|session|api[_-]?key|signature|private[_-]?key|mnemonic|recovery[_-]?codes?|backup[_-]?codes?|totp|otp|ciphertext|encrypted)/i;

export function redactAuditValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redactAuditValue);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value).map(([key, child]) => [
			key,
			sensitiveKey.test(key) && typeof child !== "boolean"
				? "[REDACTED]"
				: redactAuditValue(child),
		]),
	);
}

export function redactSerializedAuditValue(value: string | null) {
	if (value === null) return null;
	try {
		return redactAuditValue(JSON.parse(value));
	} catch {
		return "[REDACTED_UNPARSEABLE]";
	}
}

export function redactedAuditJson(value: string | null) {
	const redacted = redactSerializedAuditValue(value);
	return redacted === null ? null : JSON.stringify(redacted);
}
