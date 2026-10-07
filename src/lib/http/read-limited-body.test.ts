import { describe, expect, it } from 'vitest'
import { readLimitedRequestBody } from './read-limited-body'

describe('readLimitedRequestBody', () => {
  it('reads exact bytes across stream chunks and rejects oversized content-length early', async () => {
    const source = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('pay')); controller.enqueue(new TextEncoder().encode('load')); controller.close() },
    })
    expect(await readLimitedRequestBody(new Request('https://iqcard.in', { method: 'POST', body: source, duplex: 'half' } as RequestInit), 7)).toBe('payload')
    expect(await readLimitedRequestBody(new Request('https://iqcard.in', { method: 'POST', headers: { 'content-length': '99' }, body: 'x' }), 8)).toBeNull()
  })

  it('cancels a streamed body when it crosses the configured byte limit', async () => {
    let cancelled = false
    const source = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(4)) },
      cancel() { cancelled = true },
    })
    expect(await readLimitedRequestBody(new Request('https://iqcard.in', { method: 'POST', body: source, duplex: 'half' } as RequestInit), 3)).toBeNull()
    expect(cancelled).toBe(true)
  })
})
