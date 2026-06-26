CREATE TYPE "voter_identity_type" AS ENUM('none', 'auth_user', 'dni', 'phone', 'email');--> statement-breakpoint

ALTER TABLE "campaigns"
DROP COLUMN "vote_unique";--> statement-breakpoint

ALTER TABLE "campaigns"
ADD COLUMN "voter_identity_type" "voter_identity_type" NOT NULL DEFAULT 'none';--> statement-breakpoint

DROP INDEX IF EXISTS "votes_campaign_user_unique";--> statement-breakpoint

ALTER TABLE "votes"
ADD COLUMN "voter_identity_type" "voter_identity_type";--> statement-breakpoint

ALTER TABLE "votes"
ADD COLUMN "voter_identity_hash" varchar(128);--> statement-breakpoint

CREATE UNIQUE INDEX "votes_campaign_identity_hash_unique"
ON "votes" ("campaign_id", "voter_identity_hash");
