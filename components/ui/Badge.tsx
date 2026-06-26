import { type ReactNode } from 'react'

type BadgeVariant = 'default' | 'gold' | 'success' | 'danger' | 'muted' | 'blue'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default:  'bg-champ-elevated border border-champ-border text-white',
  gold:     'bg-champ-gold/20 border border-champ-gold text-champ-gold',
  success:  'bg-champ-success/20 border border-champ-success text-champ-success',
  danger:   'bg-champ-danger/20 border border-champ-danger text-champ-danger',
  muted:    'bg-champ-elevated border border-champ-border text-champ-muted',
  blue:     'bg-champ-blue/20 border border-champ-blue text-champ-blue-glow',
}

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export default function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md font-body ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </span>
  )
}
