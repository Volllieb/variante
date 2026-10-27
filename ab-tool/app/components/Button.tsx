'use client'

/**
 * Button (brandguidelines v3 §6.1).
 *
 * Phase 1 räumt drei Punkte auf, die §6.1 als TODO führte:
 *   - Größen hingen an Arbitrary-Pixelwerten → Schrift-Tokens, `lg` = `text-body`
 *   - `size="icon"` fehlte (quadratisch 32px, Toolbar 36px) und war z. B. in
 *     FilterDropdown.tsx handgebaut
 *   - `disabled` wurde bei `href` ignoriert: der Link blieb klickbar
 *
 * Varianten laufen über cva (shadcn-Muster), Klassen-Merge über cn() — vorher
 * hing alles an Template-Literalen, siehe Kommentar in lib/utils.ts.
 */

import type { ReactNode, ButtonHTMLAttributes } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  cn(
    'inline-flex cursor-pointer items-center justify-center rounded-md transition-colors active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0',
    'disabled:pointer-events-none disabled:opacity-40',
  ),
  {
    variants: {
      variant: {
        primary: 'bg-fill-invert font-semibold text-text-on-invert hover:bg-fill-invert-hover',
        secondary: 'border border-border font-medium text-text-2 hover:border-border-strong hover:text-text',
        danger: 'bg-err-bg font-semibold text-err hover:bg-err/15',
        ghost: 'font-medium text-text-3 hover:bg-bg-2 hover:text-text',
        /**
         * Text-Aktion, die Farbe und Gewicht ihrer Umgebung erbt — der
         * „Try again"-Link in einer `text-err`-Hinweiszeile soll rot bleiben
         * und nicht aus der Zeile herausstechen. Fast immer zusammen mit
         * `size="inline"`; wo die Aktion betont gehört, kommt `font-semibold`
         * an der Aufrufstelle dazu.
         */
        link: 'text-[color:inherit] hover:opacity-80',
      },
      size: {
        sm: 'gap-tight px-3 py-1.5 text-meta',
        md: 'gap-tight px-4 py-2 text-small',
        lg: 'gap-snug px-6 py-3 text-body',
        /** Icon-Button, quadratisch 32px — Card- und Zeilen-Aktionen. */
        icon: 'h-8 w-8 shrink-0',
        /** Icon-Button, quadratisch 36px — Toolbar, auf Input-Höhe. */
        'icon-lg': 'h-9 w-9 shrink-0',
        /**
         * Text-Aktion mitten im Satz („Resend confirmation email").
         * Ohne Fläche und ohne eigene Schriftgröße: sie erbt die der Zeile,
         * in der sie steht, sonst springt der Text um sie herum.
         */
        inline: 'h-auto gap-tight p-0 text-[length:inherit] underline',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  href?: string
  children: ReactNode
}

export function Button({
  variant,
  size,
  loading = false,
  href,
  className,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading
  const cls = cn(buttonVariants({ variant, size }), inactive && 'pointer-events-none opacity-40', className)

  if (href) {
    // Ein deaktivierter Link ist kein Link: ohne href bleibt das <a> aus der
    // Tab-Reihenfolge und Screenreader kündigen keine Navigation an.
    if (inactive) {
      return (
        <span className={cls} aria-disabled="true">
          {children}
        </span>
      )
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }

  return (
    <button disabled={inactive} className={cls} {...rest}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export { buttonVariants }
