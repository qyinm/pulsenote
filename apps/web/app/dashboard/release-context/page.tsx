import { redirect } from "next/navigation"

export default async function ReleaseContextPage() {
  redirect("/dashboard/new-release")
}
