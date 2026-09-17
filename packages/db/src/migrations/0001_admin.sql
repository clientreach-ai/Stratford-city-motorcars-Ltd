CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_invitation_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "appointment" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer NOT NULL,
	"vehicle_id" text,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"enquiry_id" text,
	"handled_by" text,
	"notes" text DEFAULT '' NOT NULL,
	"checks" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"email_key" text,
	"phone_key" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"type" text NOT NULL,
	"body" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_active_at" timestamp;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "reservation" jsonb;--> statement-breakpoint
ALTER TABLE "vehicle" ADD COLUMN "sale" jsonb;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "closed_reason" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "customer_id" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "handled_by" text;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "valuation" jsonb;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "lead" ADD COLUMN "first_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "team_invitation" ADD CONSTRAINT "team_invitation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_vehicle_id_vehicle_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_enquiry_id_lead_id_fk" FOREIGN KEY ("enquiry_id") REFERENCES "public"."lead"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_lead_id_lead_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."lead"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activity" ADD CONSTRAINT "lead_activity_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_starts_at_idx" ON "appointment" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "customer_email_key_idx" ON "customer" USING btree ("email_key");--> statement-breakpoint
CREATE INDEX "customer_phone_key_idx" ON "customer" USING btree ("phone_key");--> statement-breakpoint
CREATE INDEX "lead_activity_lead_id_idx" ON "lead_activity" USING btree ("lead_id");--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead" ADD CONSTRAINT "lead_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_status_idx" ON "lead" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lead_customer_id_idx" ON "lead" USING btree ("customer_id");--> statement-breakpoint
-- Existing enquiries: the old `closed` status becomes `not-proceeding` (reason `other`).
UPDATE "lead" SET "status" = 'not-proceeding', "closed_reason" = 'other' WHERE "status" = 'closed';--> statement-breakpoint
UPDATE "lead" SET "updated_at" = "created_at";--> statement-breakpoint
-- Every enquiry starts its history with the website's own entry.
INSERT INTO "lead_activity" ("id", "lead_id", "type", "body", "author_id", "author_name", "created_at")
SELECT gen_random_uuid()::text, "id", 'created', 'Enquiry received from the website.', NULL, 'Website', "created_at"
FROM "lead"
WHERE NOT EXISTS (SELECT 1 FROM "lead_activity" WHERE "lead_activity"."lead_id" = "lead"."id");
