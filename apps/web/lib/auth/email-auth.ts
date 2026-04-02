import { authClient, type AuthClientType } from "./client"

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

type EmailSignInPayload = Parameters<AuthClientType["signIn"]["email"]>[0]
type EmailSignUpPayload = Parameters<AuthClientType["signUp"]["email"]>[0]

export type EmailAuthClient = {
  signIn: {
    email(payload: EmailSignInPayload): Promise<unknown>
  }
  signUp: {
    email(payload: EmailSignUpPayload): Promise<unknown>
  }
}
type EmailAuthResult = {
  error?: {
    message?: string | null
  } | null
}

const emailAuthContent = {
  "sign-in": {
    alternateHref: "/auth/sign-up",
    alternateLabel: "Create an account",
    description:
      "Open the release workspace with an authenticated reviewer session before checking evidence, wording, and reviews.",
    primaryLabel: "Sign in",
    title: "Sign in to PulseNote",
  },
  "sign-up": {
    alternateHref: "/auth/sign-in",
    alternateLabel: "Sign in instead",
    description:
      "Start a release workspace so the first draft, review handoff, sign-off, and publish pack all stay tied to the same reviewer identity.",
    primaryLabel: "Create account",
    title: "Create your PulseNote account",
  },
} satisfies Record<EmailAuthMode, EmailAuthContent>

export function getEmailAuthContent(mode: EmailAuthMode) {
  return emailAuthContent[mode]
}

export function validateEmailAuthName(mode: EmailAuthMode, name: string) {
  if (mode === "sign-up" && name.trim().length === 0) {
    return "Full name is required."
  }

  return null
}

function assertEmailAuthResult(result: EmailAuthResult, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message?.trim() || fallbackMessage)
  }
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
  client: EmailAuthClient = authClient,
): Promise<void> {
  if (mode === "sign-in") {
    const result = (await client.signIn.email({
      callbackURL: payload.callbackURL,
      email: payload.email.trim(),
      password: payload.password,
    })) as EmailAuthResult
    assertEmailAuthResult(result, "Sign in failed")
    return
  }

  const result = (await client.signUp.email({
    callbackURL: payload.callbackURL,
    email: payload.email.trim(),
    name: "name" in payload ? payload.name.trim() : "",
    password: payload.password,
  })) as EmailAuthResult
  assertEmailAuthResult(result, "Sign up failed")
}
