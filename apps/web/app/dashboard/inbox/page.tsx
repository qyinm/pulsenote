import { ReviewInboxWorkspace } from "@/components/dashboard/review-inbox-workspace"

export default function InboxPage() {
  return (
    <div className="flex h-[calc(100dvh-var(--header-height)-2rem)] min-h-0 flex-1 overflow-hidden p-4 md:h-[calc(100dvh-var(--header-height)-4rem)] md:p-6">
      <ReviewInboxWorkspace />
    </div>
  )
}
