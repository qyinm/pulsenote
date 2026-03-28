ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_workspace_id_provider_unique" UNIQUE("workspace_id","provider");
