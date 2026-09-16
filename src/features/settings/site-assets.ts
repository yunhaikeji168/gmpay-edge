export const siteAssetContentTypes = [
	"image/png",
	"image/jpeg",
	"image/webp",
] as const;

export type SiteAssetContentType = (typeof siteAssetContentTypes)[number];

export const siteAssetMaxBytes = {
	logo: 2 * 1024 * 1024,
	background: 5 * 1024 * 1024,
} as const;

export function isSiteAssetContentType(
	value: string,
): value is SiteAssetContentType {
	return siteAssetContentTypes.some((contentType) => contentType === value);
}
