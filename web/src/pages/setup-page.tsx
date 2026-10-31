export function SetupPage() {
  return (
    <div className="lumen-glow grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-heading text-5xl">Lumen</h1>
        <p className="mt-4 text-muted-foreground">
          Lumen isn't connected to its database yet. Copy{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">
            web/.env.example
          </code>{" "}
          to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm text-foreground">
            web/.env
          </code>
          , fill in your Supabase URL and key, then restart the dev server.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          On Netlify, add the same two values under Site configuration → Environment variables, then redeploy.
        </p>
      </div>
    </div>
  )
}
