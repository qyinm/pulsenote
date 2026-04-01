import { permanentRedirect } from "next/navigation"

export default function ClaimCheckPage() {
  permanentRedirect("/dashboard/releases?focus=review")
}
