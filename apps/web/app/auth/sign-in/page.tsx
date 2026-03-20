import { EmailAuthCard } from "@/components/auth/email-auth-card"

export default async function SignInPage() {
  return <EmailAuthCard mode="sign-in" callbackURL="/dashboard/release-context" />
}
