import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

type Common = {
  children: ReactNode
  variant?: Variant
  block?: boolean
  className?: string
}

type ButtonProps = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & {
    to?: undefined
  }

type LinkButtonProps = Common & {
  to: string
}

function buttonClasses(
  variant: Variant,
  block: boolean,
  className: string,
): string {
  return [
    'big-button',
    `big-button--${variant}`,
    block ? 'big-button--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}

export function BigButton({
  children,
  variant = 'primary',
  block = false,
  className = '',
  ...props
}: ButtonProps | LinkButtonProps) {
  const classes = buttonClasses(variant, block, className)

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={classes}>
        {children}
      </Link>
    )
  }

  const buttonProps = props as Omit<ButtonProps, keyof Common>
  return (
    <button type={buttonProps.type ?? 'button'} className={classes} {...buttonProps}>
      {children}
    </button>
  )
}
