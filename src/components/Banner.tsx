import type { ReactNode } from 'react'

type Tone = 'info' | 'warn' | 'error' | 'success'

type Props = {
  children: ReactNode
  tone?: Tone
  role?: 'status' | 'alert'
}

export function Banner({ children, tone = 'info', role = 'status' }: Props) {
  return (
    <div className={`banner banner--${tone}`} role={role}>
      {children}
    </div>
  )
}
