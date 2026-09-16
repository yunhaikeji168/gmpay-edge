const encoder = new TextEncoder();
const decoder = new TextDecoder();
function toBase64(value: Uint8Array): string {
	let binary = "";
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary);
}
function fromBase64(value: string): Uint8Array<ArrayBuffer> {
	const binary = atob(value);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
async function encryptionKey(pepper: string): Promise<CryptoKey> {
	const material = await crypto.subtle.digest(
		"SHA-256",
		encoder.encode(pepper),
	);
	return crypto.subtle.importKey("raw", material, "AES-GCM", false, [
		"encrypt",
		"decrypt",
	]);
}
export async function encryptSecret(
	value: string,
	pepper: string,
): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await encryptionKey(pepper),
		encoder.encode(value),
	);
	return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}
export async function decryptSecret(
	value: string,
	pepper: string,
): Promise<string> {
	const [iv, ciphertext] = value.split(".");
	if (!iv || !ciphertext) throw new Error("Invalid encrypted secret");
	const clear = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromBase64(iv) },
		await encryptionKey(pepper),
		fromBase64(ciphertext),
	);
	return decoder.decode(clear);
}
export function generateApiSecret(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return `gms_${toBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")}`;
}
export function generateApiPid(): string {
	const value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
	return String(100_000_000_000 + value);
}
