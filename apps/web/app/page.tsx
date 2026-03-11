import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white px-6 py-10 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-5xl items-center justify-center">
        <Card className="w-full border-[var(--border)] bg-white">
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                Authenticated surface
              </p>
              <h1 className="text-5xl font-semibold leading-[0.92] tracking-[-0.07em] text-[var(--foreground)]">
                PulseNote Web App
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
                You are inside the protected web surface. Release records, review queues, approvals, and export
                controls can live here once backend integrations are connected.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5">
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  Release record
                </span>
                <strong className="mt-3 block text-lg text-[var(--foreground)]">v2.4.0 launch thread</strong>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                  Source evidence, claim checks, and decision history stay attached in one browser workflow.
                </p>
              </article>
              <article className="rounded-xl border border-[var(--border)] bg-[var(--muted)] p-5">
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Status</span>
                <strong className="mt-3 block text-lg text-[var(--foreground)]">Awaiting reviewer sign-off</strong>
                <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                  Final approval remains visible before any publish pack leaves the system.
                </p>
              </article>
            </div>

            <form action="/auth/logout" method="post">
              <Button className="h-11 rounded-lg" type="submit">
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
