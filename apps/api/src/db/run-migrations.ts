import { runDatabaseMigrationsForRuntime } from "./migrate.js"
import { getRuntimeEnv } from "../lib/env.js"

await runDatabaseMigrationsForRuntime(getRuntimeEnv())
