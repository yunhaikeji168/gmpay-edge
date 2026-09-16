import { Outlet } from "@tanstack/react-router";
import { PublicFooter } from "#/layouts/public/footer";
import { PublicHeader } from "#/layouts/public/header";

export function PublicLayout() {
	return (
		<>
			<PublicHeader />
			<main className="w-full">
				<Outlet />
			</main>
			<PublicFooter />
		</>
	);
}
