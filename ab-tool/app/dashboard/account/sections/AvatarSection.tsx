'use client'

import { Loader2, Camera, User } from 'lucide-react'
import Image from 'next/image'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { useRouter } from 'next/navigation'

/** Profilbild: Vorschau, Upload, Fehler. */
export function AvatarSection({
  email,
  router,
  avatarUrl,
  setAvatarUrl,
  avatarUploading,
  avatarError,
  fileInputRef,
  uploadAvatar,
  setAvatarUploading,
  setAvatarError,
}: {
  email: string
  router: ReturnType<typeof useRouter>
  avatarUrl: string | null
  setAvatarUrl: Dispatch<SetStateAction<string | null>>
  avatarUploading: boolean
  avatarError: string
  fileInputRef: RefObject<HTMLInputElement | null>
  uploadAvatar: (file: File) => Promise<void>
  setAvatarUploading: Dispatch<SetStateAction<boolean>>
  setAvatarError: Dispatch<SetStateAction<string>>
}) {
  return (
    <>
      {/* Avatar */}
      <div className="rounded-[var(--radius-lg)] border border-border bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-4 w-4 text-text-3" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-3">Profile Picture</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Avatar preview */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-white/10 transition-colors hover:border-white/[0.18] disabled:opacity-50"
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={email ?? 'Profile picture'}
                width={64}
                height={64}
                className="h-full w-full rounded-full object-cover"
                unoptimized
                key={avatarUrl}
              />
            ) : (
              <User className="h-6 w-6 text-text-3" />
            )}
            {avatarUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-4 w-4 text-white" />
            </div>
          </button>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[12px] text-text-3">
              {avatarUrl
                ? 'Click the image to upload a new picture. PNG, JPEG, WebP or GIF — max 2 MB.'
                : 'Upload a profile picture. PNG, JPEG, WebP or GIF — max 2 MB.'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadAvatar(file)
                // Reset so re-selecting the same file works
                e.target.value = ''
              }}
            />
            {avatarUrl && (
              <button
                onClick={async () => {
                  setAvatarUploading(true)
                  try {
                    await fetch('/api/profile/avatar', { method: 'DELETE' })
                    setAvatarUrl(null)
                    router.refresh()
                  } catch {
                    setAvatarError('Failed to remove.')
                  } finally {
                    setAvatarUploading(false)
                  }
                }}
                disabled={avatarUploading}
                className="text-[11px] text-text-3 underline hover:text-err disabled:opacity-40"
              >
                Remove
              </button>
            )}
            {avatarError && (
              <p className="text-[11px] text-err">{avatarError}</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
