import { ReleaseContextPageContent } from "@/app/dashboard/release-context/page"

export default async function NewReleasePage() {
  return (
    <ReleaseContextPageContent
      unavailableTitle="New release is unavailable"
      unavailableDescription="The authenticated API request failed before the new release scope builder could be rendered."
    />
  )
}
