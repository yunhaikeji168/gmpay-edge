import { Outlet } from "@tanstack/react-router";
import { AnimatedCharacters } from "#/features/auth/components/animated-characters";
import {
	AuthAnimationProvider,
	useAuthAnimation,
} from "#/features/auth/components/auth-animation-context";
import { AppTitle } from "#/layouts/components/app-title";
import { LocaleSwitch } from "#/layouts/components/locale-switch";
import { ThemeSwitch } from "#/layouts/components/theme-switch";
import { m } from "#/paraglide/messages";

export function AuthLayout() {
	return (
		<AuthAnimationProvider>
			<AuthLayoutContent />
		</AuthAnimationProvider>
	);
}

function AuthLayoutContent() {
	const animation = useAuthAnimation();
	return (
		<div className="container relative grid h-svh flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
			<section className="relative hidden h-full overflow-hidden bg-muted text-foreground lg:block">
				<div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-60 dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)]" />
				<div className="absolute top-[-10%] right-[-5%] size-80 rounded-full bg-primary/5 blur-3xl" />
				<div className="absolute bottom-[-10%] left-[-5%] size-72 rounded-full bg-primary/5 blur-3xl" />
				<div className="relative z-20 flex h-full flex-col items-center justify-center gap-10 p-12">
					<div className="w-full space-y-4 text-center">
						<p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
							{m.auth_brand_eyebrow()}
						</p>
						<h2 className="font-semibold text-3xl tracking-tight xl:text-4xl">
							{m.auth_brand_title()}
						</h2>
						<p className="text-muted-foreground text-sm leading-relaxed">
							{m.auth_brand_description()}
						</p>
					</div>
					<div className="w-full rounded-[36px] border bg-background/50 px-6 py-8 shadow-2xl backdrop-blur-sm">
						<AnimatedCharacters
							isTyping={animation.isTyping}
							passwordLength={animation.passwordLength}
							showPassword={animation.showPassword}
						/>
					</div>
				</div>
			</section>
			<section className="flex h-full min-w-xs flex-col px-6 lg:p-8">
				<header className="mx-auto flex w-full items-center justify-between py-4 sm:px-8 lg:px-0 lg:py-0">
					<AppTitle description />
					<div className="flex items-center gap-1">
						<LocaleSwitch />
						<ThemeSwitch />
					</div>
				</header>
				<main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-24">
					<Outlet />
				</main>
			</section>
		</div>
	);
}
