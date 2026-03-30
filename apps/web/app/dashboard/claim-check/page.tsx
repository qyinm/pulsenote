import { redirect } from "next/navigation"

export default function ClaimCheckPage() {
  redirect("/dashboard/releases?focus=claim_check")
}
