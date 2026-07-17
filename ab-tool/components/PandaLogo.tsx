import Image from 'next/image'

type PandaLogoSize = 'sm' | 'md' | 'lg'

const sizeMap: Record<PandaLogoSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
}

export function PandaLogo({ size = 'md', className }: { size?: PandaLogoSize; className?: string }) {
  return (
    <Image
      src="/icon.svg"
      alt=""
      width={28}
      height={28}
      className={`${sizeMap[size]} object-contain ${className ?? ''}`}
    />
  )
}
