import { useContext, useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp"

import { useAuth } from "@/auth/use-auth"
import { Spinner } from "@/components/page"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PIN_LENGTH = 7

function PinSlot({ index }: { index: number }) {
  const context = useContext(OTPInputContext)
  const slot = context.slots[index]
  return (
    <div
      className={cn(
        "relative grid size-10 place-items-center rounded-lg border border-input bg-input/30 text-lg transition-all sm:size-11",
        slot.isActive && "border-ring ring-3 ring-ring/30"
      )}
    >
      {slot.char ? (
        <span className="size-2 rounded-full bg-foreground" />
      ) : (
        slot.hasFakeCaret && (
          <span className="h-5 w-px animate-caret-blink bg-foreground" />
        )
      )}
    </div>
  )
}

export function LoginPage() {
  const auth = useAuth()
  const location = useLocation()
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (auth.status === "signed-in") {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? "/"} replace />
  }

  async function submit(value: string) {
    if (value.length !== PIN_LENGTH || busy) return
    setBusy(true)
    setError(null)
    try {
      await auth.signInWithPin(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.")
      setPin("")
      setBusy(false)
    }
  }

  return (
    <div className="lumen-glow grid min-h-dvh place-items-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <img src="/lumen.svg" alt="" className="mb-6 size-10" />
        <h1 className="font-heading text-6xl leading-none tracking-tight">
          Lumen
        </h1>
        <p className="mt-3 text-muted-foreground">The FYP research desk.</p>

        <form
          className="mt-10 flex w-full flex-col items-center gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void submit(pin)
          }}
        >
          <label htmlFor="pin" className="text-sm text-muted-foreground">
            Enter your PIN
          </label>
          <OTPInput
            id="pin"
            maxLength={PIN_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            disabled={busy}
            value={pin}
            onChange={(value) => {
              setPin(value)
              if (error) setError(null)
            }}
            onComplete={(value: string) => void submit(value)}
            containerClassName="flex items-center gap-1.5 sm:gap-2 has-disabled:opacity-60"
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => (
              <PinSlot key={index} index={index} />
            ))}
          </OTPInput>
          <p
            role="alert"
            aria-live="polite"
            className="min-h-5 text-sm text-destructive"
          >
            {error}
          </p>
          <Button
            type="submit"
            size="lg"
            className="w-full max-w-xs"
            disabled={busy || pin.length !== PIN_LENGTH}
          >
            {busy ? <Spinner className="text-primary-foreground" /> : "Enter"}
          </Button>
        </form>
      </div>
    </div>
  )
}
