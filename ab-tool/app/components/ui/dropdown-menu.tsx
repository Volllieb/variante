'use client'

/**
 * Dropdown / Menü (brandguidelines v3 §6.8).
 *
 * Radix liefert `aria-haspopup`/`aria-expanded`, `role="menu"`, Typeahead,
 * Esc und Klick-außerhalb — das war in `FilterDropdown.tsx` handgebaut und
 * dort nur teilweise vorhanden. Klassen auf unsere Tokens gezogen (die
 * shadcn-Fassung brachte `bg-popover`/`text-popover-foreground`/`shadow-md`
 * mit, nach §12 verboten). Highlight hängt an Radix' `data-highlighted`,
 * nicht an `hover`, damit Tastatur und Maus denselben Zustand zeigen.
 */

import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const itemClasses =
  'relative flex cursor-pointer select-none items-center gap-snug rounded-sm px-2.5 py-1.5 text-body text-text-2 outline-none transition-colors data-[highlighted]:bg-bg-2 data-[highlighted]:text-text data-[disabled]:pointer-events-none data-[disabled]:opacity-40'

function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuGroup(props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[180px] overflow-hidden rounded-md border border-border bg-bg-1 p-1',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn('px-2.5 py-1.5 text-meta uppercase text-text-3', className)}
      {...props}
    />
  )
}

/**
 * `tone="danger"` = destruktives Item. Nach §6.8 gehört es unten und
 * abgetrennt — die Reihenfolge und der `<DropdownMenuSeparator>` bleiben
 * Sache der aufrufenden Stelle, die Farbe macht die Komponente.
 */
function DropdownMenuItem({
  className,
  tone = 'default',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { tone?: 'default' | 'danger' }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        itemClasses,
        tone === 'danger' && 'text-err data-[highlighted]:bg-err-bg data-[highlighted]:text-err',
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(itemClasses, 'pr-8', className)}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(itemClasses, 'pr-8', className)}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <Check className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
}
