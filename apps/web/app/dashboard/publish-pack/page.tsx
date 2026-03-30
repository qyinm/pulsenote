import { permanentRedirect } from "next/navigation"

export default function PublishPackPage() {
  permanentRedirect("/dashboard/releases?focus=publish_pack")
}
