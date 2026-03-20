import { createApiClient, type WorkspaceSnapshot } from "../api/client"

type WorkspaceOnboardingApiClient = Pick<
  ReturnType<typeof createApiClient>,
  "bootstrapCurrentUserWorkspace"
>

export function normalizeWorkspaceSlug(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return normalized || "workspace"
}

export async function submitWorkspaceOnboardingForm(
  payload: {
    name: string
  },
  apiClient: WorkspaceOnboardingApiClient = createApiClient(),
): Promise<WorkspaceSnapshot> {
  const name = payload.name.trim()

  return apiClient.bootstrapCurrentUserWorkspace({
    workspace: {
      name,
      slug: normalizeWorkspaceSlug(name),
    },
  })
}
