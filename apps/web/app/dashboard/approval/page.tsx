import { redirect } from "next/navigation"

export default function ApprovalPage() {
  redirect("/dashboard/releases?focus=approval")
}
