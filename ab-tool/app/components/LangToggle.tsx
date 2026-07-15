'use client'

import { useRouter } from 'next/navigation'

export default function LangToggle({ current }: { current: 'de' | 'en' }) {
  const router = useRouter()

  const toggle = () => {
    const nextLang = current === 'de' ? 'en' : 'de'
    document.cookie = `lang=${nextLang};path=/;max-age=31536000;samesite=lax`
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-border bg-bg-2 px-2.5 py-1 text-xs font-medium text-text-2 transition-all duration-200 hover:border-border-strong hover:bg-bg-1 hover:text-text"
      title={current === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
    >
      {current === 'de' ? 'DE' : 'EN'}
    </button>
  )
}
