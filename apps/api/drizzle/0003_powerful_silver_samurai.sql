WITH duplicate_workspace_memberships AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY workspace_id, user_id
      ORDER BY created_at ASC, id ASC
    ) AS row_number
  FROM "workspace_memberships"
)
DELETE FROM "workspace_memberships"
WHERE id IN (
  SELECT id
  FROM duplicate_workspace_memberships
  WHERE row_number > 1
);--> statement-breakpoint
WITH duplicate_source_cursors AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY connection_id, key
      ORDER BY updated_at DESC, id DESC
    ) AS row_number
  FROM "source_cursors"
)
DELETE FROM "source_cursors"
WHERE id IN (
  SELECT id
  FROM duplicate_source_cursors
  WHERE row_number > 1
);--> statement-breakpoint
WITH duplicate_review_statuses AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY release_record_id, stage
      ORDER BY updated_at DESC, id DESC
    ) AS row_number
  FROM "review_statuses"
)
DELETE FROM "review_statuses"
WHERE id IN (
  SELECT id
  FROM duplicate_review_statuses
  WHERE row_number > 1
);--> statement-breakpoint
DELETE FROM "sync_runs" AS sync_runs
WHERE NOT EXISTS (
  SELECT 1
  FROM "integration_connections" AS integration_connections
  WHERE integration_connections.id = sync_runs.connection_id
    AND integration_connections.workspace_id = sync_runs.workspace_id
);--> statement-breakpoint
DELETE FROM "release_records" AS release_records
WHERE NOT EXISTS (
  SELECT 1
  FROM "integration_connections" AS integration_connections
  WHERE integration_connections.id = release_records.connection_id
    AND integration_connections.workspace_id = release_records.workspace_id
);--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_id_workspace_id_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "release_records" ADD CONSTRAINT "release_records_connection_id_workspace_id_integration_connections_fk" FOREIGN KEY ("connection_id","workspace_id") REFERENCES "public"."integration_connections"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_connection_id_workspace_id_integration_connections_fk" FOREIGN KEY ("connection_id","workspace_id") REFERENCES "public"."integration_connections"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_statuses" ADD CONSTRAINT "review_statuses_release_record_id_stage_unique" UNIQUE("release_record_id","stage");--> statement-breakpoint
ALTER TABLE "source_cursors" ADD CONSTRAINT "source_cursors_connection_id_key_unique" UNIQUE("connection_id","key");--> statement-breakpoint
ALTER TABLE "workspace_memberships" ADD CONSTRAINT "workspace_memberships_workspace_id_user_id_unique" UNIQUE("workspace_id","user_id");
