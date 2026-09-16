import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Blocks,
	Check,
	RadioTower,
	ShieldCheck,
	Webhook,
} from "lucide-react";
import { useSiteBrand } from "#/context/site-brand-provider";
import { m } from "#/paraglide/messages";

export function HomePage() {
	const brand = useSiteBrand();
	const features = [
		{
			Icon: Blocks,
			title: m.edge_home_feature_core(),
			text: m.edge_home_feature_core_description(),
		},
		{
			Icon: ShieldCheck,
			title: m.edge_home_feature_security(),
			text: m.edge_home_feature_security_description(),
		},
		{
			Icon: Webhook,
			title: m.edge_home_feature_webhooks(),
			text: m.edge_home_feature_webhooks_description(),
		},
	];
	return (
		<div className="overflow-hidden">
			<section className="container px-4 pt-28 pb-24 text-center md:pt-40 md:pb-32">
				<div className="mx-auto w-fit rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-primary text-xs">
					● {m.edge_home_running()}
				</div>
				<h1 className="mx-auto mt-8 max-w-5xl text-balance font-semibold text-5xl tracking-[-.05em] md:text-7xl">
					{m.edge_home_title_line_1()}
					<br />
					<span className="bg-linear-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
						{m.edge_home_title_line_2()}
					</span>
				</h1>
				<p className="mx-auto mt-7 max-w-2xl text-balance text-muted-foreground text-lg leading-8">
					{m.edge_home_description()}
				</p>
				<div className="mt-10 flex flex-wrap justify-center gap-3">
					<Link
						to="/sign-in"
						search={{ redirect: undefined }}
						className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
					>
						{m.edge_home_launch({ name: brand.name })}{" "}
						<ArrowRight className="size-4" />
					</Link>
					<Link
						to="/docs"
						className="rounded-xl border px-5 py-3 hover:bg-accent"
					>
						{m.edge_home_explore_api()}
					</Link>
				</div>
			</section>
			<section id="features" className="container px-4 py-24 md:py-32">
				<p className="text-primary text-xs uppercase tracking-[.25em]">
					{m.edge_home_infrastructure()}
				</p>
				<h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
					{m.edge_home_operational_plane()}
				</h2>
				<div className="mt-12 grid gap-4 md:grid-cols-3">
					{features.map(({ Icon, title, text }) => (
						<article
							key={title}
							className="rounded-2xl border bg-card p-6 text-card-foreground"
						>
							<div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
								<Icon className="size-5" />
							</div>
							<h3 className="mt-8 text-xl font-medium">{title}</h3>
							<p className="mt-3 text-muted-foreground text-sm leading-6">
								{text}
							</p>
						</article>
					))}
				</div>
			</section>
			<section className="container px-4 py-24 md:py-32">
				<div className="grid overflow-hidden rounded-3xl border bg-card text-card-foreground md:grid-cols-2">
					<div className="p-8 md:p-14">
						<p className="text-primary">{m.edge_home_multichain()}</p>
						<h2 className="mt-4 text-4xl font-semibold">
							{m.edge_home_clean_protocol()}
						</h2>
						<ul className="mt-8 grid gap-4 text-muted-foreground text-sm">
							{[
								m.edge_home_benefit_assets(),
								m.edge_home_benefit_amounts(),
								m.edge_home_benefit_states(),
								m.edge_home_benefit_api(),
							].map((item) => (
								<li className="flex gap-3" key={item}>
									<Check className="size-5 text-primary" />
									{item}
								</li>
							))}
						</ul>
					</div>
					<div className="grid min-h-80 place-items-center border-t bg-[linear-gradient(color-mix(in_oklab,var(--foreground)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--foreground)_4%,transparent)_1px,transparent_1px)] bg-[size:42px_42px] md:border-t-0 md:border-l">
						<div className="w-72 rounded-2xl border bg-background/80 p-5 shadow-2xl">
							<div className="flex justify-between text-muted-foreground text-xs">
								<span>{m.edge_home_payment_received()}</span>
								<RadioTower className="size-4 text-primary" />
							</div>
							<p className="mt-8 text-3xl font-semibold">125.00 USDT</p>
							<div className="mt-5 h-2 rounded-full bg-primary" />
							<p className="mt-5 text-primary text-sm">
								{m.edge_home_confirmed_blocks({ current: 20, required: 20 })}
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
