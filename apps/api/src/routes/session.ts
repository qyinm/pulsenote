import { Hono } from "hono"

import type { AuthSessionRecord } from "../auth/service.js"
import type { AppBindings } from "../types.js"

export const sessionRoute = new Hono<AppBindings>()

type AuthSessionDTO = Pick<AuthSessionRecord, "createdAt" | "expiresAt" | "id" | "updatedAt" | "userId">

function toAuthSessionDTO(session: AuthSessionRecord): AuthSessionDTO {
  return {
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    id: session.id,
    updatedAt: session.updatedAt,
    userId: session.userId,
  }
}

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
    session: toAuthSessionDTO(session),
    user,
  })
})
