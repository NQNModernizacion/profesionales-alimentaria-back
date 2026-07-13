CREATE TYPE "public"."campaign_status" AS ENUM('activa', 'borrador', 'inactiva', 'finalizada');--> statement-breakpoint
CREATE TYPE "public"."solicitud_estado" AS ENUM('borrador', 'enviada', 'en_revision', 'aprobada', 'rechazada', 'publicada', 'no_publicada');--> statement-breakpoint
CREATE TYPE "public"."voter_identity_type" AS ENUM('none', 'auth_user', 'dni', 'phone', 'email');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"banner_url" varchar(500),
	"background_url" varchar(500),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "campaign_status" DEFAULT 'borrador' NOT NULL,
	"owner_id" bigint NOT NULL,
	"required_auth" boolean DEFAULT true NOT NULL,
	"voter_identity_type" "voter_identity_type" DEFAULT 'none' NOT NULL,
	"options" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"action" varchar(100) NOT NULL,
	"subject" varchar(100) NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "solicitudes" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" bigint NOT NULL,
	"estado" "solicitud_estado" DEFAULT 'borrador' NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"apellido" varchar(150) NOT NULL,
	"dni" varchar(20) NOT NULL,
	"cuit" varchar(20) NOT NULL,
	"fecha_nacimiento" varchar(20) NOT NULL,
	"domicilio" varchar(300) NOT NULL,
	"email" varchar(255) NOT NULL,
	"telefono" varchar(50) NOT NULL,
	"titulo_id" varchar(100) NOT NULL,
	"matricula" varchar(100) NOT NULL,
	"matricula_vigente" boolean DEFAULT false NOT NULL,
	"areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"areas_otros" varchar(300) DEFAULT '' NOT NULL,
	"acepta_ddjj" boolean DEFAULT false NOT NULL,
	"consiente_publicacion" boolean DEFAULT false NOT NULL,
	"motivo_rechazo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"user_id" bigint NOT NULL,
	"permission_id" integer NOT NULL,
	CONSTRAINT "user_permissions_user_id_permission_id_pk" PRIMARY KEY("user_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" bigint NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"voter_identity_type" "voter_identity_type",
	"voter_identity_hash" varchar(128),
	"campaign_id" integer NOT NULL,
	"option_id" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_campaign_identity_hash_unique" ON "votes" USING btree ("campaign_id","voter_identity_hash");