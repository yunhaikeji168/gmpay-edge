import type { PublicPaymentMethod } from "#/features/status/server/assets-query";
import { m } from "#/paraglide/messages";

export function AssetsPage({ rows }: { rows: PublicPaymentMethod[] }) {
	return (
		<section className="container px-4 py-20">
			<p className="text-primary text-sm">{m.public_assets_eyebrow()}</p>
			<h1 className="mt-3 text-5xl font-semibold">{m.public_assets_title()}</h1>
			<p className="mt-5 max-w-2xl text-muted-foreground">
				{m.public_assets_description()}
			</p>
			<div className="mt-12 overflow-hidden rounded-2xl border bg-card text-card-foreground">
				<table className="w-full text-left text-sm">
					<caption className="sr-only">{m.public_assets_title()}</caption>
					<thead className="border-b text-muted-foreground text-xs uppercase tracking-wider">
						<tr>
							<th className="p-5">{m.public_assets_provider()}</th>
							<th className="p-5">{m.public_assets_assets()}</th>
							<th className="p-5">{m.common_status()}</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr
								key={`${row.type}:${row.code}`}
								className="border-b last:border-0"
							>
								<td className="p-5 font-medium">{row.name}</td>
								<td className="p-5 text-muted-foreground">
									{row.assets.join(", ") || "—"}
								</td>
								<td
									className={`p-5 ${row.status === "available" ? "text-primary" : "text-muted-foreground"}`}
								>
									{row.status === "available"
										? m.public_assets_available()
										: m.public_assets_implemented()}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
