CREATE TYPE "public"."campaign_status" AS ENUM('activa', 'borrador', 'inactiva', 'finalizada');--> statement-breakpoint
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
	"options" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"campaign_id" integer NOT NULL,
	"option_id" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "votes_campaign_user_unique" ON "votes" USING btree ("campaign_id","user_id");