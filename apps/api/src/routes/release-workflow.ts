import { Hono, type Context } from "hono"

import type { AppBindings } from "../types.js"
import {
  ApprovalRequestRequiredError,
  ApprovedDraftRequiredError,
  ClaimCheckBlockedError,
  ClaimCheckRequiredError,
  DraftRevisionNotFoundError,
  InvalidStageTransitionError,
  InvalidDraftTemplateError,
  ReleaseWorkflowNotFoundError,
  ReviewerApprovalRequiredError,
  ReviewerAssignmentNotAllowedError,
  ReviewerAssignmentRequiredError,
  StaleDraftRevisionError,
  type ReleaseWorkflowService,
} from "../release-workflow/service.js"

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : null
}

function badRequest(message: string) {
  return {
    message,
    status: 400,
  } as const
}

async function parseOptionalJsonRecord(context: Context<AppBindings>) {
  const rawBody = await context.req.text()

  if (rawBody.trim().length === 0) {
    return {
      payload: null,
    } as const
  }

  try {
    return {
      payload: asRecord(JSON.parse(rawBody)),
    } as const
  } catch {
    return {
      error: badRequest("Malformed JSON request body"),
      payload: null,
    } as const
  }
}

function mapWorkflowError(error: unknown) {
  if (error instanceof ReleaseWorkflowNotFoundError || error instanceof DraftRevisionNotFoundError) {
    return {
      body: {
        message: error.message,
        status: 404,
      },
      status: 404,
    } as const
  }

  if (error instanceof StaleDraftRevisionError || error instanceof InvalidStageTransitionError) {
    return {
      body: {
        message: error.message,
        status: 409,
      },
      status: 409,
    } as const
  }

  if (
    error instanceof ClaimCheckRequiredError ||
    error instanceof ClaimCheckBlockedError ||
    error instanceof ApprovalRequestRequiredError ||
    error instanceof InvalidDraftTemplateError ||
    error instanceof ReviewerAssignmentRequiredError ||
    error instanceof ReviewerAssignmentNotAllowedError ||
    error instanceof ApprovedDraftRequiredError
  ) {
    return {
      body: {
        message: error.message,
        status: 422,
      },
      status: 422,
    } as const
  }

  if (error instanceof ReviewerApprovalRequiredError) {
    return {
      body: {
        message: error.message,
        status: 403,
      },
      status: 403,
    } as const
  }

  return null
}

function getRouteParam(context: Context<AppBindings>, key: "workspaceId" | "releaseRecordId") {
  const value = context.req.param(key)

  if (!value) {
    throw new Error(`${key} is required`)
  }

  return value
}

export function createReleaseWorkflowRoute(releaseWorkflowService: ReleaseWorkflowService) {
  const route = new Hono<AppBindings>()

  route.get("/history", async (context) => {
    const items = await releaseWorkflowService.listReleaseWorkflowHistory(
      getRouteParam(context, "workspaceId"),
    )
    return context.json(items)
  })

  route.get("/:releaseRecordId/history", async (context) => {
    try {
      const items = await releaseWorkflowService.getReleaseWorkflowHistory(
        getRouteParam(context, "workspaceId"),
        getRouteParam(context, "releaseRecordId"),
      )

      return context.json(items)
    } catch (error) {
      const mappedError = mapWorkflowError(error)

      if (mappedError) {
        return context.json(mappedError.body, mappedError.status)
      }

      throw error
    }
  })

  route.get("/", async (context) => {
    const items = await releaseWorkflowService.listReleaseWorkflow(getRouteParam(context, "workspaceId"))
    return context.json(items)
  })

  route.get("/:releaseRecordId", async (context) => {
    try {
      const detail = await releaseWorkflowService.getReleaseWorkflowDetail(
        getRouteParam(context, "workspaceId"),
        getRouteParam(context, "releaseRecordId"),
      )

      return context.json(detail)
    } catch (error) {
      const mappedError = mapWorkflowError(error)

      if (mappedError) {
        return context.json(mappedError.body, mappedError.status)
      }

      throw error
    }
  })

  route.post("/:releaseRecordId/drafts", async (context) => {
    const { error, payload } = await parseOptionalJsonRecord(context)

    if (error) {
      return context.json(error, error.status)
    }

    try {
      const detail = await releaseWorkflowService.createDraft({
        actorUserId: context.get("authUser")?.id ?? null,
        changelogBody: asOptionalString(payload?.changelogBody) ?? undefined,
        expectedLatestDraftRevisionId: asOptionalString(payload?.expectedLatestDraftRevisionId),
        releaseNotesBody: asOptionalString(payload?.releaseNotesBody) ?? undefined,
        releaseRecordId: getRouteParam(context, "releaseRecordId"),
        templateId: asOptionalString(payload?.templateId) ?? undefined,
        workspaceId: getRouteParam(context, "workspaceId"),
      })

      return context.json(detail, 201)
    } catch (error) {
      const mappedError = mapWorkflowError(error)

      if (mappedError) {
        return context.json(mappedError.body, mappedError.status)
      }

      throw error
    }
  })

  async function runDraftCommand(
    context: Context<AppBindings>,
    command: (input: {
      actorUserId: string | null
      expectedDraftRevisionId: string
      note?: string
      releaseRecordId: string
      workspaceId: string
    }) => Promise<unknown>,
  ) {
    const { error, payload } = await parseOptionalJsonRecord(context)

    if (error) {
      return context.json(error, error.status)
    }

    const expectedDraftRevisionId = asOptionalString(payload?.expectedDraftRevisionId)

    if (!expectedDraftRevisionId) {
      return context.json(badRequest("expectedDraftRevisionId is required"), 400)
    }

    try {
      const response = await command({
        actorUserId: context.get("authUser")?.id ?? null,
        expectedDraftRevisionId,
        note: asOptionalString(payload?.note) ?? undefined,
        releaseRecordId: getRouteParam(context, "releaseRecordId"),
        workspaceId: getRouteParam(context, "workspaceId"),
      })

      return context.json(response)
    } catch (error) {
      const mappedError = mapWorkflowError(error)

      if (mappedError) {
        return context.json(mappedError.body, mappedError.status)
      }

      throw error
    }
  }

  route.post("/:releaseRecordId/claim-check", async (context) =>
    runDraftCommand(context, (input) => releaseWorkflowService.runClaimCheck(input)),
  )
  route.post("/:releaseRecordId/request-approval", async (context) =>
    {
      const { error, payload } = await parseOptionalJsonRecord(context)

      if (error) {
        return context.json(error, error.status)
      }

      const expectedDraftRevisionId =
        asOptionalString(payload?.expectedDraftRevisionId)?.trim() ?? null
      const reviewerUserId = asOptionalString(payload?.reviewerUserId)?.trim() ?? null

      if (!expectedDraftRevisionId) {
        return context.json(badRequest("expectedDraftRevisionId is required"), 400)
      }

      try {
        const response = await releaseWorkflowService.requestApproval({
          actorUserId: context.get("authUser")?.id ?? null,
          expectedDraftRevisionId,
          note: asOptionalString(payload?.note) ?? undefined,
          releaseRecordId: getRouteParam(context, "releaseRecordId"),
          reviewerUserId: reviewerUserId ?? undefined,
          workspaceId: getRouteParam(context, "workspaceId"),
        })

        return context.json(response)
      } catch (routeError) {
        const mappedError = mapWorkflowError(routeError)

        if (mappedError) {
          return context.json(mappedError.body, mappedError.status)
        }

        throw routeError
      }
    },
  )
  route.post("/:releaseRecordId/approve", async (context) =>
    runDraftCommand(context, (input) => releaseWorkflowService.approveDraft(input)),
  )
  route.post("/:releaseRecordId/reopen", async (context) =>
    runDraftCommand(context, (input) => releaseWorkflowService.reopenDraft(input)),
  )
  route.post("/:releaseRecordId/publish-pack", async (context) =>
    runDraftCommand(context, (input) => releaseWorkflowService.createPublishPack(input)),
  )

  return route
}
