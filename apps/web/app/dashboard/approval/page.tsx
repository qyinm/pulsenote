import { permanentRedirect } from "next/navigation"

export default function ApprovalPage() {
  permanentRedirect("/dashboard/releases?focus=approval")
}
