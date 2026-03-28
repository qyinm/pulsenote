ALTER TABLE "github_connection_configs" DROP CONSTRAINT "github_connection_configs_connected_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "github_connection_configs" ADD CONSTRAINT "github_connection_configs_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
