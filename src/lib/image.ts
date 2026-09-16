type SupportedImageType = "image/png" | "image/jpeg" | "image/webp";

export async function inspectImage(input: ArrayBuffer) {
	const bytes = new Uint8Array(input);
	const contentType = detectImageType(bytes);
	if (!contentType) return null;
	const dimensions = imageDimensions(bytes, contentType);
	if (!dimensions || !validImageDimensions(dimensions.width, dimensions.height))
		return null;
	return {
		contentType,
		...dimensions,
		extension: extensionFor(contentType),
		sha256: hex(await crypto.subtle.digest("SHA-256", input)),
	};
}

function detectImageType(bytes: Uint8Array): SupportedImageType | null {
	if (
		bytes.length >= 33 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a &&
		ascii(bytes, 12, 16) === "IHDR"
	)
		return "image/png";
	if (
		bytes.length >= 16 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff &&
		bytes.at(-2) === 0xff &&
		bytes.at(-1) === 0xd9
	)
		return "image/jpeg";
	if (
		bytes.length >= 16 &&
		ascii(bytes, 0, 4) === "RIFF" &&
		ascii(bytes, 8, 12) === "WEBP" &&
		readUint32LittleEndian(bytes, 4) + 8 <= bytes.length
	)
		return "image/webp";
	return null;
}

function validImageDimensions(width: number, height: number) {
	return width > 0 && height > 0 && width <= 10_000 && height <= 10_000;
}

function imageDimensions(bytes: Uint8Array, contentType: SupportedImageType) {
	if (contentType === "image/png")
		return { width: readUint32(bytes, 16), height: readUint32(bytes, 20) };
	if (contentType === "image/jpeg") return jpegDimensions(bytes);
	return webpDimensions(bytes);
}

function jpegDimensions(bytes: Uint8Array) {
	for (let offset = 2; offset + 8 < bytes.length; ) {
		if (bytes[offset] !== 0xff) return null;
		const marker = bytes[offset + 1];
		if (marker === undefined || marker === 0xd9 || marker === 0xda) return null;
		if (marker === 0xff || marker === 0x01) {
			offset += marker === 0xff ? 1 : 2;
			continue;
		}
		const length = readUint16(bytes, offset + 2);
		if (length < 2 || offset + length + 2 > bytes.length) return null;
		if (isStartOfFrame(marker) && length >= 7)
			return {
				width: readUint16(bytes, offset + 7),
				height: readUint16(bytes, offset + 5),
			};
		offset += length + 2;
	}
	return null;
}

function isStartOfFrame(marker: number) {
	return (
		marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
	);
}

function webpDimensions(bytes: Uint8Array) {
	const kind = ascii(bytes, 12, 16);
	if (kind === "VP8X" && bytes.length >= 30)
		return {
			width: 1 + readUint24LittleEndian(bytes, 24),
			height: 1 + readUint24LittleEndian(bytes, 27),
		};
	if (kind === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f)
		return {
			width: 1 + ((readUint8(bytes, 22) & 0x3f) << 8) + readUint8(bytes, 21),
			height:
				1 +
				((readUint8(bytes, 24) & 0x0f) << 10) +
				(readUint8(bytes, 23) << 2) +
				(readUint8(bytes, 22) >> 6),
		};
	if (
		kind === "VP8 " &&
		bytes.length >= 30 &&
		bytes[23] === 0x9d &&
		bytes[24] === 0x01 &&
		bytes[25] === 0x2a
	)
		return {
			width: readUint16LittleEndian(bytes, 26) & 0x3fff,
			height: readUint16LittleEndian(bytes, 28) & 0x3fff,
		};
	return null;
}
function view(bytes: Uint8Array) {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
function readUint32(bytes: Uint8Array, offset: number) {
	return view(bytes).getUint32(offset);
}
function readUint16(bytes: Uint8Array, offset: number) {
	return view(bytes).getUint16(offset);
}
function readUint8(bytes: Uint8Array, offset: number) {
	return view(bytes).getUint8(offset);
}
function readUint16LittleEndian(bytes: Uint8Array, offset: number) {
	return view(bytes).getUint16(offset, true);
}
function readUint32LittleEndian(bytes: Uint8Array, offset: number) {
	return view(bytes).getUint32(offset, true);
}
function readUint24LittleEndian(bytes: Uint8Array, offset: number) {
	return (
		readUint8(bytes, offset) +
		(readUint8(bytes, offset + 1) << 8) +
		(readUint8(bytes, offset + 2) << 16)
	);
}
function ascii(bytes: Uint8Array, start: number, end: number) {
	return String.fromCharCode(...bytes.slice(start, end));
}
function extensionFor(contentType: SupportedImageType) {
	if (contentType === "image/png") return "png";
	if (contentType === "image/webp") return "webp";
	return "jpg";
}
function hex(value: ArrayBuffer) {
	return [...new Uint8Array(value)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
