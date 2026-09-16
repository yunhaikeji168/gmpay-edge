import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { timestamps } from "./common";

export const users = sqliteTable(
	"users",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		email: text("email").notNull().unique(),
		emailVerified: integer("email_verified", { mode: "boolean" })
			.notNull()
			.default(false),
		image: text("image"),
		enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
		twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" })
			.notNull()
			.default(false),
		disabledAt: integer("disabled_at", { mode: "timestamp_ms" }),
		...timestamps,
	},
	(table) => [index("users_created_idx").on(table.createdAt, table.id)],
);

export const sessions = sqliteTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		...timestamps,
	},
	(table) => [index("sessions_user_idx").on(table.userId)],
);

export const accounts = sqliteTable(
	"accounts",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp_ms",
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp_ms",
		}),
		scope: text("scope"),
		password: text("password"),
		...timestamps,
	},
	(table) => [
		uniqueIndex("accounts_provider_account_uidx").on(
			table.providerId,
			table.accountId,
		),
	],
);

export const verifications = sqliteTable(
	"verifications",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
		...timestamps,
	},
	(table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const twoFactors = sqliteTable(
	"two_factors",
	{
		id: text("id").primaryKey(),
		secret: text("secret").notNull(),
		backupCodes: text("backup_codes").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		verified: integer("verified", { mode: "boolean" }).notNull().default(false),
		failedVerificationCount: integer("failed_verification_count")
			.notNull()
			.default(0),
		lockedUntil: integer("locked_until", { mode: "timestamp_ms" }),
		...timestamps,
	},
	(table) => [uniqueIndex("two_factors_user_uidx").on(table.userId)],
);

export const user = users;
export const session = sessions;
export const account = accounts;
export const verification = verifications;
export const twoFactor = twoFactors;
