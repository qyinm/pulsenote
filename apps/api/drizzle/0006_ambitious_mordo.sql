CREATE TYPE "public"."workflow_event_type" AS ENUM('draft_created', 'claim_check_completed', 'approval_requested', 'draft_approved', 'draft_reopened', 'publish_pack_created');--> statement-breakpoint
CREATE TABLE "draft_claim_check_result_evidence_blocks" (
	"draft_claim_check_result_id" uuid NOT NULL,
	"evidence_block_id" uuid NOT NULL,
	CONSTRAINT "draft_claim_check_result_evidence_blocks_pk" PRIMARY KEY("draft_claim_check_result_id","evidence_block_id")
);
--> statement-breakpoint
CREATE TABLE "draft_claim_check_results" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"draft_revision_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text,
	"release_record_id" uuid NOT NULL,
	"sentence" text NOT NULL,
	"status" "claim_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_revisions" (
	"changelog_body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_notes_body" text NOT NULL,
	"release_record_id" uuid NOT NULL,
	"version" integer NOT NULL,
	CONSTRAINT "draft_revisions_release_record_id_version_unique" UNIQUE("release_record_id","version")
);
--> statement-breakpoint
CREATE TABLE "publish_pack_exports" (
	"changelog_body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"draft_revision_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_notes_body" text NOT NULL,
	"release_record_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"draft_revision_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text,
	"release_record_id" uuid NOT NULL,
	"stage" "review_stage" NOT NULL,
	"type" "workflow_event_type" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "draft_claim_check_result_evidence_blocks" ADD CONSTRAINT "draft_claim_check_result_evidence_blocks_draft_claim_check_result_id_draft_claim_check_results_id_fk" FOREIGN KEY ("draft_claim_check_result_id") REFERENCES "public"."draft_claim_check_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_claim_check_result_evidence_blocks" ADD CONSTRAINT "draft_claim_check_result_evidence_blocks_evidence_block_id_evidence_blocks_id_fk" FOREIGN KEY ("evidence_block_id") REFERENCES "public"."evidence_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_claim_check_results" ADD CONSTRAINT "draft_claim_check_results_draft_revision_id_draft_revisions_id_fk" FOREIGN KEY ("draft_revision_id") REFERENCES "public"."draft_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_claim_check_results" ADD CONSTRAINT "draft_claim_check_results_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_revisions" ADD CONSTRAINT "draft_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_revisions" ADD CONSTRAINT "draft_revisions_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_pack_exports" ADD CONSTRAINT "publish_pack_exports_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_pack_exports" ADD CONSTRAINT "publish_pack_exports_draft_revision_id_draft_revisions_id_fk" FOREIGN KEY ("draft_revision_id") REFERENCES "public"."draft_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publish_pack_exports" ADD CONSTRAINT "publish_pack_exports_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_draft_revision_id_draft_revisions_id_fk" FOREIGN KEY ("draft_revision_id") REFERENCES "public"."draft_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;
