/**
 * Sammelstelle der UI-Primitives (brandguidelines v3 §6).
 *
 * Damit wird aus fünf Import-Zeilen eine:
 *   import { Button, Card, Field, Input } from '@/app/components'
 *
 * Phase 2 ersetzt die rohen `<button>`/`<input>` im Dashboard gegen diese
 * Komponenten — ein kurzer Import-Pfad senkt die Hürde dafür. Radix-basierte
 * Bausteine liegen weiter unter `./ui/*` und werden hier nicht re-exportiert:
 * sie kommen aus `shadcn add` und sollen beim nächsten Lauf überschreibbar
 * bleiben, ohne diese Datei anzufassen.
 */

export { Badge } from './Badge'
export { Breadcrumbs } from './Breadcrumbs'
export { Button, buttonVariants } from './Button'
export { Card } from './Card'
export { Checkbox } from './Checkbox'
export { Drawer } from './Drawer'
export { EmptyState } from './EmptyState'
export { Field, useFieldControl } from './Field'
export { Input } from './Input'
export { Modal, ConfirmDialog } from './Modal'
export { PageHeader } from './PageHeader'
export { Select } from './Select'
export { SegmentedControl, type SegmentedOption } from './SegmentedControl'
export { StatusDot, type Status } from './StatusDot'
export {
  Table,
  TableWrap,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from './Table'
export { Textarea } from './Textarea'
export { Toggle } from './Toggle'
export { ToastProvider, useToast, type Toast, type ToastType } from './Toast'
export { Tooltip } from './Tooltip'
