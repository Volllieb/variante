declare module '@tabler/icons-react' {
  import type { FC, SVGProps } from 'react'

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    stroke?: number
    color?: string
  }

  export type Icon = FC<IconProps>

  export const IconPointerFilled: Icon
  export const IconSparklesFilled: Icon
  export const IconRocket: Icon
  export const IconCheckFilled: Icon
  export const IconBoltFilled: Icon
}
