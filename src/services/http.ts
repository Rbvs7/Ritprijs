export type ServiceErrorKind = 'offline' | 'timeout' | 'http' | 'invalid' | 'not_found' | 'rate_limited' | 'config';

export class ServiceError extends Error {
  constructor(public kind: ServiceErrorKind, message: string, public status?: number) {
    super(message);
  }
}

/** Gebruikersvriendelijke foutmelding voor iedere fout. */
export function errorMessage(e: unknown): string {
  if (e instanceof ServiceError) return e.message;
  if (e instanceof Error && e.name === 'AbortError') return 'Verzoek geannuleerd.';
  return 'Er ging iets mis. Probeer het opnieuw.';
}

export async function fetchJson<T>(
  url: string,
  opts: { signal?: AbortSignal; headers?: Record<string, string>; timeoutMs?: number; method?: string; body?: string } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: { Accept: 'application/json', ...opts.headers },
      body: opts.body,
      signal: controller.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    if (controller.signal.aborted) throw new ServiceError('timeout', 'De server reageert niet. Controleer je verbinding en probeer het opnieuw.');
    throw new ServiceError('offline', 'Geen internetverbinding. Controleer je verbinding en probeer het opnieuw.');
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener('abort', onAbort);
  }
  if (res.status === 429) throw new ServiceError('rate_limited', 'Te veel verzoeken. Wacht even en probeer het opnieuw.', 429);
  if (!res.ok) throw new ServiceError('http', `De server gaf een fout (${res.status}). Probeer het later opnieuw.`, res.status);
  try {
    return (await res.json()) as T;
  } catch {
    throw new ServiceError('http', 'Onverwacht antwoord van de server.');
  }
}
