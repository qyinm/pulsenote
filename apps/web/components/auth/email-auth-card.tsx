"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { EmailAuthShell } from "@/components/auth/email-auth-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { type EmailAuthMode, getEmailAuthContent, submitEmailAuthForm } from "@/lib/auth/email-auth"

type EmailAuthCardProps = {
  callbackURL: string
  mode: EmailAuthMode
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Authentication failed. Check the credentials and try again."
}

export function EmailAuthCard({ callbackURL, mode }: EmailAuthCardProps) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const content = getEmailAuthContent(mode)

  return (
    <EmailAuthShell mode={mode}>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setErrorMessage(null)

          const formData = new FormData(event.currentTarget)
          const email = String(formData.get("email") ?? "")
          const password = String(formData.get("password") ?? "")
          const name = String(formData.get("name") ?? "")

          startTransition(async () => {
            try {
              if (mode === "sign-up") {
                await submitEmailAuthForm("sign-up", {
                  callbackURL,
                  email,
                  name,
                  password,
                })
              } else {
                await submitEmailAuthForm("sign-in", {
                  callbackURL,
                  email,
                  password,
                })
              }

              router.push(callbackURL)
              router.refresh()
            } catch (error) {
              setErrorMessage(getErrorMessage(error))
            }
          })
        }}
      >
        {mode === "sign-up" ? (
          <div className="grid gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" placeholder="Owner User" required />
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="owner@pulsenote.dev" required />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Working..." : content.primaryLabel}
        </Button>
      </form>
    </EmailAuthShell>
  )
}
