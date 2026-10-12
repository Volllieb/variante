/** Verbundene Seite (Tabelle `domains`). */
export type Domain = { id: string; url: string; verified: boolean; verified_at?: string | null }

/** Zustand des Add-Page-Flows in ConnectedPagesSection. */
export type AddState = 'input' | 'saving' | 'not-found' | 'limit' | 'replacing' | 'verified'
