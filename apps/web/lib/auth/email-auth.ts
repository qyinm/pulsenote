import { authClient } from "./client"

export type EmailAuthMode = "sign-in" | "sign-up"

type EmailAuthContent = {
  alternateHref: string
  alternateLabel: string
  description: string
  primaryLabel: string
  title: string
}

type SignInPayload = {
  callbackURL?: string
  email: string
  password: string
}

type SignUpPayload = SignInPayload & {
  name: string
}

type EmailAuthClient = {
  signIn: {
    email(payload: SignInPayload): Promise<unknown>
  }
  signUp: {
    email(payload: SignUpPayload): Promise<unknown>
  }
}

const emailAuthContent = {
  "sign-in": {
    alternateHref: "/auth/sign-up",
    alternateLabel: "Create an account",
    description:
      "Open the release workspace with an authenticated reviewer session before checking evidence, wording, and approvals.",
    primaryLabel: "Sign in",
    title: "Sign in to PulseNote",
  },
  "sign-up": {
    alternateHref: "/auth/sign-in",
    alternateLabel: "Sign in instead",
    description:
      "Start a release workspace so the first draft, claim check, approval, and publish pack all stay tied to the same reviewer identity.",
    primaryLabel: "Create account",
    title: "Create your PulseNote account",
  },
} satisfies Record<EmailAuthMode, EmailAuthContent>

export function getEmailAuthContent(mode: EmailAuthMode) {
  return emailAuthContent[mode]
}

export async function submitEmailAuthForm(
  mode: "sign-in",
  payload: SignInPayload,
  client?: EmailAuthClient,
): Promise<void>
export async function submitEmailAuthForm(
  mode: "sign-up",
  payload: SignUpPayload,
  client?: EmailAuthClient,
): Promise<void>
export async function submitEmailAuthForm(
  mode: EmailAuthMode,
  payload: SignInPayload | SignUpPayload,
  client: EmailAuthClient = authClient as EmailAuthClient,
): Promise<void> {
  if (mode === "sign-in") {
    await client.signIn.email({
      callbackURL: payload.callbackURL,
      email: payload.email.trim(),
      password: payload.password,
    })
    return
  }

  await client.signUp.email({
    callbackURL: payload.callbackURL,
    email: payload.email.trim(),
    name: "name" in payload ? payload.name.trim() : "",
    password: payload.password,
  })
}
