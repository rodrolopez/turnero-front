import { useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { isUncertainResult } from '../booking/attempt'
import { getErrorMessage } from '../../api/client'
import { ErrorMessage } from '../../components/Feedback'
import { Button } from '../../components/ui/Button'

/** Freeze the request and UUID after ambiguous results; never automatically retry writes. */
export function useSafeSubmission<Input, Output>(send: (input: Input, key: string) => Promise<Output>, onSuccess: (output: Output) => void) {
  const last = useRef<{ input: Input; key: string; fingerprint: string } | null>(null)
  const sending = useRef(false)
  const uncertainRef = useRef(false)
  const completed = useRef(false)
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  async function execute(input: Input, retry = false) {
    if (completed.current || sending.current || (uncertainRef.current && !retry)) return
    const fingerprint = JSON.stringify(input)
    const attempt = last.current?.fingerprint === fingerprint ? last.current : { input, fingerprint, key: uuid() }
    last.current = attempt; sending.current = true; setBusy(true); setError('')
    try { const output = await send(attempt.input, attempt.key); uncertainRef.current = false; completed.current = true; setUncertain(false); onSuccess(output) }
    catch (failure) { uncertainRef.current = isUncertainResult(failure); setUncertain(uncertainRef.current); setError(getErrorMessage(failure)) }
    finally { sending.current = false; setBusy(false) }
  }
  return { busy, uncertain, error, locked: busy || uncertain, submit: (input: Input) => execute(input), retry: () => { if (last.current) void execute(last.current.input, true) } }
}
export function SubmissionFeedback({ state }: { state: { uncertain: boolean; busy: boolean; error: string; retry: () => void } }) {
  return state.uncertain ? <div role="alert" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p>No pudimos verificar el resultado. Para evitar duplicados, mantené esta ventana abierta y verificá la misma operación antes de iniciar otra.</p><p>{state.error}</p><Button busy={state.busy} onClick={state.retry}>Verificar operación</Button></div> : <ErrorMessage message={state.error} />
}
