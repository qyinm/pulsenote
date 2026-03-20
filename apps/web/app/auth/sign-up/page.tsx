import { EmailAuthCard } from "@/components/auth/email-auth-card"

export default async function SignUpPage() {
  return <EmailAuthCard mode="sign-up" callbackURL="/dashboard/release-context" />
}
