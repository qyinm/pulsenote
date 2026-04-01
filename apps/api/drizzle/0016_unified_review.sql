ALTER TYPE "public"."review_stage" ADD VALUE IF NOT EXISTS 'review';
--> statement-breakpoint
ALTER TYPE "public"."workflow_event_type" ADD VALUE IF NOT EXISTS 'review_requested';
--> statement-breakpoint
UPDATE "release_records"
SET "stage" = 'review'
WHERE "stage" IN ('claim_check', 'approval');
--> statement-breakpoint
UPDATE "review_statuses"
SET "stage" = 'review'
WHERE "stage" IN ('claim_check', 'approval');
--> statement-breakpoint
UPDATE "workflow_events"
SET
	"stage" = CASE
		WHEN "stage" IN ('claim_check', 'approval') THEN 'review'::"review_stage"
		ELSE "stage"
	END,
	"type" = CASE
		WHEN "type" IN ('claim_check_completed', 'approval_requested') THEN 'review_requested'::"workflow_event_type"
		ELSE "type"
	END;
--> statement-breakpoint
CREATE TYPE "public"."review_stage_v2" AS ENUM('intake', 'draft', 'review', 'publish_pack');
--> statement-breakpoint
ALTER TABLE "release_records"
ALTER COLUMN "stage" TYPE "public"."review_stage_v2"
USING ("stage"::text::"public"."review_stage_v2");
--> statement-breakpoint
ALTER TABLE "review_statuses"
ALTER COLUMN "stage" TYPE "public"."review_stage_v2"
USING ("stage"::text::"public"."review_stage_v2");
--> statement-breakpoint
ALTER TABLE "workflow_events"
ALTER COLUMN "stage" TYPE "public"."review_stage_v2"
USING ("stage"::text::"public"."review_stage_v2");
--> statement-breakpoint
DROP TYPE "public"."review_stage";
--> statement-breakpoint
ALTER TYPE "public"."review_stage_v2" RENAME TO "review_stage";
--> statement-breakpoint
CREATE TYPE "public"."workflow_event_type_v2" AS ENUM('draft_created', 'draft_updated', 'review_requested', 'draft_approved', 'draft_reopened', 'publish_pack_created');
--> statement-breakpoint
ALTER TABLE "workflow_events"
ALTER COLUMN "type" TYPE "public"."workflow_event_type_v2"
USING ("type"::text::"public"."workflow_event_type_v2");
--> statement-breakpoint
DROP TYPE "public"."workflow_event_type";
--> statement-breakpoint
ALTER TYPE "public"."workflow_event_type_v2" RENAME TO "workflow_event_type";
--> statement-breakpoint
ALTER TABLE "workspace_policy_settings"
DROP COLUMN IF EXISTS "require_claim_check_before_approval";
--> statement-breakpoint
DROP TABLE IF EXISTS "draft_claim_check_result_evidence_blocks" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "draft_claim_check_results" CASCADE;
