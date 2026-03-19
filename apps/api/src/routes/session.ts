import { Hono } from "hono"

import type { AppBindings } from "../types.js"

export const sessionRoute = new Hono<AppBindings>()

sessionRoute.get("/", (context) => {
  const session = context.get("authSession")
  const user = context.get("authUser")

  if (!session || !user) {
    return context.json(
      {
        message: "Authentication is required",
        status: 401,
      },
      401,
    )
  }

  return context.json({
    session,
    user,
  })
})
