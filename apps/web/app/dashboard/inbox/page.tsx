import { ReviewInboxWorkspace } from "@/components/dashboard/review-inbox-workspace"

export default function InboxPage() {
  return (
    <div className="flex h-[calc(100dvh_-_var(--header-height)_-_2rem)] min-h-0 overflow-hidden p-4 md:h-[calc(100dvh_-_var(--header-height)_-_4rem)] md:p-6">
      <ReviewInboxWorkspace />
    </div>
  )
}
