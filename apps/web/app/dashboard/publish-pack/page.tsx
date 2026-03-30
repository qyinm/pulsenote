import { redirect } from "next/navigation"

export default function PublishPackPage() {
  redirect("/dashboard/releases?focus=publish_pack")
}
