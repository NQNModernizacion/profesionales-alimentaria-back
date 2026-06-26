import {
  mysqlTable,
  bigint,
  varchar,
  text,
  int,
  datetime,
  date,
} from 'drizzle-orm/mysql-core';

/**
 * admin.users — identity table (Laravel / Sanctum)
 * Primary key is bigint unsigned; Drizzle mysql-core uses bigint mode:'number' or 'bigint'
 */
export const adminUsers = mysqlTable('users', {
  id: bigint('id', { mode: 'number', unsigned: true }).primaryKey().notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  domicilioElectronicoId: bigint('domicilio_electronico_id', {
    mode: 'number',
    unsigned: true,
  }),
  password: varchar('password', { length: 255 }).notNull(),
  tokenWeblogin: text('token_weblogin'),
  rememberToken: varchar('remember_token', { length: 100 }),
  createdAt: datetime('created_at'),
  updatedAt: datetime('updated_at'),
});

/**
 * admin.Usuarios — pivot between Personas (PersonaID) and users (ReferenciaID)
 * Uses ENGINE=FEDERATED so FK constraint is not enforced at DB level.
 */
export const adminUsuarios = mysqlTable('Usuarios', {
  referenciaId: int('ReferenciaID').primaryKey().notNull(),
  personaId: int('PersonaID'),
  usuario: varchar('Usuario', { length: 100 }),
  fechaDeAlta: datetime('FechaDeAlta'),
  fechaUltimoAcceso: datetime('FechaUltimoAcceso'),
  eClave: varchar('eClave', { length: 300 }),
});

/**
 * admin.Personas — personal identity data (FEDERATED)
 */
export const adminPersonas = mysqlTable('Personas', {
  id: int('id').primaryKey().autoincrement().notNull(),
  documento: int('documento').notNull(),
  genero: varchar('genero', { length: 1 }).notNull(),
  apellidos: varchar('apellidos', { length: 100 }).notNull(),
  nombres: varchar('nombres', { length: 100 }).notNull(),
  nombreCompleto: varchar('nombreCompleto', { length: 500 }),
  fechaNacimiento: date('fechaNacimiento'),
  tramite: int('tramite').default(0).notNull(),
  ejemplar: varchar('ejemplar', { length: 1 }).notNull(),
  emision: date('emision'),
  vencimiento: date('vencimiento'),
  cuil: varchar('cuil', { length: 13 }),
  codigoPostal: int('codigoPostal'),
  cpa: varchar('cpa', { length: 8 }),
  calle: varchar('calle', { length: 100 }),
  numero: varchar('numero', { length: 100 }),
  piso: varchar('piso', { length: 100 }),
  monoblock: varchar('monoblock', { length: 100 }),
  barrio: varchar('barrio', { length: 100 }),
  direccionCompleta: varchar('direccionCompleta', { length: 500 }),
  fechaFallecimiento: date('fechaFallecimiento'),
  fechaRegistro: datetime('fechaRegistro').notNull(),
  actualizacion: datetime('actualizacion').notNull(),
  celular: varchar('celular', { length: 100 }),
  celularVerificado: int('celularVerificado').default(0).notNull(),
  correoElectronico: varchar('correoElectronico', { length: 500 }),
  correoElectronicoVerificado: int('correoElectronicoVerificado')
    .default(0)
    .notNull(),
  geoLocalizacion: varchar('geoLocalizacion', { length: 1000 }),
  busy: int('busy').default(0).notNull(),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type AdminUsuario = typeof adminUsuarios.$inferSelect;
export type AdminPersona = typeof adminPersonas.$inferSelect;
