import { v4 as uuid } from 'uuid'
import { AxiosError } from 'axios'
import { ZodError } from 'zod'
import type { BookingRequest } from './schemas'

export const slotConflictMessage = '¡Ups! Alguien acaba de reservar este horario. Por favor, elegí otro.'
export function isSlotConflict(error: unknown): boolean {
  return error instanceof AxiosError && error.response?.status === 409
}
export function isUncertainResult(error: unknown): boolean {
  return error instanceof ZodError || !(error instanceof AxiosError) || !error.response || error.response.status >= 500 || error.response.status === 408
}
// A key belongs to a logical booking, including retries after a lost response.
export function createBookingAttempt() {
  let key = uuid()
  let fingerprint: string | undefined
  return {
    forPayload(payload: BookingRequest) {
      const nextFingerprint = JSON.stringify(payload)
      if (fingerprint !== undefined && fingerprint !== nextFingerprint) key = uuid()
      fingerprint = nextFingerprint
      return { idempotencyKey: key, payload }
    },
  }
}
