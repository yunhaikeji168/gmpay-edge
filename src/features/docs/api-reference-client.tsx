import { useEffect, useRef, useState } from "react";
import { useTheme } from "#/context/theme-provider";
import { m } from "#/paraglide/messages";

const scalarScriptUrl =
	"https://cdn.jsdmirror.com/npm/@scalar/api-reference@1.62.5/dist/browser/standalone.js";
const scalarScriptIntegrity =
	"sha384-qgSpG+a6nhdzdIVlaUPfNI6jwGGnmHPTGC2JXXgWBjPMTSDI4hcdVQzagOL6ZKLm";

const customCss = `
	.scalar-app {
		--scalar-font: var(--font-sans);
		--scalar-font-code: ui-monospace, SFMono-Regular, Menlo, monospace;
		--scalar-background-1: var(--background);
		--scalar-background-2: var(--card);
		--scalar-background-3: var(--muted);
		--scalar-background-4: var(--accent);
		--scalar-color-1: var(--foreground);
		--scalar-color-2: var(--muted-foreground);
		--scalar-color-3: color-mix(in oklab, var(--muted-foreground) 75%, transparent);
		--scalar-color-accent: var(--primary);
		--scalar-background-accent: color-mix(in oklab, var(--primary) 12%, transparent);
		--scalar-border-color: var(--border);
		--scalar-sidebar-background-1: var(--background);
		--scalar-sidebar-border-color: var(--border);
		--scalar-sidebar-color-1: var(--foreground);
		--scalar-sidebar-color-2: var(--muted-foreground);
		--scalar-sidebar-color-active: var(--primary);
		--scalar-sidebar-item-active-background: color-mix(in oklab, var(--primary) 10%, transparent);
		--refs-sidebar-height: calc(100svh - 8rem - 2px);
	}
	.references-layout { min-height: 100%; max-width: 100%; }
	.scalar-app { color-scheme: inherit; }
	.t-doc__sidebar { height: var(--refs-sidebar-height) !important; top: 0 !important; }
	.scalar-app .dark-mode { color-scheme: dark; }
`;

type ScalarInstance = { destroy: () => void };

declare global {
	interface Window {
		Scalar?: {
			createApiReference: (
				element: HTMLElement,
				configuration: Record<string, unknown>,
			) => ScalarInstance;
		};
	}
}

let scalarScriptPromise: Promise<void> | null = null;

function loadScalarScript() {
	if (window.Scalar) return Promise.resolve();
	if (scalarScriptPromise) return scalarScriptPromise;

	scalarScriptPromise = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = scalarScriptUrl;
		script.integrity = scalarScriptIntegrity;
		script.crossOrigin = "anonymous";
		script.referrerPolicy = "no-referrer";
		script.async = true;
		script.addEventListener("load", () => {
			if (window.Scalar) {
				resolve();
				return;
			}
			scalarScriptPromise = null;
			reject(new Error("Scalar CDN script did not initialize"));
		});
		script.addEventListener("error", () => {
			script.remove();
			scalarScriptPromise = null;
			reject(new Error("Scalar CDN script failed to load"));
		});
		document.head.appendChild(script);
	});

	return scalarScriptPromise;
}

export function ApiReferenceClientPage() {
	const { resolvedTheme } = useTheme();
	const mountRef = useRef<HTMLDivElement>(null);
	const [loadFailed, setLoadFailed] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let instance: ScalarInstance | undefined;
		setLoadFailed(false);

		loadScalarScript()
			.then(() => {
				if (cancelled || !mountRef.current || !window.Scalar) return;
				instance = window.Scalar.createApiReference(mountRef.current, {
					url: "/openapi.yaml",
					agent: { disabled: true },
					darkMode: resolvedTheme === "dark",
					forceDarkModeState: resolvedTheme,
					hideDarkModeToggle: true,
					theme: "none",
					layout: "modern",
					showSidebar: true,
					hideClientButton: true,
					hideTestRequestButton: true,
					hideModels: false,
					showDeveloperTools: "never",
					telemetry: false,
					withDefaultFonts: false,
					metaData: {
						title: m.docs_api_reference_title(),
						description: m.docs_api_reference_description(),
					},
					customCss,
				});
			})
			.catch(() => {
				if (!cancelled) setLoadFailed(true);
			});

		return () => {
			cancelled = true;
			instance?.destroy();
		};
	}, [resolvedTheme]);

	return (
		<section className="container flex h-[calc(100svh-4rem)] min-h-0 px-4 py-6 sm:py-8">
			<div
				className={`gmpay-api-reference ${resolvedTheme === "dark" ? "dark-mode" : "light-mode"} relative mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-x-hidden overflow-y-auto rounded-2xl border shadow-sm`}
			>
				<div ref={mountRef} className="h-full" />
				{loadFailed ? (
					<div className="absolute inset-0 grid place-items-center bg-background p-6 text-center text-muted-foreground">
						{m.docs_api_reference_load_failed()}
					</div>
				) : null}
			</div>
		</section>
	);
}
