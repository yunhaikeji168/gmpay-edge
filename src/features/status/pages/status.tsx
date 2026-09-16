import { Activity, CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import type {
	HealthComponent,
	HealthReport,
} from "#/features/status/server/health";
import { formatDateTime } from "#/lib/format";
import { m } from "#/paraglide/messages";

export function StatusPage({ report }: { report: HealthReport }) {
	const healthy = report.status === "ok";
	return (
		<section className="container px-4 py-20">
			<div className="mx-auto max-w-4xl">
				<div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
					<div>
						<p className="text-primary text-sm">{m.public_status_eyebrow()}</p>
						<h1 className="mt-3 font-semibold text-5xl tracking-tight">
							{healthy
								? m.public_status_operational_title()
								: m.public_status_degraded_title()}
						</h1>
						<p className="mt-5 text-muted-foreground">
							{m.public_status_description()}
						</p>
					</div>
					<Badge
						className="w-fit px-3 py-1.5"
						variant={healthy ? "default" : "destructive"}
					>
						{healthy ? <CheckCircle2 /> : <CircleAlert />}
						{healthy
							? m.public_status_operational()
							: m.public_status_degraded()}
					</Badge>
				</div>
				<div className="mt-10 overflow-hidden rounded-2xl border bg-card text-card-foreground">
					{report.components.map((component) => (
						<div
							className="flex flex-col justify-between gap-3 border-b p-5 last:border-0 sm:flex-row sm:items-center"
							key={component.key}
						>
							<div className="flex items-start gap-3">
								{component.status === "operational" ? (
									<CheckCircle2 className="mt-0.5 size-5 text-primary" />
								) : component.status === "degraded" ? (
									<CircleAlert className="mt-0.5 size-5 text-amber-500" />
								) : (
									<CircleX className="mt-0.5 size-5 text-destructive" />
								)}
								<div>
									<strong>{componentName(component.key)}</strong>
									<p className="mt-1 text-muted-foreground text-sm">
										{componentDetail(component)}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3 text-sm">
								<Badge variant="outline">
									{componentStatus(component.status)}
								</Badge>
								{component.latencyMs != null ? (
									<span className="text-muted-foreground">
										{component.latencyMs} ms
									</span>
								) : null}
							</div>
						</div>
					))}
				</div>
				<div className="mt-6 flex items-center gap-2 text-muted-foreground text-xs">
					<Activity className="size-4" />
					<StatusCheckedAt value={report.time} />
				</div>
			</div>
		</section>
	);
}

function StatusCheckedAt({ value }: { value: string }) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	return m.public_status_last_checked({
		time: formatDateTime(value, undefined, mounted ? undefined : "UTC"),
	});
}

function componentName(key: HealthComponent["key"]) {
	return {
		database: m.public_status_database(),
		edge_cache: m.public_status_edge_cache(),
		webhook_queue: m.public_status_webhook_queue(),
		payment_queue: m.public_status_payment_queue(),
		object_storage: m.public_status_object_storage(),
		receiving_methods: m.public_status_receiving_methods(),
	}[key];
}

function componentDetail(component: HealthComponent) {
	if (component.detail === "ready_receiving_methods")
		return m.public_status_ready_receiving_methods({
			count: component.count ?? 0,
		});
	return {
		cloudflare_d1: m.public_status_cloudflare_d1(),
		cloudflare_kv: m.public_status_cloudflare_kv(),
		async_delivery: m.public_status_async_delivery(),
		transaction_scanning: m.public_status_transaction_scanning(),
		r2_storage: m.public_status_r2_storage(),
		binding_missing: m.public_status_binding_missing(),
		query_failed: m.public_status_query_failed(),
		read_failed: m.public_status_read_failed(),
	}[component.detail];
}

function componentStatus(status: HealthComponent["status"]) {
	return status === "operational"
		? m.public_status_operational()
		: status === "degraded"
			? m.public_status_degraded()
			: m.public_status_unavailable();
}
