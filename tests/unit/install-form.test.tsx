// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallPage } from "#/features/installation/pages/install";
import { m } from "#/paraglide/messages";

const installSystemFn = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const signInEmail = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
vi.mock("#/features/auth/auth-client", () => ({
	authClient: { signIn: { email: signInEmail } },
}));
vi.mock("#/features/installation/server/functions", () => ({
	installSystemFn,
}));
vi.mock("#/layouts/install", () => ({
	InstallLayout: ({ children }: { children: React.ReactNode }) => children,
}));

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("installation form", () => {
	let container: HTMLDivElement | undefined;

	afterEach(() => {
		container?.remove();
		container = undefined;
		installSystemFn.mockReset();
		navigate.mockReset();
		signInEmail.mockReset();
	});

	it("blocks submission and links localized errors to invalid fields", async () => {
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		const client = new QueryClient({
			defaultOptions: {
				mutations: { retry: false },
				queries: { retry: false },
			},
		});

		await act(async () => {
			root.render(
				<QueryClientProvider client={client}>
					<InstallPage />
				</QueryClientProvider>,
			);
		});
		await act(async () => {
			container?.querySelector("form")?.requestSubmit();
			await Promise.resolve();
		});

		for (const id of [
			"install-email",
			"install-password",
			"install-confirm-password",
		]) {
			expect(
				container
					.querySelector<HTMLInputElement>(`#${id}`)
					?.getAttribute("aria-invalid"),
				id,
			).toBe("true");
		}
		expect(container.textContent).toContain(m.auth_email_required());
		expect(container.textContent).toContain(m.auth_password_required());
		expect(container.textContent).toContain(
			m.install_confirmPasswordRequired(),
		);
		expect(installSystemFn).not.toHaveBeenCalled();

		await act(async () => root.unmount());
	});

	it("signs the root user in and opens the admin after installation", async () => {
		installSystemFn.mockResolvedValue({
			email: "root@example.com",
			installed: true,
		});
		signInEmail.mockResolvedValue({ data: {}, error: null });
		container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		const client = new QueryClient({
			defaultOptions: { mutations: { retry: false } },
		});

		await act(async () => {
			root.render(
				<QueryClientProvider client={client}>
					<InstallPage />
				</QueryClientProvider>,
			);
		});
		for (const [id, value] of [
			["install-email", "root@example.com"],
			["install-password", "exact-root-password"],
			["install-confirm-password", "exact-root-password"],
		] as const) {
			const input = container.querySelector<HTMLInputElement>(`#${id}`);
			await act(async () => {
				input?.focus();
				input?.setRangeText(value);
				input?.dispatchEvent(new Event("input", { bubbles: true }));
			});
		}
		await act(async () => {
			container?.querySelector("form")?.requestSubmit();
		});

		await vi.waitFor(() =>
			expect(signInEmail).toHaveBeenCalledWith({
				email: "root@example.com",
				password: "exact-root-password",
				callbackURL: "/admin",
			}),
		);
		expect(navigate).toHaveBeenCalledWith({ to: "/admin", replace: true });

		await act(async () => root.unmount());
	});
});
