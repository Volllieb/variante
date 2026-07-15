import Image from 'next/image'

export function PandaLogo({ className }: { className: string }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={28}
      height={28}
      className={`bg-white object-contain ${className}`}
    />
  )
}
