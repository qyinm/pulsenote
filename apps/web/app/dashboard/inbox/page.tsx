import { ReviewInboxWorkspace } from "@/components/dashboard/review-inbox-workspace"

export default function InboxPage() {
  return (
    <div className="flex h-[calc(100dvh_-_var(--header-height))] min-h-0 overflow-hidden md:h-[calc(100dvh_-_var(--header-height)_-_1rem)]">
      <ReviewInboxWorkspace />
    </div>
  )
}
