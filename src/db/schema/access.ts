import { sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users } from "./auth";
import { timestamps } from "./common";

export const roles = sqliteTable(
	"roles",
	{
		id: text("id").primaryKey(),
		name: text("name").notNull(),
		description: text("description"),
		builtIn: integer("built_in", { mode: "boolean" }).notNull().default(false),
		enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
		...timestamps,
	},
	(table) => [uniqueIndex("roles_name_uidx").on(table.name)],
);

export const rolePermissions = sqliteTable(
	"role_permissions",
	{
		id: text("id").primaryKey(),
		roleId: text("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		module: text("module").notNull(),
		permissionMask: integer("permission_mask").notNull().default(0),
		...timestamps,
	},
	(table) => [
		uniqueIndex("role_permissions_role_module_uidx").on(
			table.roleId,
			table.module,
		),
	],
);

export const userRoles = sqliteTable(
	"user_roles",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		roleId: text("role_id")
			.notNull()
			.references(() => roles.id, { onDelete: "cascade" }),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
	},
	(table) => [
		uniqueIndex("user_roles_user_role_uidx").on(table.userId, table.roleId),
		index("user_roles_role_idx").on(table.roleId),
	],
);
