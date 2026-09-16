import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";

import {
	account,
	auditLogs,
	exchangeRates,
	paymentAssets,
	paymentIngresses,
	paymentRails,
	roles,
	systemSettings,
	telegramBotCommands,
	user,
	userRoles,
} from "#/db/schema";
import {
	initialExchangeRates,
	initialPaymentAssets,
	initialPaymentConnections,
	initialPaymentRails,
} from "#/features/payment-settings/catalog";
import {
	defaultCryptoRateSync,
	defaultFiatRateSync,
} from "#/features/payment-settings/server/exchange-rates";
import {
	defaultTelegramCommands,
	defaultTelegramCommandTranslations,
	defaultTelegramSettings,
} from "#/features/telegram/defaults";
import { DomainError } from "#/lib/domain-error";
import type { AppDb } from "#/server/db.server";
import {
	createInitialRuntimeConfig,
	type RuntimeConfig,
	runtimeConfigEntries,
} from "#/server/runtime-config";

export type InstallInput = {
	name: string;
	email: string;
	password: string;
};

export async function isInstalled(db: AppDb) {
	const row = await db.$client
		.prepare(`SELECT COUNT(*) AS value FROM user_roles
			INNER JOIN users ON users.id = user_roles.user_id
			INNER JOIN roles ON roles.id = user_roles.role_id
			WHERE roles.name = 'root' AND roles.enabled = 1 AND users.enabled = 1`)
		.first<{ value: number }>();
	return (row?.value ?? 0) > 0;
}

export async function installSystem(
	db: AppDb,
	input: InstallInput,
	runtimeConfig: RuntimeConfig = createInitialRuntimeConfig(),
) {
	if (await isInstalled(db)) {
		throw new DomainError(
			"already_installed",
			409,
			"System has already been installed.",
		);
	}

	const now = new Date();
	const userId = randomUUID();
	const rootRoleId = randomUUID();
	const email = normalizeEmail(input.email);
	const name = input.name.trim() || "Root";
	const password = assertPassword(input.password);

	const passwordHash = await hashPassword(password);
	const allowedHosts = runtimeConfig.betterAuthUrl
		? [new URL(runtimeConfig.betterAuthUrl).host.toLowerCase()]
		: [];
	await db
		.batch([
			db.insert(user).values({
				id: userId,
				name,
				email,
				emailVerified: true,
				image: null,
				enabled: true,
				createdAt: now,
				updatedAt: now,
			}),
			db.insert(roles).values({
				id: rootRoleId,
				name: "root",
				description: "Built-in unrestricted system role",
				builtIn: true,
				enabled: true,
				createdAt: now,
				updatedAt: now,
			}),
			db.insert(userRoles).values({
				id: randomUUID(),
				userId,
				roleId: rootRoleId,
				createdAt: now,
			}),
			db.insert(account).values({
				id: randomUUID(),
				accountId: userId,
				providerId: "credential",
				userId,
				password: passwordHash,
				createdAt: now,
				updatedAt: now,
			}),
			...runtimeConfigEntries(runtimeConfig).map((entry) =>
				db.insert(systemSettings).values({
					key: entry.key,
					value: entry.value,
					isSecret: entry.isSecret,
					updatedBy: userId,
					createdAt: now,
					updatedAt: now,
				}),
			),
			db.insert(systemSettings).values({
				key: "security.allowed_hosts",
				value: allowedHosts,
				isSecret: false,
				updatedBy: userId,
				createdAt: now,
				updatedAt: now,
			}),
			...defaultTelegramSettings.map((entry) =>
				db.insert(systemSettings).values({
					key: entry.key,
					value: entry.value,
					isSecret: false,
					updatedBy: userId,
					createdAt: now,
					updatedAt: now,
				}),
			),
			...defaultTelegramCommands.map((command, index) =>
				db.insert(telegramBotCommands).values({
					id: `telegram-command-${command.command}-default`,
					command: command.command,
					descriptionEnUs: command.descriptions["en-US"],
					descriptionJaJp: command.descriptions["ja-JP"],
					descriptionKoKr: command.descriptions["ko-KR"],
					descriptionRuRu: command.descriptions["ru-RU"],
					descriptionZhTw: command.descriptions["zh-TW"],
					descriptionZhCn: command.descriptions["zh-CN"],
					handlerType: command.handlerType,
					templateTranslations: defaultTelegramCommandTranslations(
						command.command,
					),
					scope: "default",
					sortOrder: (index + 1) * 10,
					enabled: true,
					createdAt: now,
					updatedAt: now,
				}),
			),
			db.insert(systemSettings).values({
				key: "rates.crypto_sync",
				value: defaultCryptoRateSync,
				isSecret: false,
				updatedBy: userId,
				createdAt: now,
				updatedAt: now,
			}),
			db.insert(systemSettings).values({
				key: "rates.fiat_sync",
				value: defaultFiatRateSync,
				isSecret: false,
				updatedBy: userId,
				createdAt: now,
				updatedAt: now,
			}),
			...initialPaymentRails.map((rail) =>
				db.insert(paymentRails).values({
					...rail,
					createdAt: now,
					updatedAt: now,
				}),
			),
			...initialPaymentAssets.map((asset) =>
				db.insert(paymentAssets).values({
					...asset,
					createdAt: now,
					updatedAt: now,
				}),
			),
			...initialPaymentConnections.map((connection) =>
				db.insert(paymentIngresses).values({
					...connection,
					apiKey: null,
					createdAt: now,
					updatedAt: now,
				}),
			),
			...initialExchangeRates.map((rate) =>
				db.insert(exchangeRates).values({
					...rate,
					rawRate: rate.rate,
					adjustmentBps: 0,
					observedAt: rate.source === "manual" ? now : new Date(0),
					expiresAt:
						rate.source === "manual"
							? new Date(now.getTime() + 10 * 365 * 86_400_000)
							: new Date(0),
					createdAt: now,
					updatedAt: now,
				}),
			),
			db.insert(auditLogs).values({
				id: randomUUID(),
				actorUserId: userId,
				action: "system.installed",
				targetType: "role",
				targetId: rootRoleId,
				after: { rootEmail: email, role: "root" },
				createdAt: now,
			}),
		])
		.catch(async (error) => {
			// A concurrent installer can pass the initial read before the other D1
			// batch commits. Re-read authoritative state instead of parsing unstable
			// SQLite error text or leaking the failed statement across the boundary.
			if (await isInstalled(db)) {
				throw new DomainError(
					"already_installed",
					409,
					"System has already been installed.",
				);
			}
			throw error;
		});

	return { email, installed: true };
}

function normalizeEmail(value: string) {
	const email = value.trim().toLowerCase();
	if (!email)
		throw new DomainError("email_required", 400, "Email is required.");
	return email;
}

function assertPassword(value: string) {
	if (value.length < 12) {
		throw new DomainError(
			"password_too_short",
			400,
			"Password must be at least 12 characters long.",
		);
	}
	return value;
}
