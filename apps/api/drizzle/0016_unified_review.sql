CREATE TYPE "public"."review_stage_v2" AS ENUM('intake', 'draft', 'review', 'publish_pack');
--> statement-breakpoint
ALTER TABLE "release_records"
ALTER COLUMN "stage" TYPE "public"."review_stage_v2"
USING (
	CASE
		WHEN "stage"::text IN ('claim_check', 'approval') THEN 'review'
		ELSE "stage"::text
	END::"public"."review_stage_v2"
);
--> statement-breakpoint
WITH ranked_review_statuses AS (
	SELECT
		"id",
		ROW_NUMBER() OVER (
			PARTITION BY "release_record_id"
			ORDER BY
				CASE "state"
					WHEN 'blocked' THEN 0
					WHEN 'pending' THEN 1
					ELSE 2
				END ASC,
				"updated_at" DESC,
				CASE "stage"
					WHEN 'approval' THEN 0
					ELSE 1
				END ASC,
				"id" DESC
		) AS "row_num"
	FROM "review_statuses"
	WHERE "stage" IN ('claim_check', 'approval')
)
DELETE FROM "review_statuses"
WHERE "id" IN (
	SELECT "id"
	FROM ranked_review_statuses
	WHERE "row_num" > 1
);
--> statement-breakpoint
ALTER TABLE "review_statuses"
ALTER COLUMN "stage" TYPE "public"."review_stage_v2"
USING (
	CASE
		WHEN "stage"::text IN ('claim_check', 'approval') THEN 'review'
		ELSE "stage"::text
	END::"public"."review_stage_v2"
);
--> statement-breakpoint
ALTER TABLE "workflow_events"
ALTER COLUMN "stage" TYPE "public"."review_stage_v2"
USING (
	CASE
		WHEN "stage"::text IN ('claim_check', 'approval') THEN 'review'
		ELSE "stage"::text
	END::"public"."review_stage_v2"
);
--> statement-breakpoint
DROP TYPE "public"."review_stage";
--> statement-breakpoint
ALTER TYPE "public"."review_stage_v2" RENAME TO "review_stage";
--> statement-breakpoint
CREATE TYPE "public"."workflow_event_type_v2" AS ENUM('draft_created', 'draft_updated', 'review_requested', 'draft_approved', 'draft_reopened', 'publish_pack_created');
--> statement-breakpoint
ALTER TABLE "workflow_events"
ALTER COLUMN "type" TYPE "public"."workflow_event_type_v2"
USING (
	CASE
		WHEN "type"::text IN ('claim_check_completed', 'approval_requested') THEN 'review_requested'
		ELSE "type"::text
	END::"public"."workflow_event_type_v2"
);
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
