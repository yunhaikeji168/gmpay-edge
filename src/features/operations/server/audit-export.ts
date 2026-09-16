import { DomainError } from "#/lib/domain-error";
import { redactSerializedAuditValue } from "#/server/audit-redaction";

type ExportAuditRow = {
	id: string;
	action: string;
	target_type: string;
	target_id: string | null;
	request_id: string | null;
	ip_address: string | null;
	before: string | null;
	after: string | null;
	created_at: number;
	actor_name: string | null;
	actor_email: string | null;
};

export async function exportAuditLogsToR2(input: {
	db: D1Database;
	bucket: R2Bucket;
	actorUserId: string;
	retentionMs: number;
	now?: number;
}) {
	const now = input.now ?? Date.now();
	const count = await input.db
		.prepare(
			`SELECT COUNT(*) AS count FROM (
			 SELECT 1 FROM audit_logs WHERE created_at <= ?
			 ORDER BY created_at DESC, id DESC LIMIT 10000
			)`,
		)
		.bind(now)
		.first<{ count: number }>();
	const recordCount = count?.count ?? 0;
	const timestamp = new Date(now).toISOString().replaceAll(":", "-");
	const key = `exports/audit-logs/${timestamp}-${crypto.randomUUID()}.ndjson`;
	const deleteAfter = now + input.retentionMs;
	try {
		await input.bucket.put(key, auditLogStream(input.db, now, recordCount), {
			httpMetadata: { contentType: "application/x-ndjson; charset=utf-8" },
			customMetadata: {
				exportedBy: input.actorUserId,
				recordCount: String(recordCount),
				deleteAfter: new Date(deleteAfter).toISOString(),
			},
		});
	} catch {
		throw new DomainError(
			"storage_write_failed",
			502,
			"Audit export could not be written to storage",
		);
	}
	try {
		await input.db.batch([
			input.db
				.prepare(
					`INSERT INTO audit_exports
					 (id, object_key, exported_by, record_count, delete_after, created_at, updated_at)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
				.bind(
					crypto.randomUUID(),
					key,
					input.actorUserId,
					recordCount,
					deleteAfter,
					now,
					now,
				),
			input.db
				.prepare(
					`INSERT INTO audit_logs
					 (id, actor_user_id, action, target_type, target_id, after, created_at)
					 VALUES (?, ?, 'audit.exported', 'r2_object', ?, ?, ?)`,
				)
				.bind(
					crypto.randomUUID(),
					input.actorUserId,
					key,
					JSON.stringify({ recordCount, deleteAfter }),
					now,
				),
		]);
	} catch {
		await input.bucket.delete(key).catch(() => undefined);
		throw new DomainError(
			"storage_metadata_failed",
			502,
			"Audit export metadata could not be recorded",
		);
	}
	return {
		key,
		recordCount,
		createdAt: new Date(now).toISOString(),
		deleteAfter: new Date(deleteAfter).toISOString(),
	};
}

function auditLogStream(
	db: D1Database,
	beforeCreatedAt: number,
	total: number,
) {
	const encoder = new TextEncoder();
	let emitted = 0;
	let cursor: { createdAt: number; id: string } | null = null;
	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			if (emitted >= total) {
				controller.close();
				return;
			}
			try {
				const remaining = Math.min(100, total - emitted);
				const statement = cursor
					? db
							.prepare(`${auditExportSelect}
							 WHERE al.created_at <= ? AND
							 (al.created_at < ? OR (al.created_at = ? AND al.id < ?))
							 ORDER BY al.created_at DESC, al.id DESC LIMIT ?`)
							.bind(
								beforeCreatedAt,
								cursor.createdAt,
								cursor.createdAt,
								cursor.id,
								remaining,
							)
					: db
							.prepare(`${auditExportSelect}
							 WHERE al.created_at <= ?
							 ORDER BY al.created_at DESC, al.id DESC LIMIT ?`)
							.bind(beforeCreatedAt, remaining);
				const rows = await statement.all<ExportAuditRow>();
				if (!rows.results.length) {
					controller.close();
					return;
				}
				emitted += rows.results.length;
				const last = rows.results.at(-1);
				if (last) cursor = { createdAt: last.created_at, id: last.id };
				controller.enqueue(
					encoder.encode(`${rows.results.map(serializeAuditRow).join("\n")}\n`),
				);
				if (emitted >= total) controller.close();
			} catch (error) {
				controller.error(error);
			}
		},
	});
}

const auditExportSelect = `SELECT al.id, al.action, al.target_type, al.target_id,
 al.request_id, al.ip_address, al.before, al.after, al.created_at,
 u.name AS actor_name, u.email AS actor_email
 FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_user_id`;

function serializeAuditRow(row: ExportAuditRow) {
	return JSON.stringify({
		id: row.id,
		action: row.action,
		targetType: row.target_type,
		targetId: row.target_id,
		requestId: row.request_id,
		ipAddress: row.ip_address,
		before: redactSerializedAuditValue(row.before),
		after: redactSerializedAuditValue(row.after),
		createdAt: new Date(row.created_at).toISOString(),
		actor: row.actor_name,
		actorEmail: row.actor_email,
	});
}
