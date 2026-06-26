/**
 * Esquema PostgreSQL (Drizzle).
 *
 * La identidad (usuarios y contraseñas) vive en MySQL `admin`; no hay tabla `users` aquí.
 * Roles y permisos de la app se gestionan con tablas propias (roles, user_roles, role_permissions).
 *
 * Las tablas de dominio (elecciones, votos, etc.) se añadirán en migraciones posteriores.
 *
 * Si una base de desarrollo ya tenía la tabla `users` creada por una migración antigua:
 *   DROP TABLE IF EXISTS users CASCADE;
 */
import {
  boolean,
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  bigint,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const campaignStatusEnum = pgEnum('campaign_status', [
  'activa',
  'borrador',
  'inactiva',
  'finalizada',
]);

export const voterIdentityTypeEnum = pgEnum('voter_identity_type', [
  'none',
  'auth_user',
  'dni',
  'phone',
  'email',
]);

export enum CampaignStatus {
  ACTIVE = 'activa',
  DRAFT = 'borrador',
  INACTIVE = 'inactiva',
  FINISHED = 'finalizada',
}

export interface CampaignOptionSchema {
  optionId: string;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * permissions — catálogo global de permisos de la aplicación.
 * `action` + `subject` se usan para CASL; `name` es el slug legible para la UI.
 */
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  /** Slug único, e.g. 'admin.permission.view' */
  name: varchar('name', { length: 150 }).unique().notNull(),
  description: text('description'),
  /** CASL action, e.g. 'read' | 'manage' | 'create' */
  action: varchar('action', { length: 100 }).notNull(),
  /** CASL subject, e.g. 'admin.permission' */
  subject: varchar('subject', { length: 100 }).notNull(),
});

/**
 * roles — application roles (e.g. 'admin', 'operador')
 */
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  description: text('description'),
});

/**
 * role_permissions — join: qué permisos tiene cada rol.
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

/**
 * user_roles — many-to-many pivot: admin.users.id ↔ roles.id
 * No FK on userId because users live in a different DB (MySQL admin).
 */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

/**
 * user_permissions — permisos directos por usuario (sin pasar por rol).
 * No FK en userId porque los usuarios viven en MySQL admin.
 */
export const userPermissions = pgTable(
  'user_permissions',
  {
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.permissionId] })],
);

/**
 * campaigns — active/draft/inactive voting campaigns
 */
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  description: text('description').notNull(),
  bannerUrl: varchar('banner_url', { length: 500 }),
  backgroundUrl: varchar('background_url', { length: 500 }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: campaignStatusEnum('status').notNull().default(CampaignStatus.DRAFT),
  ownerId: bigint('owner_id', { mode: 'number' }).notNull(),
  requiredAuth: boolean('required_auth').notNull().default(true),
  voterIdentityType: voterIdentityTypeEnum('voter_identity_type')
    .notNull()
    .default('none'),
  options: jsonb('options').$type<CampaignOptionSchema[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * votes — durable vote storage; high-throughput writes are buffered in Redis first
 */
export const votes = pgTable(
  'votes',
  {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }),
    voterIdentityType: voterIdentityTypeEnum('voter_identity_type'),
    voterIdentityHash: varchar('voter_identity_hash', { length: 128 }),
    campaignId: integer('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    optionId: varchar('option_id', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('votes_campaign_identity_hash_unique').on(
      table.campaignId,
      table.voterIdentityHash,
    ),
  ],
);

// Relations
export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const userPermissionsRelations = relations(
  userPermissions,
  ({ one }) => ({
    permission: one(permissions, {
      fields: [userPermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const campaignsRelations = relations(campaigns, ({ many }) => ({
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [votes.campaignId],
    references: [campaigns.id],
  }),
}));
