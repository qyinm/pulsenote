CREATE TYPE "public"."claim_status" AS ENUM('pending', 'flagged', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."evidence_source_type" AS ENUM('pull_request', 'commit', 'release', 'ticket', 'document');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('pending', 'blocked', 'approved');--> statement-breakpoint
CREATE TABLE "claim_candidate_evidence_blocks" (
	"claim_candidate_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_block_id" uuid NOT NULL,
	CONSTRAINT "claim_candidate_evidence_blocks_claim_candidate_id_evidence_block_id_pk" PRIMARY KEY("claim_candidate_id","evidence_block_id")
);
--> statement-breakpoint
CREATE TABLE "claim_candidates" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_record_id" uuid NOT NULL,
	"sentence" text NOT NULL,
	"status" "claim_status" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_blocks" (
	"body" text,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evidence_state" "evidence_state" NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"release_record_id" uuid NOT NULL,
	"source_ref" text NOT NULL,
	"source_type" "evidence_source_type" NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "release_records" (
	"compare_range" text,
	"connection_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stage" "review_stage" NOT NULL,
	"summary" text,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text,
	"owner_user_id" uuid,
	"release_record_id" uuid NOT NULL,
	"stage" "review_stage" NOT NULL,
	"state" "review_state" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"release_record_id" uuid NOT NULL,
	"url" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "claim_candidate_evidence_blocks" ADD CONSTRAINT "claim_candidate_evidence_blocks_claim_candidate_id_claim_candidates_id_fk" FOREIGN KEY ("claim_candidate_id") REFERENCES "public"."claim_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_candidate_evidence_blocks" ADD CONSTRAINT "claim_candidate_evidence_blocks_evidence_block_id_evidence_blocks_id_fk" FOREIGN KEY ("evidence_block_id") REFERENCES "public"."evidence_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_candidates" ADD CONSTRAINT "claim_candidates_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_blocks" ADD CONSTRAINT "evidence_blocks_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_records" ADD CONSTRAINT "release_records_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_records" ADD CONSTRAINT "release_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_statuses" ADD CONSTRAINT "review_statuses_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_statuses" ADD CONSTRAINT "review_statuses_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_links" ADD CONSTRAINT "source_links_release_record_id_release_records_id_fk" FOREIGN KEY ("release_record_id") REFERENCES "public"."release_records"("id") ON DELETE cascade ON UPDATE no action;