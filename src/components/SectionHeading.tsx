import { Reveal } from './Reveal'
import { eyebrow as eyebrowClass } from '../lib/ui'

type SectionHeadingProps = {
  eyebrow: string
  title: string
  text?: string
  center?: boolean
  className?: string
}

export function SectionHeading({ eyebrow, title, text, center = false, className = '' }: SectionHeadingProps) {
  return (
    <Reveal className={`${center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      <span className={eyebrowClass}>{eyebrow}</span>
      <h2 className="mt-4 text-3xl leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-4xl lg:text-[44px]">
        {title}
      </h2>
      {text && <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">{text}</p>}
    </Reveal>
  )
}
