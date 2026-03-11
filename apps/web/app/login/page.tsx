import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function SocialButton({ children }: { children: ReactNode }) {
  return (
    <Button className="h-11 rounded-lg font-medium" disabled variant="outline">
      {children}
    </Button>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <section className="hidden min-h-screen border-r border-[var(--border)] bg-white lg:block" />

        <section className="flex min-h-screen items-center justify-center bg-white px-6 py-10 lg:px-10">
          <Card className="w-full max-w-md border-[var(--border)] bg-white">
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                  Welcome back
                </p>
                <h2 className="text-4xl font-semibold leading-none tracking-[-0.06em] text-[var(--foreground)]">
                  Sign in to continue.
                </h2>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  Use your workspace email for now. Social login stays disabled until providers are wired.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SocialButton>Google</SocialButton>
                <SocialButton>GitHub</SocialButton>
              </div>

              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                <Separator className="flex-1" />
                <span>Or</span>
                <Separator className="flex-1" />
              </div>

              <form action="/auth/login" className="space-y-4" method="post">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" placeholder="team@pulsenote.app" required type="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" placeholder="••••••••" required type="password" />
                </div>
                <Button className="h-11 w-full rounded-lg" type="submit">
                  Continue
                </Button>
              </form>

              <p className="text-center text-sm leading-7 text-[var(--muted-foreground)]">
                By continuing, you agree to PulseNote&apos;s product terms and workspace access policy.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
