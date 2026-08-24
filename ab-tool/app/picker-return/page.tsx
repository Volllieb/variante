import type { Metadata } from 'next'
import { PickerReturnClient } from './PickerReturnClient'

// Interne Übergabeseite des Element-Pickers — gehört nicht in den Index.
export const metadata: Metadata = {
  title: 'Element selected — Variante',
  robots: { index: false, follow: false },
}

export default function PickerReturnPage() {
  return <PickerReturnClient />
}
