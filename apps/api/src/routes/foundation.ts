import { Hono } from "hono"

import {
  foundationModelNames,
  integrationProviders,
  reviewStages,
  syncRunStatuses,
} from "../domain/models.js"
import type { AppBindings } from "../types.js"

export const foundationRoute = new Hono<AppBindings>()

foundationRoute.get("/", (context) => {
  return context.json({
    foundation: {
      models: foundationModelNames,
      providerPriority: ["github", "linear"],
      providers: integrationProviders,
      reviewStages,
      syncRunStatuses,
    },
    nextMilestones: [
      "persist workspace and integration state",
      "add GitHub ingest endpoints",
      "normalize release records from provider payloads",
    ],
    phase: "foundation",
    requestId: context.get("requestId"),
  })
})
